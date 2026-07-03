package analytics

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/sathittham/factory-sync-solutions/apps/backend/pkg"
)

// Handler holds the dependencies for the backoffice analytics HTTP handlers.
type Handler struct {
	service *Service
}

// NewHandler creates a Handler wired to the given Service.
func NewHandler(svc *Service) *Handler {
	return &Handler{service: svc}
}

// Routes registers all analytics routes on the given router (mounted under
// /api/v1/backoffice/analytics by main.go, inside the existing
// RequireBackofficeRole(superadmin, staff) group).
func (h *Handler) Routes(r chi.Router) {
	r.Get("/overview", h.GetOverview)
	r.Get("/top-pages", h.GetTopPages)
	r.Get("/channels", h.GetChannels)
	r.Get("/audience", h.GetAudience)
}

// parseRange reads the `range` query param, defaulting to 28d.
func parseRange(r *http.Request) string {
	rangeParam := r.URL.Query().Get("range")
	if rangeParam == "" {
		return defaultRange
	}
	return rangeParam
}

// GetOverview godoc
// @Summary      GA4 traffic overview
// @Description  Returns traffic totals (active users, sessions, page views, avg engagement time) and a daily series for the selected range
// @Tags         Backoffice Analytics
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        range          query   string  false  "7d, 28d (default), or 90d"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      503  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/analytics/overview [get]
func (h *Handler) GetOverview(w http.ResponseWriter, r *http.Request) {
	overview, err := h.service.GetOverview(r.Context(), parseRange(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, overview)
}

// GetTopPages godoc
// @Summary      GA4 top pages
// @Description  Returns the top 10 page paths by views for the selected range
// @Tags         Backoffice Analytics
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        range          query   string  false  "7d, 28d (default), or 90d"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      503  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/analytics/top-pages [get]
func (h *Handler) GetTopPages(w http.ResponseWriter, r *http.Request) {
	topPages, err := h.service.GetTopPages(r.Context(), parseRange(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, topPages)
}

// GetChannels godoc
// @Summary      GA4 acquisition channels
// @Description  Returns sessions grouped by GA4 default channel group for the selected range
// @Tags         Backoffice Analytics
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        range          query   string  false  "7d, 28d (default), or 90d"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      503  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/analytics/channels [get]
func (h *Handler) GetChannels(w http.ResponseWriter, r *http.Request) {
	channels, err := h.service.GetChannels(r.Context(), parseRange(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, channels)
}

// GetAudience godoc
// @Summary      GA4 audience
// @Description  Returns sessions by top-10 country and by device category for the selected range
// @Tags         Backoffice Analytics
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        range          query   string  false  "7d, 28d (default), or 90d"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      503  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/analytics/audience [get]
func (h *Handler) GetAudience(w http.ResponseWriter, r *http.Request) {
	audience, err := h.service.GetAudience(r.Context(), parseRange(r))
	if err != nil {
		handleError(w, r, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, audience)
}

// handleError maps analytics sentinel errors to the standard error envelope.
// A stale-cache hit is NOT an error — it is handled entirely in service.go
// and returned as a normal 200 payload with stale:true.
func handleError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, ErrInvalidRange):
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "range must be one of: 7d, 28d, 90d")

	// Spec FR-007: upstream failure with no cache → 503; the wrapped error
	// chain preserves the GA4 cause (ErrAnalyticsUpstream et al.) for the log.
	case errors.Is(err, ErrAnalyticsUnavailable):
		slog.Warn("analytics unavailable",
			"error", err.Error(),
			"path", r.URL.Path,
		)
		pkg.RespondError(w, http.StatusServiceUnavailable, "ANALYTICS_UNAVAILABLE", "analytics temporarily unavailable")

	default:
		slog.Error("unexpected error",
			"error", err.Error(),
			"path", r.URL.Path,
			"method", r.Method,
		)
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
	}
}
