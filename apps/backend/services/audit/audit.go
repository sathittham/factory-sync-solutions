package audit

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
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

	EventProjectCreated                 EventType = "project.created"
	EventProjectSettingsUpdated         EventType = "project.settings_updated"
	EventProjectDeactivated             EventType = "project.deactivated"
	EventProjectReactivated             EventType = "project.reactivated"
	EventProjectMemberRoleChanged       EventType = "project.member_role_changed"
	EventProjectMemberRemoved           EventType = "project.member_removed"
	EventBackofficeUserDeleted          EventType = "backoffice.user_deleted"
	EventBackofficeUserRoleChanged      EventType = "backoffice.user_role_changed"
	EventBackofficeStaffRoleGranted     EventType = "backoffice.staff_role_granted"
	EventBackofficeStaffRoleChanged     EventType = "backoffice.staff_role_changed"
	EventBackofficeStaffRoleRevoked     EventType = "backoffice.staff_role_revoked"
	EventBackofficeProjectCreated       EventType = "backoffice.project_created"
	EventBackofficeProjectUpdated       EventType = "backoffice.project_updated"
	EventBackofficeProjectDeactivated   EventType = "backoffice.project_deactivated"
	EventBackofficeProjectReactivated   EventType = "backoffice.project_reactivated"
	EventBackofficeMemberRoleChanged    EventType = "backoffice.project_member_role_changed"
	EventBackofficeProjectMemberRemoved EventType = "backoffice.project_member_removed"
)

// Event represents a single audit log entry stored in Firestore.
type Event struct {
	ID           string         `json:"id" firestore:"id"`
	ActorUID     string         `json:"actorUID" firestore:"actorUID"`
	ActorEmail   string         `json:"actorEmail,omitempty" firestore:"actorEmail,omitempty"`
	ActorName    string         `json:"actorName,omitempty" firestore:"actorName,omitempty"`
	EventType    EventType      `json:"eventType" firestore:"eventType"`
	ResourceType string         `json:"resourceType" firestore:"resourceType"`
	ResourceID   string         `json:"resourceID" firestore:"resourceID"`
	TargetUID    string         `json:"targetUID,omitempty" firestore:"targetUID,omitempty"`
	ProjectID    string         `json:"projectID,omitempty" firestore:"projectID,omitempty"`
	Metadata     map[string]any `json:"metadata,omitempty" firestore:"metadata,omitempty"`
	CreatedAt    string         `json:"createdAt" firestore:"createdAt"`
}

// EventDetails holds optional event context used by richer audit call sites.
type EventDetails struct {
	ActorEmail string
	ActorName  string
	TargetUID  string
	ProjectID  string
}

// QueryFilter restricts audit event lookup.
type QueryFilter struct {
	ActorUID     string
	TargetUID    string
	ProjectID    string
	EventType    string
	ResourceType string
	Before       string
	Limit        int
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
	l.LogWithDetails(ctx, actorUID, eventType, resourceType, resourceID, metadata, EventDetails{})
}

