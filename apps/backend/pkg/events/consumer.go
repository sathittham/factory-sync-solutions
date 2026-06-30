package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/pubsub"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const (
	consumerDefaultInboxCollection = "domain_event_inbox"
	consumerDefaultMaxAttempts     = 5
	consumerDefaultLeaseDuration   = 5 * time.Minute
)

const (
	consumerInboxStatusProcessing = "processing"
	consumerInboxStatusDone       = "done"
	consumerInboxStatusFailed     = "failed"
	consumerInboxStatusDead       = "dead"
)

type ConsumerConfig struct {
	ProjectID              string
	SubscriptionID         string
	Handler                func(context.Context, Event) error
	FirestoreClient        *firestore.Client
	InboxCollection        string
	InboxLeaseDuration     time.Duration
	MaxAttempts            int
	DLQProjectID           string
	DLQTopicID             string
	NumGoroutines          int
	MaxOutstandingMessages int
	MaxOutstandingBytes    int
	Logger                 *slog.Logger
}

type DeadLetterEnvelope struct {
	Event            Event  `json:"event"`
	Error            string `json:"error"`
	FailureAt        string `json:"failureAt"`
	DeliveryAttempt  int64  `json:"deliveryAttempt"`
	IngestionAttempt int64  `json:"ingestionAttempt"`
	Subscription     string `json:"subscription"`
	RawData          string `json:"rawData,omitempty"`
}

type consumerInboxRecord struct {
	Status     string    `firestore:"status"`
	Attempts   int64     `firestore:"attempts"`
	LeaseUntil time.Time `firestore:"leaseUntil"`
}

func StartPubSubConsumer(ctx context.Context, cfg ConsumerConfig) error {
	cfg = normalizeConsumerConfig(cfg)
	logger := loggerOrDefault(cfg.Logger)

	if strings.TrimSpace(cfg.ProjectID) == "" {
		return fmt.Errorf("missing project ID")
	}
	if strings.TrimSpace(cfg.SubscriptionID) == "" {
		return fmt.Errorf("missing subscription ID")
	}
	if cfg.Handler == nil {
		return fmt.Errorf("missing event handler")
	}

	pubSubClient, err := pubsub.NewClient(ctx, cfg.ProjectID)
	if err != nil {
		return fmt.Errorf("create pubsub client: %w", err)
	}
	defer pubSubClient.Close()

	var dlqTopic *pubsub.Topic
	if cfg.DLQTopicID != "" {
		dlqProjectID := strings.TrimSpace(cfg.DLQProjectID)
		if dlqProjectID == "" {
			dlqProjectID = cfg.ProjectID
		}

		if dlqProjectID == cfg.ProjectID {
			dlqTopic = pubSubClient.Topic(cfg.DLQTopicID)
		} else {
			dlqClient, err := pubsub.NewClient(ctx, dlqProjectID)
			if err != nil {
				return fmt.Errorf("create dlq pubsub client: %w", err)
			}
			defer dlqClient.Close()
			dlqTopic = dlqClient.Topic(cfg.DLQTopicID)
		}
	}

	subscription := pubSubClient.Subscription(cfg.SubscriptionID)
	receiveSettings := subscription.ReceiveSettings
	if cfg.MaxOutstandingMessages > 0 {
		receiveSettings.MaxOutstandingMessages = cfg.MaxOutstandingMessages
	}
	if cfg.MaxOutstandingBytes > 0 {
		receiveSettings.MaxOutstandingBytes = cfg.MaxOutstandingBytes
	}
	if cfg.NumGoroutines > 0 {
		receiveSettings.NumGoroutines = cfg.NumGoroutines
	}
	subscription.ReceiveSettings = receiveSettings

	logger.Info("starting domain event consumer", "subscription", cfg.SubscriptionID)
	return subscription.Receive(ctx, func(ctx context.Context, message *pubsub.Message) {
		if err := processPubSubMessage(ctx, cfg, dlqTopic, message, logger); err != nil {
			logger.Warn("failed to process pubsub message", "error", err, "subscription", cfg.SubscriptionID, "messageID", message.ID)
		}
	})
}

