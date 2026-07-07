package chat

import (
	"context"
	"errors"
	"testing"
)

// UT-020: Reply generation — happy path.
func TestEngineReplyHappyPath(t *testing.T) {
	stub := &stubModelClient{reply: "You can register at app.factorysyncsolutions.com", escalate: false}
	engine := NewEngine(stub, "system prompt")

	text, escalate, reason := engine.Reply(context.Background(), nil, "How do I register?")

	if escalate {
		t.Fatalf("escalate = true, want false")
	}
	if reason != "" {
		t.Errorf("reason = %q, want empty", reason)
	}
	if text != stub.reply {
		t.Errorf("text = %q, want %q (verbatim model text)", text, stub.reply)
	}
	if stub.calls != 1 {
		t.Errorf("model called %d times, want 1", stub.calls)
	}
}

// UT-021: Escalation tool call.
func TestEngineReplyEscalationToolCall(t *testing.T) {
	stub := &stubModelClient{escalate: true, reason: "customer wants pricing details"}
	engine := NewEngine(stub, "system prompt")

	text, escalate, reason := engine.Reply(context.Background(), nil, "How much does this cost?")

	if !escalate {
		t.Fatal("escalate = false, want true (model called escalate_to_human)")
	}
	if reason != "customer wants pricing details" {
		t.Errorf("reason = %q, want the model's reason", reason)
	}
	if text != handoffMessage() {
		t.Errorf("text = %q, want bilingual handoff message", text)
	}
}

// UT-022: Explicit human request keyword — Thai and English.
func TestEngineReplyExplicitHumanKeyword(t *testing.T) {
	tests := []struct {
		name string
		text string
	}{
		{name: "thai phrase", text: "ขอคุยกับคนได้ไหมคะ"},
		{name: "english phrase", text: "I'd like to talk to a human please"},
		{name: "mixed case english", text: "Can I SPEAK TO A PERSON?"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stub := &stubModelClient{reply: "should not be used"}
			engine := NewEngine(stub, "system prompt")

			text, escalate, reason := engine.Reply(context.Background(), nil, tt.text)

			if !escalate {
				t.Fatal("escalate = false, want true")
			}
			if reason == "" {
				t.Error("reason is empty, want an explanation")
			}
			if text != handoffMessage() {
				t.Errorf("text = %q, want handoff message", text)
			}
			if stub.calls != 0 {
				t.Errorf("model called %d times, want 0 (keyword short-circuits before the model call)", stub.calls)
			}
		})
	}
}

// UT-023: Nil engine — graceful fallback.
func TestEngineReplyNilEngineFallback(t *testing.T) {
	var engine *Engine // unconfigured

	text, escalate, reason := engine.Reply(context.Background(), nil, "What services do you offer?")

	if !escalate {
		t.Fatal("escalate = false, want true (auto-escalate on nil engine)")
	}
	if reason != fallbackReasonAI {
		t.Errorf("reason = %q, want %q", reason, fallbackReasonAI)
	}
	if text != fallbackMessage() {
		t.Errorf("text = %q, want canned bilingual apology", text)
	}
}

// Also cover a nil underlying modelClient (Engine constructed but client unset).
func TestEngineReplyNilModelClientFallback(t *testing.T) {
	engine := NewEngine(nil, "system prompt")

	text, escalate, _ := engine.Reply(context.Background(), nil, "What services do you offer?")

	if !escalate {
		t.Fatal("escalate = false, want true")
	}
	if text != fallbackMessage() {
		t.Errorf("text = %q, want canned bilingual apology", text)
	}
}

// UT-024: Model error — graceful fallback, error logged not propagated.
func TestEngineReplyModelErrorFallback(t *testing.T) {
	stub := &stubModelClient{err: errors.New("vertex unavailable")}
	engine := NewEngine(stub, "system prompt")

	text, escalate, reason := engine.Reply(context.Background(), nil, "What services do you offer?")

	if !escalate {
		t.Fatal("escalate = false, want true (auto-escalate on model error)")
	}
	if reason != fallbackReasonErr {
		t.Errorf("reason = %q, want %q", reason, fallbackReasonErr)
	}
	if text != fallbackMessage() {
		t.Errorf("text = %q, want canned bilingual apology", text)
	}
	// Reply's signature has no error return — compile-time proof the error
	// can never propagate to the caller.
}

// capturingModelClient records the history slice it was called with, to
// verify windowing behavior.
type capturingModelClient struct {
	gotHistory []Turn
}

func (c *capturingModelClient) Generate(_ context.Context, _ string, history []Turn) (string, bool, string, error) {
	c.gotHistory = history
	return "ok", false, "", nil
}

// UT-025: History windowing — only the last 20 turns are sent to the model.
func TestEngineReplyHistoryWindowing(t *testing.T) {
	history := make([]Turn, 30)
	for i := range history {
		history[i] = Turn{Role: TurnRoleUser, Text: "message"}
	}
	history[29] = Turn{Role: TurnRoleUser, Text: "the newest turn"}

	capture := &capturingModelClient{}
	engine := NewEngine(capture, "system prompt")

	_, escalate, _ := engine.Reply(context.Background(), history, "latest question")
	if escalate {
		t.Fatal("escalate = true, want false")
	}

	if len(capture.gotHistory) != historyWindow {
		t.Fatalf("history length sent to model = %d, want %d", len(capture.gotHistory), historyWindow)
	}
	if capture.gotHistory[len(capture.gotHistory)-1].Text != "the newest turn" {
		t.Errorf("last turn = %q, want the most recent message preserved", capture.gotHistory[len(capture.gotHistory)-1].Text)
	}
}

func TestLoadSystemPromptMissingFile(t *testing.T) {
	_, err := LoadSystemPrompt("does-not-exist.md")
	if err == nil {
		t.Fatal("expected error for missing knowledge file")
	}
}
