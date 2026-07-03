// @title        FactorySync Solutions API
// @version      v1
// @description  REST API for the FactorySync Solutions assessment platform
// @host         localhost:8080
// @BasePath     /api/v1
// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
// @description                 Firebase ID token (Bearer {token})
package main

import (
	"bytes"
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"

	firebase "firebase.google.com/go/v4"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	httpSwagger "github.com/swaggo/http-swagger"

	_ "github.com/sathittham/factory-sync-solutions/apps/backend/docs/v1"
	appMiddleware "github.com/sathittham/factory-sync-solutions/apps/backend/middleware"
	"github.com/sathittham/factory-sync-solutions/apps/backend/pkg"
	"github.com/sathittham/factory-sync-solutions/apps/backend/pkg/events"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/admin"
	auditpkg "github.com/sathittham/factory-sync-solutions/apps/backend/services/audit"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/backoffice"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/chat"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/dbd"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/notification"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/profile"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/quiz"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/result"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/scoring"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/upload"
)

const msgQuizConfigLoaded = "quiz config loaded"

// checkServiceAccount validates that the configured service account belongs to the expected
// GCP project. A project mismatch causes silent 401 "invalid token" errors at runtime.
func checkServiceAccount() {
	saPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	if saPath == "" {
		return
	}
	data, err := os.ReadFile(saPath)
	if err != nil {
		return
	}
	want := os.Getenv("GCP_PROJECT_ID")
	if want == "" || bytes.Contains(data, []byte(`"project_id": "`+want+`"`)) {
		return
	}
	log.Fatalf("STARTUP ERROR: service account at %s does not belong to project %q — "+
		"Firebase token verification will reject all user tokens. "+
		"Download the correct service account from the Firebase Console for project %q.", saPath, want, want)
}

func loadQuizConfigs(registry *scoring.QuizRegistry) {
	type quizFile struct {
		path string
		name string
	}
	files := []quizFile{
		{"config/questions.json", "shindan"},
		{"config/questions-factory.json", "factory"},
		{"config/questions-lean.json", "lean"},
		{"config/questions-cybersecurity.json", "cybersecurity"},
		{"config/questions-iso29110.json", "iso29110"},
	}
	for _, f := range files {
		cfg, err := scoring.LoadQuestions(f.path)
		if err != nil {
			log.Fatalf("load %s questions: %v", f.name, err)
		}
		registry.Register(cfg)
		slog.Info(msgQuizConfigLoaded, "id", cfg.ID, "questions", len(cfg.Questions), "dimensions", len(cfg.Dimensions))
	}
}

