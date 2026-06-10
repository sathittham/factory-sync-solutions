package admin

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"

	firebaseAuth "firebase.google.com/go/v4/auth"
	"github.com/go-chi/chi/v5"

	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/middleware"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/pkg"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/audit"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/profile"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/result"
)

const (
	maxAssessmentLimit = 500
	maxUserLimit       = 500
	maxExportRows      = 10000
)

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func parseLimit(raw string, defaultVal, maxVal int) int {
	if raw == "" {
		return defaultVal
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed < 1 {
		return defaultVal
	}
	if parsed > maxVal {
		return maxVal
	}
	return parsed
}

const msgInternalError = "internal error"

type Handler struct {
	resultSvc   *result.Service
	profileSvc  *profile.Service
	authClient  *firebaseAuth.Client
	auditLogger *audit.Logger
}

func NewHandler(resultSvc *result.Service, profileSvc *profile.Service, authClient *firebaseAuth.Client, auditLogger *audit.Logger) *Handler {
	return &Handler{resultSvc: resultSvc, profileSvc: profileSvc, authClient: authClient, auditLogger: auditLogger}
}

// Routes registers all admin routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/assessments", h.ListAssessments)
	r.Get("/assessments/{assessmentId}", h.GetAssessment)
	r.Get("/export", h.ExportCSV)
	r.Get("/users", h.ListUsers)
	r.Put("/users/{uid}/role", h.SetUserRole)
}

// enrichedAssessment extends Assessment with profile data for admin views.
type enrichedAssessment struct {
	result.Assessment
	CompanyName  string `json:"companyName"`
	IndustryType string `json:"industryType"`
	CompanySize  string `json:"companySize"`
	ContactName  string `json:"contactName"`
	ContactEmail string `json:"contactEmail"`
}

// collectUIDs extracts unique UIDs from assessments.
func collectUIDs(assessments []result.Assessment) []string {
	seen := make(map[string]bool)
	var uids []string
	for _, a := range assessments {
		if !seen[a.UID] {
			seen[a.UID] = true
			uids = append(uids, a.UID)
		}
	}
	return uids
}

// enrichAssessments joins profile data to assessments.
func (h *Handler) enrichAssessments(r *http.Request, assessments []result.Assessment) []enrichedAssessment {
	uids := collectUIDs(assessments)
	slog.Info("enriching assessments", "assessmentCount", len(assessments), "uniqueUIDs", len(uids), "uids", uids)

	profiles, err := h.profileSvc.GetProfilesByUIDs(r.Context(), uids)
	if err != nil {
		slog.Error("failed to load profiles for admin view", "error", err.Error())
		profiles = map[string]*profile.Profile{}
	}
	slog.Info("profiles loaded", "profileCount", len(profiles))

	enriched := make([]enrichedAssessment, len(assessments))
	for i, a := range assessments {
		enriched[i] = enrichedAssessment{Assessment: a}
		if p, ok := profiles[a.UID]; ok {
			enriched[i].CompanyName = p.CompanyName
			enriched[i].IndustryType = p.IndustryType
			enriched[i].CompanySize = p.CompanySize
			enriched[i].ContactName = p.ContactName
			enriched[i].ContactEmail = p.ContactEmail
		}
	}
	return enriched
}

