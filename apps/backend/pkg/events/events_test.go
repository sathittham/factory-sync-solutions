package events

import "testing"

func TestValidateEvent_ValidCases(t *testing.T) {
	tests := []struct {
		name  string
		event Event
	}{
		{
			name: "profile registered",
			event: Event{
				ID:            "e-1",
				Type:          DomainEventProfileRegistered,
				AggregateType: "profile",
				AggregateID:   "u-1",
				ActorUID:      "u-1",
				Payload:       map[string]any{"uid": "u-1", "companyRegId": "1234567890123"},
				OccurredAt:    "2026-06-18T00:00:00Z",
			},
		},
		{
			name: "profile updated",
			event: Event{
				ID:            "e-2",
				Type:          DomainEventProfileUpdated,
				AggregateType: "profile",
				AggregateID:   "u-1",
				Payload:       map[string]any{"uid": "u-1", "fields": []string{"contactName"}},
				OccurredAt:    "2026-06-18T00:00:00Z",
			},
		},
		{
			name: "quiz submitted",
			event: Event{
				ID:            "e-3",
				Type:          DomainEventQuizSubmitted,
				AggregateType: "quiz",
				AggregateID:   "a-1",
				Payload:       map[string]any{"assessmentId": "a-1", "quizId": "shindan", "overallScore": 3.4},
				OccurredAt:    "2026-06-18T00:00:00Z",
			},
		},
		{
			name: "result ready",
			event: Event{
				ID:            "e-4",
				Type:          DomainEventResultReady,
				AggregateType: "assessment",
				AggregateID:   "a-1",
				Payload:       map[string]any{"assessmentId": "a-1", "uid": "u-1", "quizId": "shindan", "overallScore": 3.4},
				OccurredAt:    "2026-06-18T00:00:00Z",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := ValidateEvent(tt.event); err != nil {
				t.Fatalf("ValidateEvent() unexpected error: %v", err)
			}
		})
	}
}

func TestValidateEvent_InvalidCases(t *testing.T) {
	tests := []struct {
		name  string
		event Event
	}{
		{
			name: "missing type",
			event: Event{
				ID:            "e-1",
				AggregateType: "profile",
				AggregateID:   "u-1",
				Payload:       map[string]any{"uid": "u-1", "companyRegId": "1234567890123"},
				OccurredAt:    "2026-06-18T00:00:00Z",
			},
		},
		{
			name: "unsupported type",
			event: Event{
				ID:            "e-2",
				Type:          "SomethingElse",
				AggregateType: "profile",
				AggregateID:   "u-1",
				Payload:       map[string]any{"uid": "u-1", "companyRegId": "1234567890123"},
				OccurredAt:    "2026-06-18T00:00:00Z",
			},
		},
		{
			name: "missing payload field",
			event: Event{
				ID:            "e-3",
				Type:          DomainEventProfileRegistered,
				AggregateType: "profile",
				AggregateID:   "u-1",
				Payload:       map[string]any{"companyRegId": "1234567890123"},
				OccurredAt:    "2026-06-18T00:00:00Z",
			},
		},
		{
			name: "nil payload map",
			event: Event{
				ID:            "e-4",
				Type:          DomainEventProfileUpdated,
				AggregateType: "profile",
				AggregateID:   "u-1",
				OccurredAt:    "2026-06-18T00:00:00Z",
			},
		},
		{
			name: "missing occurredAt",
			event: Event{
				ID:            "e-5",
				Type:          DomainEventResultReady,
				AggregateType: "assessment",
				AggregateID:   "a-1",
				Payload:       map[string]any{"assessmentId": "a-1", "uid": "u-1", "quizId": "shindan", "overallScore": 3.4},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := ValidateEvent(tt.event); err == nil {
				t.Fatal("expected validation error, got nil")
			}
		})
	}
}

func TestNewEvent(t *testing.T) {
	event := NewEvent(
		DomainEventProfileUpdated,
		"profile",
		"u-1",
		"u-1",
		map[string]any{"uid": "u-1", "fields": []string{"contactName"}},
		nil,
	)

	if event.Type != DomainEventProfileUpdated {
		t.Fatalf("type = %s, want %s", event.Type, DomainEventProfileUpdated)
	}
	if event.AggregateType != "profile" {
		t.Fatalf("aggregateType = %s, want profile", event.AggregateType)
	}
	if event.AggregateID != "u-1" {
		t.Fatalf("aggregateID = %s, want u-1", event.AggregateID)
	}
	if event.ActorUID != "u-1" {
		t.Fatalf("actorUID = %s, want u-1", event.ActorUID)
	}
	if event.OccurredAt == "" {
		t.Fatal("expected occurredAt to be set")
	}
}

func TestNewEventWithCorrelation(t *testing.T) {
	event := NewEventWithCorrelation(
		DomainEventQuizSubmitted,
		"quiz",
		"a-1",
		"u-1",
		"corr-123",
		map[string]any{"assessmentId": "a-1", "quizId": "shindan", "overallScore": 3.4},
		nil,
	)

	if event.CorrelationID != "corr-123" {
		t.Fatalf("correlationID = %s, want corr-123", event.CorrelationID)
	}
}
