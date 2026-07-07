package chat

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestHandlerStartConversationInvalidBody(t *testing.T) {
	h := newTestHandler(&MockRepository{})

	req := httptest.NewRequest(http.MethodPost, "/conversations", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-1")
	rr := httptest.NewRecorder()

	h.StartConversation(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
}

func TestHandlerSendMessageInvalidBody(t *testing.T) {
	h := newTestHandler(&MockRepository{})

	req := httptest.NewRequest(http.MethodPost, "/conversations/conv-1/messages", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-1")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("conversationID", "conv-1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.SendMessage(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
}

func TestHandlerSendMessageValidationError(t *testing.T) {
	h := newTestHandler(&MockRepository{})

	body := `{"text":""}`
	req := httptest.NewRequest(http.MethodPost, "/conversations/conv-1/messages", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-1")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("conversationID", "conv-1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.SendMessage(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
}

func TestHandlerSendMessageUnauthorized(t *testing.T) {
	h := newTestHandler(&MockRepository{})

	body := `{"text":"hi"}`
	req := httptest.NewRequest(http.MethodPost, "/conversations/conv-1/messages", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("conversationID", "conv-1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.SendMessage(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rr.Code)
	}
}

func TestHandlerGetCurrentConversationUnauthorized(t *testing.T) {
	h := newTestHandler(&MockRepository{})

	req := httptest.NewRequest(http.MethodGet, "/conversations/current", nil)
	rr := httptest.NewRecorder()

	h.GetCurrentConversation(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rr.Code)
	}
}

func TestHandlerGetCurrentConversationInternalError(t *testing.T) {
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, errRepo
		},
	}
	h := newTestHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/conversations/current", nil)
	req = withAuth(req, "uid-1")
	rr := httptest.NewRecorder()

	h.GetCurrentConversation(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rr.Code)
	}
}

func TestHandlerListMessagesUnauthorized(t *testing.T) {
	h := newTestHandler(&MockRepository{})

	req := httptest.NewRequest(http.MethodGet, "/conversations/conv-1/messages", nil)
	rr := httptest.NewRecorder()

	h.ListMessages(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rr.Code)
	}
}

func TestHandlerListMessagesNotFound(t *testing.T) {
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil
		},
	}
	h := newTestHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/conversations/conv-1/messages", nil)
	req = withAuth(req, "uid-1")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("conversationID", "conv-1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.ListMessages(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rr.Code)
	}
}

func TestHandlerStartConversationWebOfficialWithTurnstileHeaderNilClient(t *testing.T) {
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)
	h := NewHandler(svc, nil) // nil turnstile client -> any non-empty token passes

	body := `{"text":"hello","channel":"web-official"}`
	req := httptest.NewRequest(http.MethodPost, "/conversations", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Turnstile-Token", "some-token")
	req = withAuth(req, "anon-uid")
	rr := httptest.NewRecorder()

	h.StartConversation(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201, body: %s", rr.Code, rr.Body.String())
	}
}

func TestHandleErrorMapsSentinels(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		wantCode int
	}{
		{name: "not found", err: ErrConversationNotFound, wantCode: http.StatusNotFound},
		{name: "message too long", err: ErrMessageTooLong, wantCode: http.StatusBadRequest},
		{name: "invalid transition", err: ErrInvalidTransition, wantCode: http.StatusBadRequest},
		{name: "conversation closed", err: ErrConversationClosed, wantCode: http.StatusBadRequest},
		{name: "rate limited", err: ErrRateLimited, wantCode: http.StatusTooManyRequests},
		{name: "unknown error", err: errors.New("boom"), wantCode: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			rr := httptest.NewRecorder()

			handleError(rr, req, tt.err)

			if rr.Code != tt.wantCode {
				t.Fatalf("status = %d, want %d", rr.Code, tt.wantCode)
			}

			var resp struct {
				Success bool `json:"success"`
			}
			if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if resp.Success {
				t.Error("success = true, want false")
			}
		})
	}
}