// ListAssessments godoc
// @Summary      List all assessments
// @Description  Admin endpoint to list assessments with optional filters
// @Tags         Admin
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        limit          query   int     false  "Max results (default 100, max 500)"
// @Success      200  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Failure      403  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/admin/assessments [get]
func (h *Handler) ListAssessments(w http.ResponseWriter, r *http.Request) {
	limit := parseLimit(r.URL.Query().Get("limit"), 100, maxAssessmentLimit)
	industryType := r.URL.Query().Get("industryType")
	companySize := r.URL.Query().Get("companySize")

	// assessment-native filters are pushed to Firestore; profile-based filters
	// (industryType, companySize) are applied in-memory after enrichment.
	filters := map[string]string{}
	if v := r.URL.Query().Get("industryType"); v != "" {
		filters["industryType"] = v
	}
	if v := r.URL.Query().Get("companySize"); v != "" {
		filters["companySize"] = v
	}

	results, err := h.resultSvc.ListResults(r.Context(), filters, 0)
	if err != nil {
		slog.Error("list assessments failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	if results == nil {
		results = []result.Assessment{}
	}

	enriched := h.enrichAssessments(r, results)

	// Post-enrichment in-memory filtering on profile fields.
	if industryType != "" {
		filtered := enriched[:0]
		for _, e := range enriched {
			if e.IndustryType == industryType {
				filtered = append(filtered, e)
			}
		}
		enriched = filtered
	}
	if companySize != "" {
		filtered := enriched[:0]
		for _, e := range enriched {
			if e.CompanySize == companySize {
				filtered = append(filtered, e)
			}
		}
		enriched = filtered
	}

	// Apply the limit cap after filtering.
	if limit > 0 && len(enriched) > limit {
		enriched = enriched[:limit]
	}

	pkg.RespondList(w, enriched, len(enriched))
}

// GetAssessment godoc
// @Summary      Get assessment detail
// @Description  Admin endpoint to get a specific assessment by ID, enriched with company profile
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
	if !uuidPattern.MatchString(assessmentID) {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid assessment ID format")
		return
	}

	// Admin can view any assessment — no UID scoping; direct Firestore fetch avoids O(n) scan
	a, err := h.resultSvc.GetResultByID(r.Context(), assessmentID)
	if errors.Is(err, result.ErrResultNotFound) {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "assessment not found")
		return
	}
	if err != nil {
		slog.Error("get assessment failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	enriched := h.enrichAssessments(r, []result.Assessment{*a})
	pkg.RespondJSON(w, http.StatusOK, enriched[0])
}

// ExportCSV godoc
// @Summary      Export assessments as CSV
// @Description  Admin endpoint to download all assessments as a CSV file with company data
// @Tags         Admin
// @Produce      text/csv
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {file}    csv
// @Failure      401  {object}  map[string]any
// @Failure      403  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/admin/export [get]
func (h *Handler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	results, err := h.resultSvc.ListResults(r.Context(), nil, maxExportRows)
	if err != nil {
		slog.Error("export csv failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	enriched := h.enrichAssessments(r, results)

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=assessments.csv")

	writer := csv.NewWriter(w)
	defer writer.Flush()

	// Header row
	writer.Write([]string{
		"ID", "UID", "Company Name", "Industry Type", "Company Size",
		"Contact Name", "Contact Email", "Overall Score", "Diagnosis", "Submitted At",
	})

	for _, a := range enriched {
		writer.Write([]string{
			a.ID,
			a.UID,
			a.CompanyName,
			a.IndustryType,
			a.CompanySize,
			a.ContactName,
			a.ContactEmail,
			fmt.Sprintf("%.2f", a.OverallScore),
			a.Diagnosis,
			a.SubmittedAt,
		})
	}

	h.auditLogger.Log(r.Context(), middleware.GetUID(r), audit.EventAdminExport,
		"export", "assessments.csv",
		map[string]any{"count": len(enriched)})
}

// ListUsers godoc
// @Summary      List all users
// @Description  Admin endpoint to list registered user profiles with optional limit
// @Tags         Admin
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        limit          query   int     false  "Max results (default 200, max 500)"
// @Success      200  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Failure      403  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/admin/users [get]
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	limit := parseLimit(r.URL.Query().Get("limit"), 200, maxUserLimit)

	profiles, err := h.profileSvc.ListProfiles(r.Context(), limit)
	if err != nil {
		slog.Error("list users failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	if profiles == nil {
		profiles = []*profile.Profile{}
	}
	pkg.RespondList(w, profiles, len(profiles))
}

// setRoleRequest is the payload for role changes.
type setRoleRequest struct {
	Role string `json:"role"`
}

// SetUserRole godoc
// @Summary      Set user role
// @Description  Admin endpoint to update a user's role (admin or user) in Firestore and Firebase custom claims
// @Tags         Admin
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string          true  "Bearer {firebase-id-token}"
// @Param        uid            path    string          true  "Firebase UID"
// @Param        body           body    setRoleRequest  true  "Role payload"
// @Success      200  {object}  map[string]string
// @Failure      400  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Failure      403  {object}  map[string]any
// @Failure      500  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/admin/users/{uid}/role [put]
func (h *Handler) SetUserRole(w http.ResponseWriter, r *http.Request) {
	uid := chi.URLParam(r, "uid")
	if uid == "" || len(uid) > 128 {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid uid")
		return
	}

	var req setRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}
	if req.Role != "admin" && req.Role != "user" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "role must be 'admin' or 'user'")
		return
	}

	// Update Firebase custom claims first (authoritative source for RequireAdmin middleware)
	claims := map[string]any{"role": req.Role}
	if err := h.authClient.SetCustomUserClaims(r.Context(), uid, claims); err != nil {
		slog.Error("set firebase custom claims failed", "uid", uid, "role", req.Role, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	// Mirror role to Firestore profile (Firebase claims already updated — safer failure mode)
	if err := h.profileSvc.SetRole(r.Context(), uid, req.Role); err != nil {
		slog.Error("set role in firestore failed", "uid", uid, "role", req.Role, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	slog.Info("user role updated", "uid", uid, "role", req.Role)
	pkg.RespondJSON(w, http.StatusOK, map[string]string{"uid": uid, "role": req.Role})
}
