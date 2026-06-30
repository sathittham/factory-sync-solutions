package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/pubsub"

	"github.com/google/uuid"
)

const (
	DomainEventProfileRegistered = "ProfileRegistered"
	DomainEventProfileUpdated    = "ProfileUpdated"
	DomainEventQuizSubmitted     = "QuizSubmitted"
	DomainEventResultReady       = "ResultReady"
)

var requiredPayloadKeysByType = map[string][]string{
	DomainEventProfileRegistered: {"uid", "companyRegId"},
	DomainEventProfileUpdated:    {"uid", "fields"},
	DomainEventQuizSubmitted:     {"assessmentId", "quizId", "overallScore"},
	DomainEventResultReady:       {"assessmentId", "uid", "quizId", "overallScore"},
}

type Event struct {
	ID            string         `json:"id"`
	Type          string         `json:"type"`
	AggregateType string         `json:"aggregateType"`
	AggregateID   string         `json:"aggregateId"`
	ActorUID      string         `json:"actorUID,omitempty"`
	CorrelationID string         `json:"correlationId,omitempty"`
	Payload       map[string]any `json:"payload"`
	Metadata      map[string]any `json:"metadata,omitempty"`
	OccurredAt    string         `json:"occurredAt"`
}

type Publisher interface {
	Publish(ctx context.Context, event Event) error
}

type NoopPublisher struct{}

func (NoopPublisher) Publish(_ context.Context, _ Event) error { return nil }

type LoggingPublisher struct {
	logger *slog.Logger
}

func NewLoggingPublisher() *LoggingPublisher {
	return &LoggingPublisher{logger: slog.Default()}
}

func (p *LoggingPublisher) loggerOrDefault() *slog.Logger {
	if p.logger == nil {
		p.logger = slog.Default()
	}
	return p.logger
}

func (p *LoggingPublisher) Publish(ctx context.Context, event Event) error {
	p.logger = p.loggerOrDefault()
	if err := ValidateEvent(event); err != nil {
		p.logger.WarnContext(ctx, "invalid domain event", "error", err, "eventType", event.Type, "eventID", event.ID)
		return err
	}
	eventJSON, err := json.Marshal(event)
	if err != nil {
		p.logger.WarnContext(ctx, "failed to marshal domain event", "error", err, "eventType", event.Type, "eventID", event.ID)
		return err
	}
	p.logger.InfoContext(ctx, "domain event", "event", string(eventJSON))
	return nil
}

type PubSubPublisher struct {
	client *pubsub.Client
	topic  *pubsub.Topic
	logger *slog.Logger
}

func NewPubSubPublisher(ctx context.Context, projectID, topicID string) (Publisher, error) {
	projectID = strings.TrimSpace(projectID)
	topicID = strings.TrimSpace(topicID)
	if projectID == "" {
		return nil, fmt.Errorf("missing GCP project ID")
	}
	if topicID == "" {
		return nil, fmt.Errorf("missing DOMAIN_EVENT_PUBSUB_TOPIC")
	}

	client, err := pubsub.NewClient(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("create pubsub client: %w", err)
	}

	return &PubSubPublisher{
		client: client,
		topic:  client.Topic(topicID),
		logger: slog.Default(),
	}, nil
}

func (p *PubSubPublisher) Publish(ctx context.Context, event Event) error {
	p.logger = p.loggerOrDefault()
	if err := ValidateEvent(event); err != nil {
		p.logger.WarnContext(ctx, "invalid domain event", "error", err, "eventType", event.Type, "eventID", event.ID)
		return err
	}
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal domain event: %w", err)
	}

	msg := &pubsub.Message{
		Data: eventJSON,
		Attributes: map[string]string{
			"type":          event.Type,
			"aggregateType": event.AggregateType,
			"aggregateId":   event.AggregateID,
			"eventID":       event.ID,
		},
	}
	_, err = p.topic.Publish(ctx, msg).Get(ctx)
	if err != nil {
		return fmt.Errorf("publish domain event: %w", err)
	}
	p.logger.InfoContext(ctx, "domain event published", "eventType", event.Type, "eventID", event.ID, "topic", p.topic)
	return nil
}

func (p *PubSubPublisher) Close() error {
	if p == nil {
		return nil
	}
	p.topic.Stop()
	if p.client == nil {
		return nil
	}
	return p.client.Close()
}

func (p *PubSubPublisher) loggerOrDefault() *slog.Logger {
	if p.logger == nil {
		p.logger = slog.Default()
	}
	return p.logger
}

type PubSubLoggingPublisher struct {
	logger *slog.Logger
	next   Publisher
}

