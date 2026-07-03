package chat

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/sathittham/factory-sync-solutions/apps/backend/middleware"
)

func withAuth(r *http.Request, uid string) *http.Request {
	return middleware.SetTestAuthContext(r, uid, "", "")
}

type apiResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
	Meta    json.RawMessage `json:"meta"`
	Error   *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func decodeResponse(t *testing.T, rr *httptest.ResponseRecorder) apiResponse {
	t.Helper()
	var resp apiResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return resp
}

func newTestHandler(mock *MockRepository) *Handler {
	svc := NewService(mock, engineWithStub("bot reply", false, ""), nil)
	return NewHandler(svc, nil)
}

// IT-001: POST /chat/conversations — valid UID, 201.
func TestHandlerStartConversationSuccess(t *testing.T) {
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil
		},
	}
	h := newTestHandler(mock)

	body := `{"text":"สวัสดี สนใจ health check ค่ะ","locale":"th"}`
	req := httptest.NewRequest(http.MethodPost, "/conversations", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-1")
	rr := httptest.NewRecorder()

	h.StartConversation(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201, body: %s", rr.Code, rr.Body.String())
	}
	resp := decodeResponse(t, rr)
	if !resp.Success {
		t.Fatal("success = false, want true")
	}
	var data struct {
		Conversation Conversation `json:"conversation"`
		Messages     []Message    `json:"messages"`
	}
	if err := json.Unmarshal(resp.Data, &data); err != nil {
		t.Fatalf("decode data: %v", err)
	}
	if data.Conversation.Status != StatusBot {
		t.Errorf("status = %s, want bot", data.Conversation.Status)
	}
	if len(data.Messages) != 2 {
		t.Fatalf("messages len = %d, want 2 (customer + bot)", len(data.Messages))
	}
}

// IT-002: POST /chat/conversations — no token, 401.
func TestHandlerStartConversationUnauthorized(t *testing.T) {
	h := newTestHandler(&MockRepository{})

	body := `{"text":"hello"}`
	req := httptest.NewRequest(http.MethodPost, "/conversations", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	h.StartConversation(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rr.Code)
	}
	resp := decodeResponse(t, rr)
	if resp.Error == nil || resp.Error.Code != "UNAUTHORIZED" {
		t.Fatalf("error = %+v, want UNAUTHORIZED", resp.Error)
	}
}

// IT-003: POST /chat/conversations — empty text, 400 VALIDATION_ERROR.
func TestHandlerStartConversationValidationError(t *testing.T) {
	h := newTestHandler(&MockRepository{})

	body := `{"text":""}`
	req := httptest.NewRequest(http.MethodPost, "/conversations", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-1")
	rr := httptest.NewRecorder()

	h.StartConversation(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
	resp := decodeResponse(t, rr)
	if resp.Error == nil || resp.Error.Code != "VALIDATION_ERROR" {
		t.Fatalf("error = %+v, want VALIDATION_ERROR", resp.Error)
	}
}

// IT-004: GET /chat/conversations/current — open conversation found, 200.
func TestHandlerGetCurrentConversationFound(t *testing.T) {
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, uid string) (*Conversation, error) {
			return &Conversation{ID: "conv-1", UserID: uid, Status: StatusBot}, nil
		},
	}
	h := newTestHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/conversations/current", nil)
	req = withAuth(req, "uid-1")
	rr := httptest.NewRecorder()

	h.GetCurrentConversation(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200, body: %s", rr.Code, rr.Body.String())
	}
}

// IT-004: GET /chat/conversations/current — none open, 404 NOT_FOUND.
func TestHandlerGetCurrentConversationNotFound(t *testing.T) {
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil
		},
	}
	h := newTestHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/conversations/current", nil)
	req = withAuth(req, "uid-1")
	rr := httptest.NewRecorder()

	h.GetCurrentConversation(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rr.Code)
	}
}