func normalizeConsumerConfig(cfg ConsumerConfig) ConsumerConfig {
	cfg.ProjectID = strings.TrimSpace(cfg.ProjectID)
	cfg.SubscriptionID = strings.TrimSpace(cfg.SubscriptionID)
	if cfg.MaxOutstandingMessages < 0 {
		cfg.MaxOutstandingMessages = 0
	}
	if cfg.MaxOutstandingBytes < 0 {
		cfg.MaxOutstandingBytes = 0
	}
	if cfg.NumGoroutines < 0 {
		cfg.NumGoroutines = 0
	}
	if cfg.MaxAttempts <= 0 {
		cfg.MaxAttempts = consumerDefaultMaxAttempts
	}
	cfg.InboxCollection = strings.TrimSpace(cfg.InboxCollection)
	if cfg.InboxCollection == "" {
		cfg.InboxCollection = consumerDefaultInboxCollection
	}
	if cfg.InboxLeaseDuration <= 0 {
		cfg.InboxLeaseDuration = consumerDefaultLeaseDuration
	}
	cfg.DLQProjectID = strings.TrimSpace(cfg.DLQProjectID)
	cfg.DLQTopicID = strings.TrimSpace(cfg.DLQTopicID)
	if cfg.Logger == nil {
		cfg.Logger = slog.Default()
	}
	return cfg
}

func processPubSubMessage(ctx context.Context, cfg ConsumerConfig, dlqTopic *pubsub.Topic, message *pubsub.Message, logger *slog.Logger) error {
	deliveryAttempt := int64(1)
	if message.DeliveryAttempt != nil {
		deliveryAttempt = int64(*message.DeliveryAttempt)
	}

	var event Event
	if err := json.Unmarshal(message.Data, &event); err != nil {
		if err := publishDeadLetter(ctx, cfg, dlqTopic, message, Event{}, err, deliveryAttempt, 0, string(message.Data)); err != nil {
			message.Nack()
			return fmt.Errorf("failed to publish dead-letter envelope: %w", err)
		}
		message.Ack()
		return nil
	}

	if err := ValidateEvent(event); err != nil {
		if err := publishDeadLetter(ctx, cfg, dlqTopic, message, event, err, deliveryAttempt, 0, ""); err != nil {
			message.Nack()
			return fmt.Errorf("failed to publish dead-letter envelope: %w", err)
		}
		message.Ack()
		return nil
	}

	ingestionAttempt := int64(1)
	if cfg.FirestoreClient != nil {
		shouldProcess, attempts, err := claimInboxEvent(ctx, cfg, event.ID)
		if err != nil {
			message.Nack()
			return err
		}
		if !shouldProcess {
			message.Ack()
			return nil
		}
		ingestionAttempt = attempts
	} else {
		ingestionAttempt = deliveryAttempt
	}

	err := cfg.Handler(ctx, event)
	if err != nil {
		if cfg.MaxAttempts > 0 && ingestionAttempt >= int64(cfg.MaxAttempts) {
			if dlqErr := publishDeadLetter(ctx, cfg, dlqTopic, message, event, err, deliveryAttempt, ingestionAttempt, ""); dlqErr != nil {
				if cfg.FirestoreClient != nil {
					_ = markInboxStatus(ctx, cfg, event.ID, consumerInboxStatusFailed, ingestionAttempt, err)
				}
				message.Nack()
				return fmt.Errorf("dead-letter failed: %w", dlqErr)
			}
			if cfg.FirestoreClient != nil {
				if markErr := markInboxStatus(ctx, cfg, event.ID, consumerInboxStatusDead, ingestionAttempt, err); markErr != nil {
					message.Nack()
					return markErr
				}
			}
			message.Ack()
			return nil
		}

		if cfg.FirestoreClient != nil {
			if markErr := markInboxStatus(ctx, cfg, event.ID, consumerInboxStatusFailed, ingestionAttempt, err); markErr != nil {
				message.Nack()
				return markErr
			}
		}
		message.Nack()
		return fmt.Errorf("handler failed: %w", err)
	}

	if cfg.FirestoreClient != nil {
		if doneErr := markInboxStatus(ctx, cfg, event.ID, consumerInboxStatusDone, ingestionAttempt, nil); doneErr != nil {
			message.Nack()
			return doneErr
		}
	}

	logger.Info("event processed", "eventType", event.Type, "eventID", event.ID, "subscription", cfg.SubscriptionID)
	message.Ack()
	return nil
}