// LogWithDetails records an audit event with optional actor, target, and project context.
func (l *Logger) LogWithDetails(ctx context.Context, actorUID string, eventType EventType, resourceType, resourceID string, metadata map[string]any, details EventDetails) {
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
		ActorEmail:   details.ActorEmail,
		ActorName:    details.ActorName,
		EventType:    eventType,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		TargetUID:    details.TargetUID,
		ProjectID:    details.ProjectID,
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

func normalizeLimit(limit, defaultLimit, maxLimit int) int {
	if limit <= 0 {
		return defaultLimit
	}
	if limit > maxLimit {
		return maxLimit
	}
	return limit
}

func (l *Logger) query(ctx context.Context, filter QueryFilter, limit int) ([]Event, error) {
	query := l.fsClient.Collection("audit_events").Query
	switch {
	case filter.ActorUID != "":
		query = query.Where("actorUID", "==", filter.ActorUID)
	case filter.TargetUID != "":
		query = query.Where("targetUID", "==", filter.TargetUID)
	case filter.ProjectID != "":
		query = query.Where("projectID", "==", filter.ProjectID)
	case filter.EventType != "":
		query = query.Where("eventType", "==", filter.EventType)
	case filter.ResourceType != "":
		query = query.Where("resourceType", "==", filter.ResourceType)
	}
	if filter.Before != "" {
		query = query.Where("createdAt", "<", filter.Before)
	}
	query = query.OrderBy("createdAt", firestore.Desc).Limit(limit)

	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("query audit events: %w", err)
	}

	events := make([]Event, 0, len(docs))
	for _, doc := range docs {
		var ev Event
		if err := doc.DataTo(&ev); err != nil {
			slog.Warn("audit event decode failed", "docID", doc.Ref.ID, "error", err.Error())
			continue
		}
		if !matchesFilter(ev, filter) {
			continue
		}
		events = append(events, ev)
	}
	return events, nil
}

func matchesFilter(ev Event, filter QueryFilter) bool {
	if filter.ActorUID != "" && ev.ActorUID != filter.ActorUID {
		return false
	}
	if filter.TargetUID != "" && ev.TargetUID != filter.TargetUID {
		return false
	}
	if filter.ProjectID != "" && ev.ProjectID != filter.ProjectID {
		return false
	}
	if filter.EventType != "" && string(ev.EventType) != filter.EventType {
		return false
	}
	if filter.ResourceType != "" && ev.ResourceType != filter.ResourceType {
		return false
	}
	if filter.Before != "" && ev.CreatedAt >= filter.Before {
		return false
	}
	return true
}

func mergeEvents(limit int, groups ...[]Event) []Event {
	seen := map[string]bool{}
	events := []Event{}
	for _, group := range groups {
		for _, ev := range group {
			if seen[ev.ID] {
				continue
			}
			seen[ev.ID] = true
			events = append(events, ev)
		}
	}
	sort.SliceStable(events, func(i, j int) bool {
		return events[i].CreatedAt > events[j].CreatedAt
	})
	if len(events) > limit {
		return events[:limit]
	}
	return events
}

// Query returns recent audit events matching the filter.
func (l *Logger) Query(ctx context.Context, filter QueryFilter) ([]Event, error) {
	if l.fsClient == nil {
		return []Event{}, nil
	}
	limit := normalizeLimit(filter.Limit, 100, 500)
	events, err := l.query(ctx, filter, limit)
	if err != nil {
		return nil, err
	}
	return events, nil
}

// QueryByUser returns events where uid is the actor or the target.
func (l *Logger) QueryByUser(ctx context.Context, uid string, filter QueryFilter) ([]Event, error) {
	if l.fsClient == nil {
		return []Event{}, nil
	}
	limit := normalizeLimit(filter.Limit, 50, 200)

	actorFilter := filter
	actorFilter.ActorUID = uid
	actorFilter.TargetUID = ""
	targetFilter := filter
	targetFilter.ActorUID = ""
	targetFilter.TargetUID = uid

	actorEvents, err := l.query(ctx, actorFilter, limit)
	if err != nil {
		return nil, fmt.Errorf("query actor events for user %s: %w", uid, err)
	}
	targetEvents, err := l.query(ctx, targetFilter, limit)
	if err != nil {
		return nil, fmt.Errorf("query target events for user %s: %w", uid, err)
	}
	return mergeEvents(limit, actorEvents, targetEvents), nil
}

// QueryByActor returns the most recent audit events for a given actor, up to limit.
func (l *Logger) QueryByActor(ctx context.Context, actorUID string, limit int) ([]Event, error) {
	if l.fsClient == nil {
		return []Event{}, nil
	}

	events, err := l.Query(ctx, QueryFilter{ActorUID: actorUID, Limit: limit})
	if err != nil {
		return nil, fmt.Errorf("query audit events for actor %s: %w", actorUID, err)
	}
	return events, nil
}