// IT-005: POST /chat/conversations/{id}/messages — owner, 201 with reply.
func TestHandlerSendMessageSuccess(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot, Channel: ChannelWebApp}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
	}
	h := newTestHandler(mock)

	body := `{"text":"How do I register?"}`
	req := httptest.NewRequest(http.MethodPost, "/conversations/conv-1/messages", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-1")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("conversationID", "conv-1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.SendMessage(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201, body: %s", rr.Code, rr.Body.String())
	}
	resp := decodeResponse(t, rr)
	var data struct {
		Message *Message `json:"message"`
		Reply   *Message `json:"reply"`
	}
	if err := json.Unmarshal(resp.Data, &data); err != nil {
		t.Fatalf("decode data: %v", err)
	}
	if data.Message == nil {
		t.Fatal("message missing from response")
	}
	if data.Reply == nil || data.Reply.Text != "bot reply" {
		t.Fatalf("reply = %+v, want bot reply", data.Reply)
	}
}

// IT-006: POST .../messages — non-owner UID, 404 NOT_FOUND.
func TestHandlerSendMessageNonOwner(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "owner-uid", Status: StatusBot, Channel: ChannelWebApp}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
	}
	h := newTestHandler(mock)

	body := `{"text":"hello"}`
	req := httptest.NewRequest(http.MethodPost, "/conversations/conv-1/messages", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "intruder")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("conversationID", "conv-1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.SendMessage(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404, body: %s", rr.Code, rr.Body.String())
	}
	resp := decodeResponse(t, rr)
	if resp.Error == nil || resp.Error.Code != "NOT_FOUND" {
		t.Fatalf("error = %+v, want NOT_FOUND", resp.Error)
	}
}

// IT-007: GET .../messages — RespondList shape with nextCursor meta.
func TestHandlerListMessagesSuccess(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1"}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		ListMessagesFunc: func(_ context.Context, _ string, _ string, limit int) ([]Message, string, error) {
			messages := make([]Message, limit)
			for i := range messages {
				messages[i] = Message{ID: "m", Role: RoleCustomer, Text: "hi"}
			}
			return messages, "cursor-123", nil
		},
	}
	h := newTestHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/conversations/conv-1/messages?limit=50", nil)
	req = withAuth(req, "uid-1")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("conversationID", "conv-1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.ListMessages(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200, body: %s", rr.Code, rr.Body.String())
	}
	resp := decodeResponse(t, rr)
	if !resp.Success {
		t.Fatal("success = false, want true")
	}
	var meta struct {
		NextCursor string `json:"nextCursor"`
	}
	if err := json.Unmarshal(resp.Meta, &meta); err != nil {
		t.Fatalf("decode meta: %v", err)
	}
	if meta.NextCursor != "cursor-123" {
		t.Errorf("nextCursor = %q, want cursor-123", meta.NextCursor)
	}
}

// IT-008: POST .../messages — rate limited, 429 RATE_LIMITED.
func TestHandlerSendMessageRateLimited(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot, Channel: ChannelWebApp}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		CountMessagesSinceFunc: func(_ context.Context, _ string, _ string, _ time.Time) (int, error) {
			return 10, nil
		},
	}
	h := newTestHandler(mock)

	body := `{"text":"11th message"}`
	req := httptest.NewRequest(http.MethodPost, "/conversations/conv-1/messages", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-1")

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("conversationID", "conv-1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rr := httptest.NewRecorder()
	h.SendMessage(rr, req)

	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want 429, body: %s", rr.Code, rr.Body.String())
	}
	resp := decodeResponse(t, rr)
	if resp.Error == nil || resp.Error.Code != "RATE_LIMITED" {
		t.Fatalf("error = %+v, want RATE_LIMITED", resp.Error)
	}
}

// Turnstile gate: web-official channel without a token is rejected before
// hitting the service.
func TestHandlerStartConversationWebOfficialRequiresTurnstile(t *testing.T) {
	h := newTestHandler(&MockRepository{})

	body := `{"text":"hello","channel":"web-official"}`
	req := httptest.NewRequest(http.MethodPost, "/conversations", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "anon-uid")
	rr := httptest.NewRecorder()

	h.StartConversation(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 (missing turnstile token)", rr.Code)
	}
}

func TestHandlerRoutes(t *testing.T) {
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, uid string) (*Conversation, error) {
			return &Conversation{ID: "conv-1", UserID: uid, Status: StatusBot}, nil
		},
	}
	h := newTestHandler(mock)

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			req = middleware.SetTestAuthContext(req, "uid-1", "", "")
			next.ServeHTTP(w, req)
		})
	})
	r.Route("/chat", h.Routes)

	req := httptest.NewRequest(http.MethodGet, "/chat/conversations/current", nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200, body: %s", rr.Code, rr.Body.String())
	}
}
