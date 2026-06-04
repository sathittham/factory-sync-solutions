// @title        FactorySync Solutions API
// @version      0.1.0
// @description  REST API for the FactorySync Solutions assessment platform
// @host         localhost:8080
// @BasePath     /api/v1
// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
// @description                 Firebase ID token (Bearer {token})
package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"

	firebase "firebase.google.com/go/v4"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"

	appMiddleware "github.com/sathittham/factory-sync-solutions/apps/fs-backend/middleware"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/pkg"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/admin"
	auditpkg "github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/audit"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/dbd"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/notification"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/profile"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/quiz"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/result"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/scoring"
)

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

	// Initialize Firebase Admin SDK
	app, err := firebase.NewApp(ctx, nil)
	if err != nil {
		log.Fatalf("firebase init: %v", err)
	}

	authClient, err := app.Auth(ctx)
	if err != nil {
		log.Fatalf("firebase auth init: %v", err)
	}

	// Initialize Firestore client
	firestoreClient := pkg.NewFirestoreClient(ctx)
	defer firestoreClient.Close()

	// Initialize audit logger
	auditLogger := auditpkg.NewLogger(firestoreClient)

	// Initialize Turnstile client
	turnstileClient := pkg.NewTurnstileClient(os.Getenv("CF_TURNSTILE_SECRET"))

	// Load quiz configurations
	quizRegistry := scoring.NewQuizRegistry()

	shindanConfig, err := scoring.LoadQuestions("config/questions.json")
	if err != nil {
		log.Fatalf("load shindan questions: %v", err)
	}
	quizRegistry.Register(shindanConfig)
	slog.Info("quiz config loaded", "id", shindanConfig.ID, "questions", len(shindanConfig.Questions), "dimensions", len(shindanConfig.Dimensions))

	factoryConfig, err := scoring.LoadQuestions("config/questions-factory.json")
	if err != nil {
		log.Fatalf("load factory questions: %v", err)
	}
	quizRegistry.Register(factoryConfig)
	slog.Info("quiz config loaded", "id", factoryConfig.ID, "questions", len(factoryConfig.Questions), "dimensions", len(factoryConfig.Dimensions))

	leanConfig, err := scoring.LoadQuestions("config/questions-lean.json")
	if err != nil {
		log.Fatalf("load lean questions: %v", err)
	}
	quizRegistry.Register(leanConfig)
	slog.Info("quiz config loaded", "id", leanConfig.ID, "questions", len(leanConfig.Questions), "dimensions", len(leanConfig.Dimensions))

	cyberConfig, err := scoring.LoadQuestions("config/questions-cybersecurity.json")
	if err != nil {
		log.Fatalf("load cybersecurity questions: %v", err)
	}
	quizRegistry.Register(cyberConfig)
	slog.Info("quiz config loaded", "id", cyberConfig.ID, "questions", len(cyberConfig.Questions), "dimensions", len(cyberConfig.Dimensions))

	// --- Wire up repositories, services, and handlers ---

	// Notification
	var emailClient *notification.EmailClient
	if apiKey := os.Getenv("RESEND_API_KEY"); apiKey != "" {
		emailClient = notification.NewEmailClient(apiKey, "FactorySync Solutions <noreply@factorysyncsolutions.com>")
	}
	slackClient := notification.NewSlackClient()
	notifSvc := notification.NewService(emailClient, slackClient, firestoreClient)

	// Profile
	profileRepo := profile.NewRepository(firestoreClient)
	profileSvc := profile.NewService(profileRepo, turnstileClient)
	profileSvc.SetAuditLogger(auditLogger)
	profileHandler := profile.NewHandler(profileSvc, notifSvc)
	profileAdapter := profile.NewProfileDataAdapter(profileSvc)

	// Result
	resultRepo := result.NewRepository(firestoreClient)
	resultSvc := result.NewService(resultRepo)
	resultHandler := result.NewHandler(resultSvc)

	// Quiz
	quizSvc := quiz.NewService(quizRegistry, resultSvc, notifSvc)
	quizSvc.SetAuditLogger(auditLogger)
	quizHandler := quiz.NewHandler(quizSvc, profileAdapter)

	// Admin
	adminHandler := admin.NewHandler(resultSvc, profileSvc, authClient)

	// DBD
	dbdSvc := dbd.NewDefaultService()
	dbdHandler := dbd.NewHandler(dbdSvc)

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
				// r.Get("/swagger/*", swaggerHandler) // uncomment when swaggo is set up
			}
		})

		// Authenticated routes
		r.Group(func(r chi.Router) {
			r.Use(appMiddleware.FirebaseAuth(authClient))

			r.Route("/profile", profileHandler.Routes)
			r.Route("/quiz", quizHandler.Routes)
			r.Route("/results", resultHandler.Routes)
			r.Route("/dbd", dbdHandler.Routes)

			// Admin routes (additional role check)
			r.Route("/admin", func(r chi.Router) {
				r.Use(appMiddleware.RequireAdmin(authClient))
				adminHandler.Routes(r)
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