func main() {
	// Load environment-specific .env file
	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}
	if err := godotenv.Load(".env." + env); err != nil {
		log.Printf("no .env.%s file found, using existing env vars", env)
	}

	ctx := context.Background()

	// Initialize structured JSON logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	checkServiceAccount()

	// Initialize Firebase Admin SDK
	app, err := firebase.NewApp(ctx, nil)
	if err != nil {
		log.Fatalf("firebase init: %v", err)
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		log.Fatalf("firebase auth init: %v", err)
	}

	// Initialize Firestore client (reuses the same Firebase app — avoids duplicate NewApp)
	firestoreClient := pkg.NewFirestoreClient(ctx, app)
	defer firestoreClient.Close()

	// Initialize audit logger
	auditLogger := auditpkg.NewLogger(firestoreClient)

	// Initialize Turnstile client
	turnstileClient := pkg.NewTurnstileClient(os.Getenv("CF_TURNSTILE_SECRET"))

	// Load quiz configurations
	quizRegistry := scoring.NewQuizRegistry()
	loadQuizConfigs(quizRegistry)

	// --- Wire up repositories, services, and handlers ---
	eventPublisher := events.NewPublisherFromEnv(ctx)
	defer func() {
		if publisher, ok := eventPublisher.(interface{ Close() error }); ok {
			if err := publisher.Close(); err != nil {
				slog.Warn("failed to close event publisher", "error", err)
			}
		}
	}()

	// Notification
	var emailClient *notification.EmailClient
	if apiKey := os.Getenv("RESEND_API_KEY"); apiKey != "" {
		emailClient = notification.NewEmailClient(apiKey, "FactorySync Solutions <no-reply@factorysyncsolutions.com>")
	}
	slackClient := notification.NewSlackClient()
	notifSvc := notification.NewService(emailClient, slackClient, firestoreClient)

	// Profile
	profileRepo := profile.NewRepository(firestoreClient)
	profileSvc := profile.NewService(profileRepo, turnstileClient)
	profileSvc.SetAuditLogger(auditLogger)
	profileSvc.SetEventPublisher(eventPublisher)
	profileHandler := profile.NewHandler(profileSvc, notifSvc)
	profileAdapter := profile.NewProfileDataAdapter(profileSvc)

	// Result
	resultRepo := result.NewRepository(firestoreClient)
	resultSvc := result.NewService(resultRepo)
	resultHandler := result.NewHandler(resultSvc)

	// Quiz
	quizSvc := quiz.NewService(quizRegistry, resultSvc, notifSvc)
	quizSvc.SetAuditLogger(auditLogger)
	quizSvc.SetEventPublisher(eventPublisher)
	quizHandler := quiz.NewHandler(quizSvc, profileAdapter)

	// Admin
	adminHandler := admin.NewHandler(resultSvc, profileSvc, authClient, auditLogger, notifSvc, firestoreClient)

	// Backoffice
	backofficeHandler := backoffice.NewHandler(resultSvc, profileSvc, authClient, firestoreClient, auditLogger, notifSvc)

	// Chat (AI customer support chatbot — Phase 1: core service + engine + web-app bubble)
	chatRepo := chat.NewRepository(firestoreClient)
	chatModelClient, err := chat.NewVertexModelClientFromEnv(ctx)
	if err != nil {
		slog.Warn("chatbot AI engine disabled", "error", err)
	}
	chatSystemPrompt, err := chat.LoadSystemPrompt("config/chatbot-knowledge.md")
	if err != nil {
		log.Fatalf("load chatbot knowledge file: %v", err)
	}
	chatEngine := chat.NewEngine(chatModelClient, chatSystemPrompt)
	chatSlack := chat.NewSlackClientFromEnv()
	chatSvc := chat.NewService(chatRepo, chatEngine, chatSlack)
	chatHandler := chat.NewHandler(chatSvc, turnstileClient)

	// DBD
	dbdSvc := dbd.NewDefaultService()
	dbdHandler := dbd.NewHandler(dbdSvc)

	// Upload
	uploadSvc := upload.NewServiceFromEnv(firestoreClient)
	if reason := uploadSvc.DisabledReason(); reason != "" {
		slog.Warn("upload service disabled", "reason", reason)
	}
	uploadHandler := upload.NewHandler(uploadSvc)

	// --- Configure router ---

	r := chi.NewRouter()

	// Global middleware
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(appMiddleware.SecurityHeaders)
	r.Use(appMiddleware.CORS)
	r.Use(appMiddleware.RateLimitByIP)

	// Health check (public)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public routes
		r.Group(func(r chi.Router) {
			// Swagger UI (non-production only)
			if os.Getenv("ENVIRONMENT") != "production" {
				r.Get("/swagger/*", httpSwagger.Handler(
					httpSwagger.URL("/api/v1/swagger/doc.json"),
				))
			}
		})

		// Authenticated routes
		r.Group(func(r chi.Router) {
			r.Use(appMiddleware.FirebaseAuth(authClient))

			r.Route("/profile", profileHandler.Routes)
			r.Route("/quiz", quizHandler.Routes)
			r.Route("/results", resultHandler.Routes)
			r.Route("/dbd", dbdHandler.Routes)
			r.Route("/upload", uploadHandler.Routes)
			r.Route("/chat", chatHandler.Routes)

			// Invitation acceptance — authenticated but no role check (invited user has no profile yet)
			r.Post("/invitations/accept", adminHandler.AcceptInvitation)

			// Admin routes (additional role check)
			r.Route("/admin", func(r chi.Router) {
				r.Use(appMiddleware.RequireAdmin(authClient))
				adminHandler.Routes(r)
			})

			// Manage routes — owner / system_admin / admin (Firestore role check)
			r.Route("/manage", func(r chi.Router) {
				r.Use(appMiddleware.RequireFirestoreRole(firestoreClient, "owner", "system_admin", "admin"))
				r.Get("/users", adminHandler.ListUsers)
				r.Put("/users/{uid}/role", adminHandler.SetUserRole)
				r.Post("/invitations", adminHandler.InviteMember)
				r.Delete("/invitations/{uid}", adminHandler.CancelInvitation)
				r.Post("/invitations/{uid}/resend", adminHandler.ResendInvitation)
			})

			// Backoffice routes (backoffice staff only)
			r.Route("/backoffice", func(r chi.Router) {
				r.Use(appMiddleware.RequireBackofficeRole(authClient, "superadmin", "staff"))
				backofficeHandler.Routes(r)
			})
		})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	slog.Info("server starting", "port", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