func claimInboxEvent(ctx context.Context, cfg ConsumerConfig, eventID string) (bool, int64, error) {
	if cfg.FirestoreClient == nil || strings.TrimSpace(cfg.InboxCollection) == "" {
		return true, 0, nil
	}

	now := time.Now().UTC()
	ref := cfg.FirestoreClient.Collection(cfg.InboxCollection).Doc(eventID)

	var shouldProcess bool
	var attempts int64

	err := cfg.FirestoreClient.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		snap, err := tx.Get(ref)
		if err != nil {
			if status.Code(err) != codes.NotFound {
				return fmt.Errorf("read inbox state: %w", err)
			}
			attempts = 1
			shouldProcess = true
			return tx.Set(ref, map[string]any{
				"eventID":       eventID,
				"status":        consumerInboxStatusProcessing,
				"attempts":      attempts,
				"leaseUntil":    now.Add(cfg.InboxLeaseDuration),
				"lastAttemptAt": now,
			}, firestore.MergeAll)
		}

		var existing consumerInboxRecord
		if err := snap.DataTo(&existing); err != nil {
			return fmt.Errorf("decode inbox state: %w", err)
		}

		if existing.Status == consumerInboxStatusDone {
			shouldProcess = false
			attempts = existing.Attempts
			return nil
		}
		if existing.Status == consumerInboxStatusProcessing && now.Before(existing.LeaseUntil) {
			shouldProcess = false
			attempts = existing.Attempts
			return nil
		}

		if existing.Attempts < 0 {
			existing.Attempts = 0
		}
		attempts = existing.Attempts + 1
		shouldProcess = true
		return tx.Set(ref, map[string]any{
			"status":        consumerInboxStatusProcessing,
			"attempts":      attempts,
			"leaseUntil":    now.Add(cfg.InboxLeaseDuration),
			"lastAttemptAt": now,
		}, firestore.MergeAll)
	})

	if err != nil {
		return false, 0, fmt.Errorf("claim inbox event: %w", err)
	}
	return shouldProcess, attempts, nil
}

func markInboxStatus(ctx context.Context, cfg ConsumerConfig, eventID, statusName string, attempts int64, lastErr error) error {
	if cfg.FirestoreClient == nil || strings.TrimSpace(cfg.InboxCollection) == "" {
		return nil
	}

	ref := cfg.FirestoreClient.Collection(cfg.InboxCollection).Doc(eventID)
	values := map[string]any{
		"status":    statusName,
		"attempts":  attempts,
		"updatedAt": time.Now().UTC(),
	}
	if lastErr != nil {
		values["lastError"] = lastErr.Error()
	}
	if statusName == consumerInboxStatusProcessing {
		values["leaseUntil"] = time.Now().UTC().Add(cfg.InboxLeaseDuration)
	}
	if _, err := ref.Set(ctx, values, firestore.MergeAll); err != nil {
		return fmt.Errorf("set inbox status: %w", err)
	}
	return nil
}

func publishDeadLetter(ctx context.Context, cfg ConsumerConfig, topic *pubsub.Topic, message *pubsub.Message, event Event, reason error, deliveryAttempt, ingestionAttempt int64, rawData string) error {
	if topic == nil {
		return nil
	}

	envelope := DeadLetterEnvelope{
		Event:            event,
		Error:            reason.Error(),
		FailureAt:        time.Now().UTC().Format(time.RFC3339),
		DeliveryAttempt:  deliveryAttempt,
		IngestionAttempt: ingestionAttempt,
		Subscription:     cfg.SubscriptionID,
	}
	if rawData != "" {
		envelope.RawData = rawData
	}

	body, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("marshal dead-letter envelope: %w", err)
	}

	envelopeMessage := &pubsub.Message{
		Data: body,
		Attributes: map[string]string{
			"subscription": cfg.SubscriptionID,
			"eventID":      event.ID,
			"messageID":    message.ID,
		},
	}
	if _, err := topic.Publish(ctx, envelopeMessage).Get(ctx); err != nil {
		return fmt.Errorf("publish dead-letter: %w", err)
	}
	logger := loggerOrDefault(cfg.Logger)
	logger.Info("event routed to dead-letter topic", "eventID", event.ID, "subscription", cfg.SubscriptionID)
	return nil
}

func loggerOrDefault(logger *slog.Logger) *slog.Logger {
	if logger == nil {
		return slog.Default()
	}
	return logger
}
