package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/joho/godotenv"
	firebase "firebase.google.com/go/v4"

	appMiddleware "github.com/sathittham/factory-health-check/apps/api/middleware"
	"github.com/sathittham/factory-health-check/apps/api/pkg"
	"github.com/sathittham/factory-health-check/apps/api/services/admin"
	"github.com/sathittham/factory-health-check/apps/api/services/dbd"
	"github.com/sathittham/factory-health-check/apps/api/services/notification"
	"github.com/sathittham/factory-health-check/apps/api/services/profile"
	"github.com/sathittham/factory-health-check/apps/api/services/quiz"
	"github.com/sathittham/factory-health-check/apps/api/services/result"
	"github.com/sathittham/factory-health-check/apps/api/services/scoring"
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

	// Initialize Turnstile client
	turnstileClient := pkg.NewTurnstileClient(os.Getenv("CF_TURNSTILE_SECRET"))

	// Load quiz questions from static config
	quizConfig, err := scoring.LoadQuestions("config/questions.json")
	if err != nil {
		log.Fatalf("load questions: %v", err)
	}
	slog.Info("quiz config loaded", "questions", len(quizConfig.Questions), "dimensions", len(quizConfig.Dimensions))

	// --- Wire up repositories, services, and handlers ---

	// Profile
	profileRepo := profile.NewRepository(firestoreClient)
	profileSvc := profile.NewService(profileRepo, turnstileClient)
	profileHandler := profile.NewHandler(profileSvc)
	profileAdapter := profile.NewProfileDataAdapter(profileSvc)

	// Result
	resultRepo := result.NewRepository(firestoreClient)
	resultSvc := result.NewService(resultRepo)
	resultHandler := result.NewHandler(resultSvc)

	// Notification
	var emailClient *notification.EmailClient
	if apiKey := os.Getenv("RESEND_API_KEY"); apiKey != "" {
		emailClient = notification.NewEmailClient(apiKey, "Factory Health Check <noreply@factory-health-check.com>")
	}
	slackClient := notification.NewSlackClient()
	notifSvc := notification.NewService(emailClient, slackClient, firestoreClient)

	// Quiz
	quizSvc := quiz.NewService(quizConfig, resultSvc, notifSvc)
	quizHandler := quiz.NewHandler(quizSvc, profileAdapter)

	// Admin
	adminHandler := admin.NewHandler(resultSvc, profileSvc)

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
