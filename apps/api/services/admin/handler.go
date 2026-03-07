package admin

import (
	"encoding/csv"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"factory-health-check/apps/api/pkg"
	"factory-health-check/apps/api/services/profile"
	"factory-health-check/apps/api/services/result"
)

type Handler struct {
	resultSvc  *result.Service
	profileSvc *profile.Service
}

func NewHandler(resultSvc *result.Service, profileSvc *profile.Service) *Handler {
	return &Handler{resultSvc: resultSvc, profileSvc: profileSvc}
}

// Routes registers all admin routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/assessments", h.ListAssessments)
	r.Get("/assessments/{assessmentId}", h.GetAssessment)
	r.Get("/export", h.ExportCSV)
}

// ListAssessments godoc
// @Summary      List all assessments
// @Description  Admin endpoint to list assessments with optional filters
// @Tags         Admin
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        limit          query   int     false  "Max results (default 100)"
// @Success      200  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Failure      403  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/admin/assessments [get]
func (h *Handler) ListAssessments(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	filters := map[string]string{}
	results, err := h.resultSvc.ListResults(r.Context(), filters, limit)
	if err != nil {
		slog.Error("list assessments failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
		return
	}
	if results == nil {
		results = []result.Assessment{}
	}
	pkg.RespondList(w, results, len(results))
}

// GetAssessment godoc
// @Summary      Get assessment detail
// @Description  Admin endpoint to get a specific assessment by ID
// @Tags         Admin
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        assessmentId   path    string  true  "Assessment ID (UUIDv4)"
// @Success      200  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Failure      403  {object}  map[string]any
// @Failure      404  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/admin/assessments/{assessmentId} [get]
func (h *Handler) GetAssessment(w http.ResponseWriter, r *http.Request) {
	assessmentID := chi.URLParam(r, "assessmentId")

	// Admin can view any assessment — no UID scoping
	results, err := h.resultSvc.ListResults(r.Context(), nil, 0)
	if err != nil {
		slog.Error("get assessment failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
		return
	}

	for _, a := range results {
		if a.ID == assessmentID {
			pkg.RespondJSON(w, http.StatusOK, a)
			return
		}
	}
	pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "assessment not found")
}

// ExportCSV godoc
// @Summary      Export assessments as CSV
// @Description  Admin endpoint to download all assessments as a CSV file
// @Tags         Admin
// @Produce      text/csv
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {file}    csv
// @Failure      401  {object}  map[string]any
// @Failure      403  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/admin/export [get]
func (h *Handler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	results, err := h.resultSvc.ListResults(r.Context(), nil, 0)
	if err != nil {
		slog.Error("export csv failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=assessments.csv")

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Header row
	writer.Write([]string{"ID", "UID", "Overall Score", "Diagnosis", "Submitted At"})

	for _, a := range results {
		writer.Write([]string{
			a.ID,
			a.UID,
			fmt.Sprintf("%.2f", a.OverallScore),
			a.Diagnosis,
			a.SubmittedAt,
		})
	}

}
