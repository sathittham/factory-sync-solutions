package chat

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/sathittham/factory-sync-solutions/apps/backend/middleware"
	"github.com/sathittham/factory-sync-solutions/apps/backend/pkg"
)

const defaultListLimit = 50

// Handler exposes the Phase-1 customer-facing chat endpoints (SDD §3.1.1).
// Backoffice and webhook routes are out of scope until Phases 2/4/5.
type Handler struct {
	service   *Service
	turnstile *pkg.TurnstileClient
}

// NewHandler builds the chat Handler. turnstile may be nil (Turnstile
// verification is then skipped, e.g. local dev without a configured secret).
func NewHandler(service *Service, turnstile *pkg.TurnstileClient) *Handler {
	return &Handler{service: service, turnstile: turnstile}
}

// Routes registers the Phase-1 customer chat routes on the given router.
// Mounted inside the authenticated group in main.go: r.Route("/chat", h.Routes).
func (h *Handler) Routes(r chi.Router) {
	r.Post("/conversations", h.StartConversation)
	r.Get("/conversations/current", h.GetCurrentConversation)
	r.Post("/conversations/{conversationID}/messages", h.SendMessage)
	r.Get("/conversations/{conversationID}/messages", h.ListMessages)
}

// StartConversation godoc
// @Summary      Start a chat conversation
// @Description  Creates (or reuses the caller's open) conversation and stores the first message. web-official callers must also send X-Turnstile-Token.
// @Tags         Chat
// @Accept       json
// @Produce      json
// @Param        Authorization      header  string                     true   "Bearer {firebase-id-token}"
// @Param        X-Turnstile-Token  header  string                     false  "Required when channel=web-official"
// @Param        request            body    StartConversationRequest   true   "First message"
// @Success      201  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /chat/conversations [post]
func (h *Handler) StartConversation(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	if uid == "" {
		pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	var req StartConversationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}
	if err := pkg.Validate.Struct(req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	channel := req.Channel
	if channel == "" {
		channel = ChannelWebApp
	}

	if channel == ChannelWebOfficial {
		if !h.verifyTurnstile(r) {
			pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "turnstile verification required for web-official")
			return
		}
	}

	conv, customerMsg, botMsg, err := h.service.StartConversation(r.Context(), uid, channel, req.Locale, req.Text)
	if err != nil {
		handleError(w, r, err)
		return
	}

	pkg.RespondJSON(w, http.StatusCreated, map[string]any{
		"conversation": conv,
		"messages":     conversationMessages(customerMsg, botMsg),
	})
}

// GetCurrentConversation godoc
// @Summary      Get the caller's open conversation
// @Description  Returns the authenticated user's open (non-closed) conversation, if any
// @Tags         Chat
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /chat/conversations/current [get]
func (h *Handler) GetCurrentConversation(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	if uid == "" {
		pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	conv, err := h.service.GetOpenConversationByUID(r.Context(), uid)
	if err != nil {
		handleError(w, r, err)
		return
	}
	if conv == nil {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "no open conversation")
		return
	}
	pkg.RespondJSON(w, http.StatusOK, conv)
}

// SendMessage godoc
// @Summary      Send a chat message
// @Description  Stores a customer message on an owned conversation; returns an AI reply while status is "bot"
// @Tags         Chat
// @Accept       json
// @Produce      json
// @Param        Authorization   header  string              true  "Bearer {firebase-id-token}"
// @Param        conversationID  path    string              true  "Conversation ID"
// @Param        request         body    SendMessageRequest  true  "Message text"
// @Success      201  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Failure      429  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /chat/conversations/{conversationID}/messages [post]
func (h *Handler) SendMessage(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	if uid == "" {
		pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	conversationID := chi.URLParam(r, "conversationID")

	var req SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}
	if err := pkg.Validate.Struct(req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	conv, customerMsg, botMsg, err := h.service.SendCustomerMessage(r.Context(), uid, conversationID, req.Text)
	if err != nil {
		handleError(w, r, err)
		return
	}

	pkg.RespondJSON(w, http.StatusCreated, map[string]any{
		"message":        customerMsg,
		"reply":          botMsg,
		"conversationID": conv.ID,
	})
}

// ListMessages godoc
// @Summary      List conversation messages
// @Description  Returns a customer's own conversation history in chronological order, cursor-paginated
// @Tags         Chat
// @Produce      json
// @Param        Authorization   header  string  true   "Bearer {firebase-id-token}"
// @Param        conversationID  path    string  true   "Conversation ID"
// @Param        after           query   string  false  "Cursor: last message ID seen"
// @Param        limit           query   int     false  "Page size (default 50)"
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /chat/conversations/{conversationID}/messages [get]
func (h *Handler) ListMessages(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	if uid == "" {
		pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	conversationID := chi.URLParam(r, "conversationID")
	cursor := r.URL.Query().Get("after")
	limit := defaultListLimit
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			limit = n
		}
	}

	messages, nextCursor, err := h.service.ListMessages(r.Context(), uid, conversationID, cursor, limit)
	if err != nil {
		handleError(w, r, err)
		return
	}

	pkg.RespondListMeta(w, messages, len(messages), map[string]any{"nextCursor": nextCursor})
}

func (h *Handler) verifyTurnstile(r *http.Request) bool {
	token := r.Header.Get("X-Turnstile-Token")
	if token == "" {
		return false
	}
	if h.turnstile == nil {
		return true
	}
	ok, err := h.turnstile.Verify(r.Context(), token)
	if err != nil {
		slog.Error("chat turnstile verification failed", "error", err.Error())
		return false
	}
	return ok
}

func conversationMessages(customerMsg, botMsg *Message) []Message {
	messages := []Message{*customerMsg}
	if botMsg != nil {
		messages = append(messages, *botMsg)
	}
	return messages
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, ErrConversationNotFound):
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "conversation not found")
	case errors.Is(err, ErrMessageTooLong):
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
	case errors.Is(err, ErrInvalidTransition):
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
	case errors.Is(err, ErrConversationClosed):
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
	case errors.Is(err, ErrRateLimited):
		pkg.RespondError(w, http.StatusTooManyRequests, "RATE_LIMITED", err.Error())
	default:
		slog.Error("unexpected chat error",
			"error", err.Error(),
			"path", r.URL.Path,
			"method", r.Method,
		)
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
	}
}