func (p *PubSubLoggingPublisher) Publish(ctx context.Context, event Event) error {
	if p == nil {
		return nil
	}
	if err := ValidateEvent(event); err != nil {
		log := p.loggerOrDefault()
		log.Warn("invalid domain event", "error", err, "eventType", event.Type, "eventID", event.ID)
		return err
	}
	log := p.loggerOrDefault()
	eventJSON, err := json.Marshal(event)
	if err != nil {
		log.Warn("failed to marshal domain event", "error", err, "eventType", event.Type, "eventID", event.ID)
		return err
	}
	log.Info("domain event", "event", string(eventJSON))
	if p.next == nil {
		return nil
	}
	if err := p.next.Publish(ctx, event); err != nil {
		log.Warn("failed to publish domain event", "error", err, "eventType", event.Type, "eventID", event.ID)
		return err
	}
	return nil
}

func (p *PubSubLoggingPublisher) loggerOrDefault() *slog.Logger {
	if p.logger == nil {
		p.logger = slog.Default()
	}
	return p.logger
}

func newPubSubFromEnv(ctx context.Context, logger *slog.Logger, logBeforePublish bool) Publisher {
	projectID := strings.TrimSpace(os.Getenv("GCP_PROJECT_ID"))
	if projectID == "" {
		projectID = strings.TrimSpace(os.Getenv("GOOGLE_CLOUD_PROJECT"))
	}
	topic := strings.TrimSpace(os.Getenv("DOMAIN_EVENT_PUBSUB_TOPIC"))

	if logger == nil {
		logger = slog.Default()
	}
	if projectID == "" || topic == "" {
		logger.Warn("pubsub mode requested but project/topic missing; falling back to noop publisher", "projectID", projectID, "topic", topic)
		return NoopPublisher{}
	}

	publisher, err := NewPubSubPublisher(ctx, projectID, topic)
	if err != nil {
		logger.Warn("failed to init pubsub publisher; falling back to noop publisher", "error", err, "projectID", projectID, "topic", topic)
		return NoopPublisher{}
	}

	if logBeforePublish {
		return &PubSubLoggingPublisher{
			logger: logger,
			next:   publisher,
		}
	}
	return publisher
}

func NewEvent(eventType, aggregateType, aggregateID, actorUID string, payload map[string]any, metadata map[string]any) Event {
	return Event{
		ID:            uuid.New().String(),
		Type:          eventType,
		AggregateType: aggregateType,
		AggregateID:   aggregateID,
		ActorUID:      actorUID,
		Payload:       payload,
		Metadata:      metadata,
		OccurredAt:    time.Now().UTC().Format(time.RFC3339),
	}
}

func NewEventWithCorrelation(eventType, aggregateType, aggregateID, actorUID, correlationID string, payload map[string]any, metadata map[string]any) Event {
	event := NewEvent(eventType, aggregateType, aggregateID, actorUID, payload, metadata)
	event.CorrelationID = correlationID
	return event
}

func ValidateEvent(event Event) error {
	if strings.TrimSpace(event.Type) == "" {
		return fmt.Errorf("missing event type")
	}
	if strings.TrimSpace(event.ID) == "" {
		return fmt.Errorf("missing event id")
	}
	if strings.TrimSpace(event.AggregateType) == "" {
		return fmt.Errorf("missing aggregate type")
	}
	if strings.TrimSpace(event.AggregateID) == "" {
		return fmt.Errorf("missing aggregate id")
	}
	if strings.TrimSpace(event.OccurredAt) == "" {
		return fmt.Errorf("missing occurredAt")
	}
	requiredPayloadKeys, ok := requiredPayloadKeysByType[event.Type]
	if !ok {
		return fmt.Errorf("unsupported event type: %s", event.Type)
	}
	for _, key := range requiredPayloadKeys {
		if event.Payload == nil {
			return fmt.Errorf("missing payload key %s for event %s", key, event.Type)
		}
		if _, exists := event.Payload[key]; !exists {
			return fmt.Errorf("missing payload key %s for event %s", key, event.Type)
		}
	}
	return nil
}

func NewPublisherFromEnv(ctx context.Context) Publisher {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("DOMAIN_EVENT_MODE")))
	logger := slog.Default()
	switch mode {
	case "log", "logging", "stdout":
		return NewLoggingPublisher()
	case "pubsub":
		return newPubSubFromEnv(ctx, logger, false)
	case "pubsub-log":
		return newPubSubFromEnv(ctx, logger, true)
	case "", "off", "disable", "disabled", "noop":
		return NoopPublisher{}
	default:
		logger.Warn("unknown DOMAIN_EVENT_MODE, defaulting to noop", "mode", mode)
		return NoopPublisher{}
	}
}
