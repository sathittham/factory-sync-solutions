package audit

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
)

// EventType identifies the category of an audit event.
type EventType string

const (
	EventUserLogin           EventType = "user.login"
	EventUserRegistered      EventType = "user.registered"
	EventUserProfileUpdated  EventType = "user.profile_updated"
	EventUserRoleChanged     EventType = "user.role_changed"
	EventAssessmentSubmitted EventType = "assessment.submitted"
	EventAdminExport         EventType = "admin.export"
)

// Event represents a single audit log entry stored in Firestore.
type Event struct {
	ID           string         `json:"id" firestore:"id"`
	ActorUID     string         `json:"actorUID" firestore:"actorUID"`
	EventType    EventType      `json:"eventType" firestore:"eventType"`
	ResourceType string         `json:"resourceType" firestore:"resourceType"`
	ResourceID   string         `json:"resourceID" firestore:"resourceID"`
	Metadata     map[string]any `json:"metadata" firestore:"metadata"`
	CreatedAt    string         `json:"createdAt" firestore:"createdAt"`
}

// Logger writes audit events to the Firestore audit_events collection.
type Logger struct {
	fsClient *firestore.Client
}

// NewLogger returns a Logger backed by the given Firestore client.
// Passing nil is valid — Log calls become no-ops.
func NewLogger(fsClient *firestore.Client) *Logger {
	return &Logger{fsClient: fsClient}
}

// Log records an audit event. If the Firestore client is nil the call is a
// no-op (debug-logged). Firestore write errors are logged but never returned.
func (l *Logger) Log(ctx context.Context, actorUID string, eventType EventType, resourceType, resourceID string, metadata map[string]any) {
	if l.fsClient == nil {
		slog.Debug("audit logger: no firestore client, skipping event",
			"eventType", string(eventType),
			"actorUID", actorUID,
		)
		return
	}

	event := Event{
		ID:           uuid.New().String(),
		ActorUID:     actorUID,
		EventType:    eventType,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Metadata:     metadata,
		CreatedAt:    time.Now().UTC().Format(time.RFC3339),
	}

	if _, err := l.fsClient.Collection("audit_events").Doc(event.ID).Set(ctx, event); err != nil {
		slog.Error("audit log write failed",
			"error", err.Error(),
			"eventType", string(eventType),
			"actorUID", actorUID,
		)
	}
}

// QueryByActor returns the most recent audit events for a given actor, up to limit.
func (l *Logger) QueryByActor(ctx context.Context, actorUID string, limit int) ([]Event, error) {
	if l.fsClient == nil {
		return nil, nil
	}

	docs, err := l.fsClient.Collection("audit_events").
		Where("actorUID", "==", actorUID).
		OrderBy("createdAt", firestore.Desc).
		Limit(limit).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("query audit events for actor %s: %w", actorUID, err)
	}

	events := make([]Event, 0, len(docs))
	for _, doc := range docs {
		var ev Event
		if err := doc.DataTo(&ev); err != nil {
			slog.Warn("audit event decode failed", "docID", doc.Ref.ID, "error", err.Error())
			continue
		}
		events = append(events, ev)
	}
	return events, nil
}
