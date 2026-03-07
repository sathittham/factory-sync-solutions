package dbd

import (
	"errors"
	"log/slog"
	"net/http"
	"regexp"

	"github.com/go-chi/chi/v5"

	"factory-health-check/apps/api/pkg"
)

var regIDPattern = regexp.MustCompile(`^\d{13}$`)

type Handler struct {
	service *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{service: svc}
}

// Routes registers all DBD routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/{regId}", h.GetCompanyProfile)
}

// GetCompanyProfile godoc
// @Summary      Get company profile from DBD
// @Description  Fetches juristic person data from the Department of Business Development (DBD) OpenAPI by company registration ID
// @Tags         DBD
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        regId          path    string  true   "Company registration ID (13 digits)"
// @Success      200  {object}  map[string]any  "success response with company profile"
// @Failure      400  {object}  map[string]any  "invalid registration ID"
// @Failure      401  {object}  map[string]any  "unauthorized"
// @Failure      404  {object}  map[string]any  "company not found"
// @Failure      502  {object}  map[string]any  "DBD API unavailable"
// @Security     BearerAuth
// @Router       /api/v1/dbd/{regId} [get]
func (h *Handler) GetCompanyProfile(w http.ResponseWriter, r *http.Request) {
	regID := chi.URLParam(r, "regId")
	if !regIDPattern.MatchString(regID) {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "registration ID must be exactly 13 digits")
		return
	}

	profile, err := h.service.GetCompanyProfile(r.Context(), regID)
	if err != nil {
		handleError(w, r, err)
		return
	}

	pkg.RespondJSON(w, http.StatusOK, profile)
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, ErrInvalidRegID):
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())

	case errors.Is(err, ErrCompanyNotFound):
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "company not found for the given registration ID")

	case errors.Is(err, ErrDBDUnavailable):
		pkg.RespondError(w, http.StatusBadGateway, "UPSTREAM_ERROR", "DBD API is currently unavailable")

	default:
		slog.Error("unexpected error",
			"error", err.Error(),
			"path", r.URL.Path,
			"method", r.Method,
		)
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
	}
}
