package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	firebase "firebase.google.com/go/v4"
	"github.com/joho/godotenv"

	"github.com/sathittham/factory-sync-solutions/apps/backend/pkg/events"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/notification"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/profile"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/result"
)

func main() {
	ctx := context.Background()

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}
	if err := godotenv.Load(".env." + env); err != nil {
		slog.Info("no .env file found; using existing env vars", "environment", env)
	}

	logger := slog.Default()

	projectID := envProjectID()
	if projectID == "" {
		logger.Error("missing project id; set GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT")
		os.Exit(1)
	}

	app, err := firebase.NewApp(ctx, nil)
	if err != nil {
		logger.Error("firebase init failed", "error", err)
		os.Exit(1)
	}

	firestoreClient, err := app.Firestore(ctx)
	if err != nil {
		logger.Error("firestore init failed", "error", err)
		os.Exit(1)
	}
	defer firestoreClient.Close()

	profileRepo := profile.NewRepository(firestoreClient)
	resultRepo := result.NewRepository(firestoreClient)
	resultSvc := result.NewService(resultRepo)

	var emailClient notification.EmailSender
	token := strings.TrimSpace(os.Getenv("CLOUDFLARE_API_TOKEN"))
	accountID := strings.TrimSpace(os.Getenv("CLOUDFLARE_ACCOUNT_ID"))
	if token != "" && accountID != "" {
		emailClient = notification.NewEmailClient(accountID, token, "FactorySync Solutions <no-reply@factorysyncsolutions.com>")
	}
	slackClient := notification.NewSlackClient()
	notificationSvc := notification.NewService(emailClient, slackClient, firestoreClient)

	handler := func(ctx context.Context, event events.Event) error {
		if event.Type != events.DomainEventResultReady {
			return nil
		}

		assessmentID, ok := eventPayloadString(event.Payload, "assessmentId")
		if !ok {
			return fmt.Errorf("result ready payload missing assessmentId")
		}

		assessment, err := resultSvc.GetResultByID(ctx, assessmentID)
		if err != nil {
			return fmt.Errorf("load result: %w", err)
		}
		if assessment == nil {
			return fmt.Errorf("assessment not found: %s", assessmentID)
		}

		userProfile, err := profileRepo.GetByUID(ctx, assessment.UID)
		if err != nil {
			return fmt.Errorf("load profile: %w", err)
		}
		if userProfile == nil {
			return fmt.Errorf("profile not found: %s", assessment.UID)
		}

		contactName := strings.TrimSpace(userProfile.ContactName)
		if contactName == "" {
			contactName = userProfile.DisplayName
		}

		notificationSvc.NotifyQuizResult(
			ctx,
			assessment,
			userProfile.ContactEmail,
			contactName,
			userProfile.CompanyName,
			userProfile.EmailNotifications,
			assessment.Scores,
		)
		return nil
	}

	consumerConfig := events.ConsumerConfig{
		ProjectID:              projectID,
		SubscriptionID:         strings.TrimSpace(os.Getenv("DOMAIN_EVENT_SUBSCRIPTION")),
		FirestoreClient:        firestoreClient,
		InboxCollection:        getEnvString("DOMAIN_EVENT_INBOX_COLLECTION", "domain_event_inbox"),
		InboxLeaseDuration:     getEnvDuration("DOMAIN_EVENT_INBOX_LEASE", 5*time.Minute),
		MaxAttempts:            getEnvInt("DOMAIN_EVENT_MAX_ATTEMPTS", 5),
		DLQProjectID:           getEnvString("DOMAIN_EVENT_DLQ_PROJECT_ID", ""),
		DLQTopicID:             strings.TrimSpace(os.Getenv("DOMAIN_EVENT_PUBSUB_DLQ_TOPIC")),
		NumGoroutines:          getEnvInt("DOMAIN_EVENT_SUBSCRIPTION_GOROUTINES", 0),
		MaxOutstandingMessages: getEnvInt("DOMAIN_EVENT_SUBSCRIPTION_MAX_OUTSTANDING_MESSAGES", 0),
		MaxOutstandingBytes:    getEnvInt("DOMAIN_EVENT_SUBSCRIPTION_MAX_OUTSTANDING_BYTES", 0),
		Logger:                 logger,
		Handler:                handler,
	}

	if consumerConfig.SubscriptionID == "" {
		logger.Error("missing DOMAIN_EVENT_SUBSCRIPTION")
		os.Exit(1)
	}

	errorCh := make(chan error, 2)

	go func() {
		if err := events.StartPubSubConsumer(ctx, consumerConfig); err != nil {
			errorCh <- fmt.Errorf("domain event consumer stopped: %w", err)
			return
		}
		errorCh <- fmt.Errorf("domain event consumer exited unexpectedly")
	}()

	healthAddr := ":" + getEnvString("PORT", "8080")
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("domain-event-consumer"))
	})
	go func() {
		logger.Info("health endpoint ready", "address", healthAddr)
		if err := http.ListenAndServe(healthAddr, mux); err != nil {
			errorCh <- fmt.Errorf("health server failed: %w", err)
		}
	}()

	logger.Info("domain event consumer started", "subscription", consumerConfig.SubscriptionID)
	if err := <-errorCh; err != nil {
		logger.Error("domain event worker stopped", "error", err)
		os.Exit(1)
	}
}

func envProjectID() string {
	if projectID := strings.TrimSpace(os.Getenv("GCP_PROJECT_ID")); projectID != "" {
		return projectID
	}
	return strings.TrimSpace(os.Getenv("GOOGLE_CLOUD_PROJECT"))
}

func eventPayloadString(payload map[string]any, key string) (string, bool) {
	raw, exists := payload[key]
	if !exists {
		return "", false
	}
	value, ok := raw.(string)
	if !ok {
		return "", false
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return "", false
	}
	return value, true
}

func getEnvInt(key string, def int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return def
	}
	v, err := strconv.Atoi(value)
	if err != nil {
		return def
	}
	return v
}

func getEnvDuration(key string, def time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return def
	}
	v, err := time.ParseDuration(value)
	if err != nil {
		return def
	}
	return v
}

func getEnvString(key, def string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return def
	}
	return value
}
