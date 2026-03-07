package result

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/sathittham/factory-health-check/apps/api/middleware"
	"github.com/sathittham/factory-health-check/apps/api/pkg"
)

type Handler struct {
	service *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{service: svc}
}

// Routes registers all result routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/", h.GetUserResults)
	r.Get("/{assessmentId}", h.GetResult)
}

// GetUserResults godoc
// @Summary      Get user's assessment results
// @Description  Returns all assessments for the authenticated user
// @Tags         Results
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/results [get]
func (h *Handler) GetUserResults(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)

	results, err := h.service.GetUserResults(r.Context(), uid)
	if err != nil {
		handleError(w, r, err)
		return
	}
	if results == nil {
		results = []Assessment{}
	}
	pkg.RespondList(w, results, len(results))
}

// GetResult godoc
// @Summary      Get specific assessment result
// @Description  Returns a specific assessment by ID (scoped to authenticated user)
// @Tags         Results
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        assessmentId   path    string  true  "Assessment ID (UUIDv4)"
// @Success      200  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Failure      404  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/results/{assessmentId} [get]
func (h *Handler) GetResult(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	assessmentID := chi.URLParam(r, "assessmentId")

	assessment, err := h.service.GetResult(r.Context(), uid, assessmentID)
	if err != nil {
		handleError(w, r, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, assessment)
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, ErrResultNotFound):
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	default:
		slog.Error("unexpected error",
			"error", err.Error(),
			"path", r.URL.Path,
			"method", r.Method,
		)
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
	}
}
