package chat

import (
	"context"
	"errors"
	"testing"
	"time"
)

var errRepo = errors.New("firestore down")

// --- StartConversation error paths ---

func TestServiceStartConversationDefaultChannel(t *testing.T) {
	var created *Conversation
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil
		},
		CreateConversationFunc: func(_ context.Context, conv *Conversation) error {
			created = conv
			return nil
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	if _, _, _, err := svc.StartConversation(context.Background(), "uid-1", "", "en", "hi"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if created == nil || created.Channel != ChannelWebApp {
		t.Fatalf("channel = %+v, want default web-app", created)
	}
}

func TestServiceStartConversationGetOpenConversationError(t *testing.T) {
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	_, _, _, err := svc.StartConversation(context.Background(), "uid-1", ChannelWebApp, "en", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceStartConversationReuseAppendError(t *testing.T) {
	existing := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot}
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return existing, nil
		},
		AppendMessageFunc: func(_ context.Context, _ string, _ *Message) error {
			return errRepo
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	_, _, _, err := svc.StartConversation(context.Background(), "uid-1", ChannelWebApp, "en", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceStartConversationCreateError(t *testing.T) {
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil
		},
		CreateConversationFunc: func(_ context.Context, _ *Conversation) error {
			return errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	_, _, _, err := svc.StartConversation(context.Background(), "uid-1", ChannelWebApp, "en", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceStartConversationNewAppendError(t *testing.T) {
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil
		},
		AppendMessageFunc: func(_ context.Context, _ string, _ *Message) error {
			return errRepo
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	_, _, _, err := svc.StartConversation(context.Background(), "uid-1", ChannelWebApp, "en", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// --- GetOpenConversationByUID wrapper error path ---

func TestServiceGetOpenConversationByUIDError(t *testing.T) {
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	_, err := svc.GetOpenConversationByUID(context.Background(), "uid-1")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// --- SendCustomerMessage error paths ---

func TestServiceSendCustomerMessageGetConversationError(t *testing.T) {
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceSendCustomerMessageRestartError(t *testing.T) {
	closedConv := &Conversation{ID: "conv-old", UserID: "uid-1", Status: StatusClosed}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return closedConv, nil
		},
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-old", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceSendCustomerMessageRateLimitCheckError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		CountMessagesSinceFunc: func(_ context.Context, _ string, _ string, _ time.Time) (int, error) {
			return 0, errRepo
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceSendCustomerMessageEscalatedStoreError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusEscalated}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		AppendMessageFunc: func(_ context.Context, _ string, _ *Message) error {
			return errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceSendCustomerMessageEscalatedUpdateError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusEscalated}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		UpdateConversationFunc: func(_ context.Context, _ *Conversation) error {
			return errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceSendCustomerMessageBotFlowAppendError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot}
	calls := 0
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		AppendMessageFunc: func(_ context.Context, _ string, _ *Message) error {
			calls++
			if calls == 1 {
				return errRepo
			}
			return nil
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// --- SendCustomerMessage escalation mid-flow (engine decides to escalate) ---

func TestServiceSendCustomerMessageEngineEscalates(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot, Channel: ChannelWebOfficial}
	var updated *Conversation
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		UpdateConversationFunc: func(_ context.Context, c *Conversation) error {
			updated = c
			conv = c
			return nil
		},
	}
	slack := &mockSlack{}
	svc := NewService(mock, engineWithStub("", true, "cannot help with this"), slack)

	newConv, customerMsg, botMsg, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "very unusual request")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if newConv.Status != StatusEscalated {
		t.Fatalf("status = %s, want escalated", newConv.Status)
	}
	if customerMsg == nil {
		t.Fatal("customer message missing")
	}
	if botMsg == nil || botMsg.Text != handoffMessage() {
		t.Fatalf("bot reply = %+v, want handoff message", botMsg)
	}
	if updated == nil || updated.Status != StatusEscalated {
		t.Fatal("conversation was not persisted as escalated")
	}
	if slack.calls != 1 {
		t.Fatalf("slack calls = %d, want 1", slack.calls)
	}
	if slack.last.CustomerLabel != "Visitor" {
		t.Errorf("customer label = %q, want Visitor for web-official", slack.last.CustomerLabel)
	}
}

func TestServiceAppendCustomerMessageHistoryError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		RecentMessagesFunc: func(_ context.Context, _ string, _ int) ([]Message, error) {
			return nil, errRepo
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceAppendCustomerMessageBotAppendError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot}
	calls := 0
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		AppendMessageFunc: func(_ context.Context, _ string, msg *Message) error {
			calls++
			if msg.Role == RoleBot {
				return errRepo
			}
			return nil
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if calls != 2 {
		t.Fatalf("append calls = %d, want 2 (customer then bot)", calls)
	}
}

func TestServiceAppendCustomerMessageFinalUpdateError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		UpdateConversationFunc: func(_ context.Context, _ *Conversation) error {
			return errRepo
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// --- ListMessages error/edge paths ---

func TestServiceListMessagesNotOwner(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "owner-uid"}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
	}
	svc := NewService(mock, nil, nil)

	_, _, err := svc.ListMessages(context.Background(), "intruder", "conv-1", "", 50)
	if !errors.Is(err, ErrConversationNotFound) {
		t.Fatalf("error = %v, want ErrConversationNotFound", err)
	}
}

func TestServiceListMessagesGetConversationError(t *testing.T) {
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	_, _, err := svc.ListMessages(context.Background(), "uid-1", "conv-1", "", 50)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceListMessagesDefaultLimit(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1"}
	var gotLimit int
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		ListMessagesFunc: func(_ context.Context, _ string, _ string, limit int) ([]Message, string, error) {
			gotLimit = limit
			return nil, "", nil
		},
	}
	svc := NewService(mock, nil, nil)

	if _, _, err := svc.ListMessages(context.Background(), "uid-1", "conv-1", "", 0); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotLimit != 50 {
		t.Errorf("limit = %d, want default 50", gotLimit)
	}
}

func TestServiceListMessagesRepoError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1"}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		ListMessagesFunc: func(_ context.Context, _ string, _ string, _ int) ([]Message, string, error) {
			return nil, "", errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	_, _, err := svc.ListMessages(context.Background(), "uid-1", "conv-1", "", 50)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// --- Escalate error paths ---

func TestServiceEscalateGetConversationError(t *testing.T) {
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	if err := svc.Escalate(context.Background(), "conv-1", "reason"); err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceEscalateUpdateError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", Status: StatusBot}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		UpdateConversationFunc: func(_ context.Context, _ *Conversation) error {
			return errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	if err := svc.Escalate(context.Background(), "conv-1", "reason"); err == nil {
		t.Fatal("expected error, got nil")
	}
}

// --- UpdateStatus error/edge paths ---

func TestServiceUpdateStatusGetConversationError(t *testing.T) {
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	if err := svc.UpdateStatus(context.Background(), "agent-1", "conv-1", StatusClosed); err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceUpdateStatusNotFound(t *testing.T) {
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil
		},
	}
	svc := NewService(mock, nil, nil)

	err := svc.UpdateStatus(context.Background(), "agent-1", "conv-1", StatusClosed)
	if !errors.Is(err, ErrConversationNotFound) {
		t.Fatalf("error = %v, want ErrConversationNotFound", err)
	}
}

func TestServiceUpdateStatusSameStatusNoop(t *testing.T) {
	conv := &Conversation{ID: "conv-1", Status: StatusBot}
	updateCalls := 0
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		UpdateConversationFunc: func(_ context.Context, _ *Conversation) error {
			updateCalls++
			return nil
		},
	}
	svc := NewService(mock, nil, nil)

	if err := svc.UpdateStatus(context.Background(), "agent-1", "conv-1", StatusBot); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updateCalls != 0 {
		t.Errorf("UpdateConversation called %d times, want 0 (no-op)", updateCalls)
	}
}

func TestServiceUpdateStatusUpdateError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", Status: StatusBot}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		UpdateConversationFunc: func(_ context.Context, _ *Conversation) error {
			return errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	if err := svc.UpdateStatus(context.Background(), "agent-1", "conv-1", StatusClosed); err == nil {
		t.Fatal("expected error, got nil")
	}
}

// --- storeCustomerMessageOnly error paths (via SendCustomerMessage on a human conversation) ---

func TestServiceSendCustomerMessageHumanStatusStoreError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusHuman}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		AppendMessageFunc: func(_ context.Context, _ string, _ *Message) error {
			return errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestServiceSendCustomerMessageHumanStatusUpdateError(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusHuman}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		UpdateConversationFunc: func(_ context.Context, _ *Conversation) error {
			return errRepo
		},
	}
	svc := NewService(mock, nil, nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "hi")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// --- checkRateLimit already covered by handler/service rate-limit tests; add a nil-slack escalation path ---

func TestServiceNotifySlackEscalationNilSlack(t *testing.T) {
	conv := &Conversation{ID: "conv-1", Status: StatusBot}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		UpdateConversationFunc: func(_ context.Context, c *Conversation) error {
			conv = c
			return nil
		},
	}
	svc := NewService(mock, nil, nil) // nil slack — must not panic

	if err := svc.Escalate(context.Background(), "conv-1", "reason"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if conv.Status != StatusEscalated {
		t.Fatalf("status = %s, want escalated", conv.Status)
	}
}

// --- small pure-function unit tests ---

func TestPreviewTextTruncates(t *testing.T) {
	long := make([]rune, 250)
	for i := range long {
		long[i] = 'x'
	}
	got := previewText(string(long))
	if len([]rune(got)) != previewMaxChars+1 { // +1 for the ellipsis rune
		t.Errorf("preview length = %d, want %d", len([]rune(got)), previewMaxChars+1)
	}

	short := "hello"
	if previewText(short) != short {
		t.Errorf("preview of short text = %q, want unchanged %q", previewText(short), short)
	}
}

func TestToTurnsMapsRoles(t *testing.T) {
	messages := []Message{
		{Role: RoleCustomer, Text: "hi"},
		{Role: RoleBot, Text: "hello"},
		{Role: RoleAgent, Text: "I'm here"},
	}
	turns := toTurns(messages)
	if len(turns) != 3 {
		t.Fatalf("turns len = %d, want 3", len(turns))
	}
	if turns[0].Role != TurnRoleUser {
		t.Errorf("turns[0].Role = %s, want %s (customer -> user)", turns[0].Role, TurnRoleUser)
	}
	if turns[1].Role != TurnRoleModel {
		t.Errorf("turns[1].Role = %s, want %s (bot -> model)", turns[1].Role, TurnRoleModel)
	}
	if turns[2].Role != TurnRoleModel {
		t.Errorf("turns[2].Role = %s, want %s (agent -> model)", turns[2].Role, TurnRoleModel)
	}
}

func TestCustomerLabelWebOfficial(t *testing.T) {
	conv := &Conversation{Channel: ChannelWebOfficial, UserID: "anon-uid"}
	if got := customerLabel(conv); got != "Visitor" {
		t.Errorf("customerLabel = %q, want Visitor", got)
	}
}

func TestCustomerLabelWebApp(t *testing.T) {
	conv := &Conversation{Channel: ChannelWebApp, UserID: "uid-1"}
	if got := customerLabel(conv); got != "User uid-1" {
		t.Errorf("customerLabel = %q, want 'User uid-1'", got)
	}
}
