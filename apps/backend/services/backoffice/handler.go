package backoffice

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"maps"
	"net/http"
	"net/mail"
	"os"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	firebaseAuth "firebase.google.com/go/v4/auth"
	"github.com/go-chi/chi/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/sathittham/factory-sync-solutions/apps/backend/middleware"
	"github.com/sathittham/factory-sync-solutions/apps/backend/pkg"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/audit"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/notification"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/profile"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/result"
)

const (
	maxBackofficeExportRows = 10000
	defaultUserLimit        = 200
	maxUserListLimit        = 500
	maxProjectLimit         = 500
	maxResultLimit          = 500
	maxStaffScanLimit       = 1000
)

const msgInternalError = "internal error"

var validCustomerRoles = map[string]bool{
	"admin": true, "user": true, "owner": true, "system_admin": true, "manager": true, "general_user": true,
}

// fetchPhotoURLs returns a uid-to-photoURL map via Firebase Auth batch lookup.
func fetchPhotoURLs(ctx context.Context, authClient *firebaseAuth.Client, uids []string) map[string]string {
	photos := make(map[string]string, len(uids))
	const chunkSize = 100
	for i := 0; i < len(uids); i += chunkSize {
		end := min(i+chunkSize, len(uids))
		chunk := uids[i:end]
		ids := make([]firebaseAuth.UserIdentifier, len(chunk))
		for j, uid := range chunk {
			ids[j] = firebaseAuth.UIDIdentifier{UID: uid}
		}
		result, err := authClient.GetUsers(ctx, ids)
		if err != nil {
			slog.Error("backoffice: fetch photo urls failed", "error", err.Error())
			continue
		}
		for _, u := range result.Users {
			if u.PhotoURL != "" {
				photos[u.UID] = u.PhotoURL
			}
		}
	}
	return photos
}

// Handler holds the dependencies for all backoffice HTTP handlers.
type Handler struct {
	resultSvc       *result.Service
	profileSvc      *profile.Service
	authClient      *firebaseAuth.Client
	firestoreClient *firestore.Client
	auditLogger     *audit.Logger
	notifSvc        *notification.Service
	apiDocsSvc      *APIDocsService

	requireSuperAdminCheck func(http.ResponseWriter, *http.Request) bool
}

// NewHandler creates a Handler wired to the given services and clients.
func NewHandler(resultSvc *result.Service, profileSvc *profile.Service, authClient *firebaseAuth.Client, firestoreClient *firestore.Client, auditLogger *audit.Logger, notifSvc *notification.Service) *Handler {
	return &Handler{
		resultSvc:       resultSvc,
		profileSvc:      profileSvc,
		authClient:      authClient,
		firestoreClient: firestoreClient,
		auditLogger:     auditLogger,
		notifSvc:        notifSvc,
		apiDocsSvc:      NewAPIDocsServiceFromEnv(),
	}
}

// Routes registers all backoffice routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/stats", h.GetStats)

	// Projects
	r.Get("/projects", h.ListProjects)
	r.Post("/projects", h.CreateProject)
	r.Get("/projects/{projectID}", h.GetProject)
	r.Put("/projects/{projectID}", h.UpdateProject)
	r.Post("/projects/{projectID}/deactivate", h.DeactivateProject)
	r.Post("/projects/{projectID}/reactivate", h.ReactivateProject)
	r.Get("/projects/{projectID}/members", h.ListMembers)
	r.Post("/projects/{projectID}/invite-owner", h.InviteOwner)
	r.Put("/projects/{projectID}/members/{uid}/role", h.ChangeMemberRole)
	r.Delete("/projects/{projectID}/members/{uid}", h.RemoveMember)

	// Users
	r.Get("/users", h.ListUsers)
	r.Get("/users/{uid}", h.GetUser)
	r.Get("/users/{uid}/activity", h.GetUserActivity)
	r.Put("/users/{uid}/role", h.SetUserRole)
	r.Delete("/users/{uid}", h.DeleteUser)

	// Results
	r.Get("/results", h.ListResults)
	r.Get("/results/{assessmentID}", h.GetResult)
	r.Get("/export", h.ExportCSV)

	// Staff management
	r.Get("/staff", h.ListStaff)
	r.Post("/staff/invitations", h.InviteStaff)
	r.Put("/staff/{uid}", h.SetStaffRole)
	r.Delete("/staff/{uid}", h.RevokeStaffRole)

	// Audit
	r.Get("/audit", h.ListAudit)

	// API docs (superadmin only)
	r.Get("/api-docs/versions", h.ListAPIDocsVersions)
	r.Get("/api-docs/{apiVersion}/metadata", h.GetAPIDocsMetadata)
	r.Get("/api-docs/{apiVersion}/openapi.json", h.GetAPIDocsJSON)
	r.Get("/api-docs/{apiVersion}/openapi.yaml", h.GetAPIDocsYAML)
}

// requireSuperAdmin checks that the authenticated caller has backofficeRole == "superadmin".
// Returns false and writes the error response when the check fails.
func (h *Handler) requireSuperAdmin(w http.ResponseWriter, r *http.Request) bool {
	if h.requireSuperAdminCheck != nil {
		return h.requireSuperAdminCheck(w, r)
	}

	uid := middleware.GetUID(r)
	user, err := h.authClient.GetUser(r.Context(), uid)
	if err != nil {
		pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", "access denied")
		return false
	}
	if role, _ := user.CustomClaims["backofficeRole"].(string); role != "superadmin" {
		pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", "superadmin access required")
		return false
	}
	return true
}

func (h *Handler) logAudit(r *http.Request, eventType audit.EventType, resourceType, resourceID string, metadata map[string]any, details audit.EventDetails) {
	if h.auditLogger == nil {
		return
	}
	if details.ActorEmail == "" {
		details.ActorEmail = middleware.GetEmail(r)
	}
	if details.ActorName == "" {
		details.ActorName = middleware.GetDisplayName(r)
	}
	h.auditLogger.LogWithDetails(r.Context(), middleware.GetUID(r), eventType, resourceType, resourceID, metadata, details)
}

func auditQueryFilter(r *http.Request, defaultLimit, maxLimit int) audit.QueryFilter {
	q := r.URL.Query()
	return audit.QueryFilter{
		ActorUID:     q.Get("actorUID"),
		TargetUID:    q.Get("targetUID"),
		ProjectID:    q.Get("projectID"),
		EventType:    q.Get("eventType"),
		ResourceType: q.Get("resourceType"),
		Before:       q.Get("before"),
		Limit:        parseLimit(q.Get("limit"), defaultLimit, maxLimit),
	}
}

// parseLimit parses a query-string integer, returning defaultVal when absent
// and capping at maxVal.
func parseLimit(raw string, defaultVal, maxVal int) int {
	if raw == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 {
		return defaultVal
	}
	if n > maxVal {
		return maxVal
	}
	return n
}

// enrichAssessments joins profile data to a slice of assessments.
func (h *Handler) enrichAssessments(r *http.Request, assessments []result.Assessment) []EnrichedAssessment {
	// Collect unique UIDs
	seen := make(map[string]bool)
	var uids []string
	for _, a := range assessments {
		if !seen[a.UID] {
			seen[a.UID] = true
			uids = append(uids, a.UID)
		}
	}

	profiles, err := h.profileSvc.GetProfilesByUIDs(r.Context(), uids)
	if err != nil {
		slog.Error("backoffice: failed to load profiles for enrichment", "error", err.Error())
		profiles = map[string]*profile.Profile{}
	}

	enriched := make([]EnrichedAssessment, len(assessments))
	for i, a := range assessments {
		enriched[i] = EnrichedAssessment{Assessment: a}
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

// GetStats godoc
// @Summary      Dashboard statistics
// @Description  Returns aggregate counts and averages for the backoffice dashboard
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/stats [get]
func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Count projects
	projectDocs, err := h.firestoreClient.Collection("projects").Documents(ctx).GetAll()
	if err != nil {
		slog.Error("backoffice: count projects failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	// Count users
	profiles, err := h.profileSvc.ListProfiles(ctx, 0)
	if err != nil {
		slog.Error("backoffice: count users failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	// Compute average score from recent results
	results, err := h.resultSvc.ListResults(ctx, nil, 500)
	if err != nil {
		slog.Error("backoffice: list results for avg score failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	var total float64
	for _, res := range results {
		total += res.OverallScore
	}
	var avgScore float64
	if len(results) > 0 {
		avgScore = total / float64(len(results))
	}

	stats := BackofficeStats{
		TotalProjects: len(projectDocs),
		TotalUsers:    len(profiles),
		AvgScore:      avgScore,
		StaffCount:    0, // Firebase ListUsers is expensive; deferred
	}
	pkg.RespondJSON(w, http.StatusOK, stats)
}

// ListProjects godoc
// @Summary      List projects
// @Description  Returns all projects with optional isActive filter
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        isActive       query   string  false  "Filter by active status (true/false)"
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/projects [get]
func (h *Handler) ListProjects(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := h.firestoreClient.Collection("projects").
		OrderBy("createdAt", firestore.Desc).
		Limit(maxProjectLimit)

	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		slog.Error("backoffice: list projects failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	projects := make([]Project, 0, len(docs))
	for _, doc := range docs {
		var p Project
		if err := doc.DataTo(&p); err != nil {
			slog.Error("backoffice: decode project failed", "docID", doc.Ref.ID, "error", err.Error())
			continue
		}
		projects = append(projects, p)
	}

	// Optional in-memory filter on isActive (Firestore bool index not guaranteed)
	if raw := r.URL.Query().Get("isActive"); raw != "" {
		want := raw == "true"
		filtered := projects[:0]
		for _, p := range projects {
			if p.IsActive == want {
				filtered = append(filtered, p)
			}
		}
		projects = filtered
	}

	pkg.RespondList(w, projects, len(projects))
}

// CreateProject godoc
// @Summary      Create project
// @Description  Creates a new project; projectID equals companyRegId (ADR-017)
// @Tags         Backoffice
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string               true  "Bearer {firebase-id-token}"
// @Param        body           body    CreateProjectRequest true  "Project payload"
// @Success      201  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      409  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/projects [post]
func (h *Handler) CreateProject(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}

	if req.Name == "" || req.CompanyRegID == "" || req.IndustryType == "" || req.CompanySize == "" {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "name, companyRegId, industryType, and companySize are required")
		return
	}
	if req.CompanySize != "small" && req.CompanySize != "medium" && req.CompanySize != "large" {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "companySize must be small, medium, or large")
		return
	}

	// projectID == companyRegId per ADR-017
	projectID := req.CompanyRegID

	// Check for duplicate
	existing, err := h.firestoreClient.Collection("projects").Doc(projectID).Get(ctx)
	if err != nil && status.Code(err) != codes.NotFound {
		slog.Error("backoffice: check existing project failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	if existing != nil && existing.Exists() {
		pkg.RespondError(w, http.StatusConflict, "CONFLICT", "project with this company registration ID already exists")
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	project := Project{
		ProjectID:    projectID,
		Name:         req.Name,
		CompanyRegID: req.CompanyRegID,
		IndustryType: req.IndustryType,
		CompanySize:  req.CompanySize,
		OwnerUID:     "", // set separately via invite
		MemberCount:  0,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if _, err := h.firestoreClient.Collection("projects").Doc(projectID).Set(ctx, project); err != nil {
		slog.Error("backoffice: create project failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	metadata := map[string]any{
		"projectName":  project.Name,
		"industryType": project.IndustryType,
		"companySize":  project.CompanySize,
	}
	details := audit.EventDetails{ProjectID: projectID}
	h.logAudit(r, audit.EventProjectCreated, "project", projectID, metadata, details)
	h.logAudit(r, audit.EventBackofficeProjectCreated, "project", projectID, metadata, details)
	pkg.RespondJSON(w, http.StatusCreated, project)
}

// GetProject godoc
// @Summary      Get project
// @Description  Returns a single project by ID
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        projectID      path    string  true  "Project ID"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/projects/{projectID} [get]
func (h *Handler) GetProject(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")
	if projectID == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "projectID is required")
		return
	}

	doc, err := h.firestoreClient.Collection("projects").Doc(projectID).Get(r.Context())
	if status.Code(err) == codes.NotFound {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "project not found")
		return
	}
	if err != nil {
		slog.Error("backoffice: get project failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	var project Project
	if err := doc.DataTo(&project); err != nil {
		slog.Error("backoffice: decode project failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	pkg.RespondJSON(w, http.StatusOK, project)
}

// UpdateProject godoc
// @Summary      Update project
// @Description  Updates mutable fields on a project
// @Tags         Backoffice
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string               true  "Bearer {firebase-id-token}"
// @Param        projectID      path    string               true  "Project ID"
// @Param        body           body    UpdateProjectRequest true  "Update payload"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/projects/{projectID} [put]
func (h *Handler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	projectID := chi.URLParam(r, "projectID")
	if projectID == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "projectID is required")
		return
	}

	var req UpdateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}

	if req.CompanySize != "" && req.CompanySize != "small" && req.CompanySize != "medium" && req.CompanySize != "large" {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "companySize must be small, medium, or large")
		return
	}

	// Verify project exists
	doc, err := h.firestoreClient.Collection("projects").Doc(projectID).Get(ctx)
	if status.Code(err) == codes.NotFound {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "project not found")
		return
	}
	if err != nil {
		slog.Error("backoffice: get project for update failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	var project Project
	if err := doc.DataTo(&project); err != nil {
		slog.Error("backoffice: decode project for update failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	var updates []firestore.Update
	changes := map[string]any{}

	if req.Name != "" {
		changes["name"] = map[string]string{"old": project.Name, "new": req.Name}
		updates = append(updates, firestore.Update{Path: "name", Value: req.Name})
		project.Name = req.Name
	}
	if req.IndustryType != "" {
		changes["industryType"] = map[string]string{"old": project.IndustryType, "new": req.IndustryType}
		updates = append(updates, firestore.Update{Path: "industryType", Value: req.IndustryType})
		project.IndustryType = req.IndustryType
	}
	if req.CompanySize != "" {
		changes["companySize"] = map[string]string{"old": project.CompanySize, "new": req.CompanySize}
		updates = append(updates, firestore.Update{Path: "companySize", Value: req.CompanySize})
		project.CompanySize = req.CompanySize
	}

	if len(updates) == 0 {
		pkg.RespondJSON(w, http.StatusOK, project)
		return
	}

	updates = append(updates, firestore.Update{Path: "updatedAt", Value: now})
	project.UpdatedAt = now

	if _, err := h.firestoreClient.Collection("projects").Doc(projectID).Update(ctx, updates); err != nil {
		slog.Error("backoffice: update project failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	metadata := map[string]any{"changes": changes}
	details := audit.EventDetails{ProjectID: projectID}
	h.logAudit(r, audit.EventProjectSettingsUpdated, "project", projectID, metadata, details)
	h.logAudit(r, audit.EventBackofficeProjectUpdated, "project", projectID, metadata, details)
	pkg.RespondJSON(w, http.StatusOK, project)
}

// DeactivateProject godoc
// @Summary      Deactivate project
// @Description  Sets isActive=false on a project; requires superadmin
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        projectID      path    string  true  "Project ID"
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/projects/{projectID}/deactivate [post]
func (h *Handler) DeactivateProject(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}
	h.setProjectActive(w, r, false)
}

// ReactivateProject godoc
// @Summary      Reactivate project
// @Description  Sets isActive=true on a project; requires superadmin
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        projectID      path    string  true  "Project ID"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/projects/{projectID}/reactivate [post]
func (h *Handler) ReactivateProject(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}
	h.setProjectActive(w, r, true)
}

// setProjectActive is the shared implementation for Deactivate/Reactivate.
func (h *Handler) setProjectActive(w http.ResponseWriter, r *http.Request, active bool) {
	ctx := r.Context()
	projectID := chi.URLParam(r, "projectID")
	if projectID == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "projectID is required")
		return
	}

	doc, err := h.firestoreClient.Collection("projects").Doc(projectID).Get(ctx)
	if status.Code(err) == codes.NotFound {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "project not found")
		return
	}
	if err != nil {
		slog.Error("backoffice: get project for activation failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	var project Project
	if err := doc.DataTo(&project); err != nil {
		slog.Error("backoffice: decode project for activation failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)
	updates := []firestore.Update{
		{Path: "isActive", Value: active},
		{Path: "updatedAt", Value: now},
	}

	if _, err := h.firestoreClient.Collection("projects").Doc(projectID).Update(ctx, updates); err != nil {
		slog.Error("backoffice: set project active failed", "projectID", projectID, "active", active, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	project.IsActive = active
	project.UpdatedAt = now
	eventType := audit.EventProjectDeactivated
	backofficeEventType := audit.EventBackofficeProjectDeactivated
	if active {
		eventType = audit.EventProjectReactivated
		backofficeEventType = audit.EventBackofficeProjectReactivated
	}
	metadata := map[string]any{"oldStatus": !active, "newStatus": active}
	details := audit.EventDetails{ProjectID: projectID}
	h.logAudit(r, eventType, "project", projectID, metadata, details)
	h.logAudit(r, backofficeEventType, "project", projectID, metadata, details)
	pkg.RespondJSON(w, http.StatusOK, project)
}

// ListMembers godoc
// @Summary      List project members
// @Description  Returns all members of a project
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        projectID      path    string  true  "Project ID"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/projects/{projectID}/members [get]
func (h *Handler) ListMembers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	projectID := chi.URLParam(r, "projectID")
	if projectID == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "projectID is required")
		return
	}

	// Verify the project exists first
	_, err := h.firestoreClient.Collection("projects").Doc(projectID).Get(ctx)
	if status.Code(err) == codes.NotFound {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "project not found")
		return
	}
	if err != nil {
		slog.Error("backoffice: get project for members check failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	docs, err := h.firestoreClient.Collection("projects").Doc(projectID).
		Collection("members").Documents(ctx).GetAll()
	if err != nil {
		slog.Error("backoffice: list members failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	members := make([]Member, 0, len(docs))
	for _, doc := range docs {
		var m Member
		if err := doc.DataTo(&m); err != nil {
			slog.Error("backoffice: decode member failed", "projectID", projectID, "docID", doc.Ref.ID, "error", err.Error())
			continue
		}
		members = append(members, m)
	}

	pkg.RespondList(w, members, len(members))
}

type pendingOwnerInvitation struct {
	UID          string `firestore:"uid"`
	Email        string `firestore:"email"`
	Role         string `firestore:"role"`
	InvitedBy    string `firestore:"invitedBy"`
	InvitedAt    string `firestore:"invitedAt"`
	ExpiresAt    string `firestore:"expiresAt"`
	CompanyName  string `firestore:"companyName"`
	CompanyRegID string `firestore:"companyRegId"`
	IndustryType string `firestore:"industryType"`
	CompanySize  string `firestore:"companySize"`
}

func (h *Handler) resolveOrCreateOwnerInviteUser(ctx context.Context, email string) (string, error) {
	existingUser, err := h.authClient.GetUserByEmail(ctx, email)
	if err == nil {
		_, profileErr := h.firestoreClient.Collection("users").Doc(existingUser.UID).Get(ctx)
		if profileErr == nil {
			return "", profile.ErrAlreadyRegistered
		}
		if profileErr != nil && status.Code(profileErr) != codes.NotFound {
			return "", fmt.Errorf("check existing owner invite profile: %w", profileErr)
		}
		return existingUser.UID, nil
	}
	if !firebaseAuth.IsUserNotFound(err) {
		return "", fmt.Errorf("lookup owner invite auth user: %w", err)
	}

	createdUser, err := h.authClient.CreateUser(ctx, (&firebaseAuth.UserToCreate{}).Email(email))
	if err != nil {
		return "", fmt.Errorf("create owner invite auth user: %w", err)
	}
	return createdUser.UID, nil
}

func (h *Handler) purgeOwnerInvitations(ctx context.Context, email string) error {
	docs, err := h.firestoreClient.Collection("invitations").Where("email", "==", email).Documents(ctx).GetAll()
	if err != nil {
		return fmt.Errorf("query stale owner invitations: %w", err)
	}
	for _, doc := range docs {
		if _, err := doc.Ref.Delete(ctx); err != nil {
			return fmt.Errorf("delete stale owner invitation: %w", err)
		}
	}
	return nil
}

// InviteOwner godoc
// @Summary      Invite project owner
// @Description  Creates or reuses a pending Firebase Auth user and sends an owner invitation for the selected project
// @Tags         Backoffice
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string             true  "Bearer {firebase-id-token}"
// @Param        projectID      path    string             true  "Project ID"
// @Param        body           body    InviteOwnerRequest true  "Owner invitation payload"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Failure      409  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/projects/{projectID}/invite-owner [post]
func (h *Handler) InviteOwner(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	projectID := chi.URLParam(r, "projectID")
	if projectID == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "projectID is required")
		return
	}

	var req InviteOwnerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}
	parsedEmail, err := mail.ParseAddress(strings.TrimSpace(req.Email))
	if err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid email address")
		return
	}
	req.Email = parsedEmail.Address

	projectDoc, err := h.firestoreClient.Collection("projects").Doc(projectID).Get(ctx)
	if status.Code(err) == codes.NotFound {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "project not found")
		return
	}
	if err != nil {
		slog.Error("backoffice: get project for owner invite failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	var project Project
	if err := projectDoc.DataTo(&project); err != nil {
		slog.Error("backoffice: decode project for owner invite failed", "projectID", projectID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	targetUID, err := h.resolveOrCreateOwnerInviteUser(ctx, req.Email)
	if errors.Is(err, profile.ErrAlreadyRegistered) {
		pkg.RespondError(w, http.StatusConflict, "CONFLICT", "user with this email already exists")
		return
	}
	if err != nil {
		slog.Error("backoffice: resolve owner invite user failed", "email", req.Email, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	if _, err := h.firestoreClient.Collection("projects").Doc(projectID).Collection("members").Doc(targetUID).Get(ctx); err == nil {
		pkg.RespondError(w, http.StatusConflict, "ALREADY_MEMBER", "user is already a member of this project")
		return
	} else if status.Code(err) != codes.NotFound {
		slog.Error("backoffice: check owner invite membership failed", "projectID", projectID, "uid", targetUID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	targetUser, err := h.authClient.GetUser(ctx, targetUID)
	if err != nil {
		slog.Error("backoffice: reload owner invite user failed", "uid", targetUID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	claims := make(map[string]any)
	maps.Copy(claims, targetUser.CustomClaims)
	claims["role"] = "owner"
	if err := h.authClient.SetCustomUserClaims(ctx, targetUID, claims); err != nil {
		slog.Error("backoffice: set owner invite claims failed", "uid", targetUID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		slog.Error("backoffice: APP_URL env var not set; refusing to generate owner invite link")
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	firebaseLink, err := h.authClient.PasswordResetLinkWithSettings(ctx, req.Email, &firebaseAuth.ActionCodeSettings{URL: appURL})
	if err != nil {
		slog.Error("backoffice: generate owner invite link failed", "email", req.Email, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	link, err := pkg.BuildPasswordResetActionURL(appURL, firebaseLink)
	if err != nil {
		slog.Error("backoffice: build branded owner invite link failed", "email", req.Email, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	now := time.Now().UTC()
	expiresAt := now.Add(24 * time.Hour)
	if err := h.purgeOwnerInvitations(ctx, req.Email); err != nil {
		slog.Error("backoffice: purge stale owner invitations failed", "email", req.Email, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	if _, err := h.firestoreClient.Collection("invitations").Doc(targetUID).Set(ctx, pendingOwnerInvitation{
		UID:          targetUID,
		Email:        req.Email,
		Role:         "owner",
		InvitedBy:    middleware.GetEmail(r),
		InvitedAt:    now.Format(time.RFC3339),
		ExpiresAt:    expiresAt.Format(time.RFC3339),
		CompanyName:  project.Name,
		CompanyRegID: project.CompanyRegID,
		IndustryType: project.IndustryType,
		CompanySize:  project.CompanySize,
	}); err != nil {
		slog.Error("backoffice: persist owner invitation failed", "uid", targetUID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	if h.notifSvc != nil {
		go h.notifSvc.SendInvitation(context.Background(), req.Email, middleware.GetEmail(r), project.Name, "owner", expiresAt, link)
	}

	pkg.RespondJSON(w, http.StatusOK, InviteOwnerResponse{
		UID:         targetUID,
		Email:       req.Email,
		ProjectID:   projectID,
		ProjectRole: "owner",
		ExpiresAt:   expiresAt.Format(time.RFC3339),
	})
}

// ChangeMemberRole godoc
// @Summary      Change member role
// @Description  Updates a member's project role and mirrors the change to the user's profile
// @Tags         Backoffice
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string                   true  "Bearer {firebase-id-token}"
// @Param        projectID      path    string                   true  "Project ID"
// @Param        uid            path    string                   true  "Member UID"
// @Param        body           body    ChangeMemberRoleRequest  true  "Role payload"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/projects/{projectID}/members/{uid}/role [put]
func (h *Handler) ChangeMemberRole(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	projectID := chi.URLParam(r, "projectID")
	uid := chi.URLParam(r, "uid")

	if projectID == "" || uid == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "projectID and uid are required")
		return
	}

	var req ChangeMemberRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}

	validRoles := map[string]bool{"owner": true, "system_admin": true, "manager": true, "general_user": true}
	if !validRoles[req.ProjectRole] {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "projectRole must be one of: owner, system_admin, manager, general_user")
		return
	}

	memberRef := h.firestoreClient.Collection("projects").Doc(projectID).Collection("members").Doc(uid)
	userRef := h.firestoreClient.Collection("users").Doc(uid)

	memberDoc, err := memberRef.Get(ctx)
	if status.Code(err) == codes.NotFound {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "member not found")
		return
	}
	if err != nil {
		slog.Error("backoffice: get member for role change failed", "projectID", projectID, "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	var member Member
	if err := memberDoc.DataTo(&member); err != nil {
		slog.Error("backoffice: decode member for role change failed", "projectID", projectID, "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)

	// Atomically update the member subdoc and the user's projectRoles map
	if err := h.firestoreClient.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		if err := tx.Update(memberRef, []firestore.Update{
			{Path: "projectRole", Value: req.ProjectRole},
		}); err != nil {
			return err
		}
		return tx.Update(userRef, []firestore.Update{
			{Path: fmt.Sprintf("projectRoles.%s", projectID), Value: req.ProjectRole},
			{Path: "updatedAt", Value: now},
		})
	}); err != nil {
		slog.Error("backoffice: change member role tx failed", "projectID", projectID, "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	metadata := map[string]any{
		"oldRole":     member.ProjectRole,
		"newRole":     req.ProjectRole,
		"targetEmail": member.Email,
	}
	details := audit.EventDetails{TargetUID: uid, ProjectID: projectID}
	h.logAudit(r, audit.EventProjectMemberRoleChanged, "project_member", uid, metadata, details)
	h.logAudit(r, audit.EventBackofficeMemberRoleChanged, "project_member", uid, metadata, details)
	pkg.RespondJSON(w, http.StatusOK, map[string]string{"uid": uid, "projectRole": req.ProjectRole})
}

// RemoveMember godoc
// @Summary      Remove project member
// @Description  Removes a member from the project and decrements memberCount
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        projectID      path    string  true  "Project ID"
// @Param        uid            path    string  true  "Member UID"
// @Success      204
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/projects/{projectID}/members/{uid} [delete]
func (h *Handler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	projectID := chi.URLParam(r, "projectID")
	uid := chi.URLParam(r, "uid")

	if projectID == "" || uid == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "projectID and uid are required")
		return
	}

	memberRef := h.firestoreClient.Collection("projects").Doc(projectID).Collection("members").Doc(uid)
	projectRef := h.firestoreClient.Collection("projects").Doc(projectID)
	userRef := h.firestoreClient.Collection("users").Doc(uid)

	memberDoc, err := memberRef.Get(ctx)
	if status.Code(err) == codes.NotFound {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "member not found")
		return
	}
	if err != nil {
		slog.Error("backoffice: get member for remove failed", "projectID", projectID, "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	var member Member
	if err := memberDoc.DataTo(&member); err != nil {
		slog.Error("backoffice: decode member for remove failed", "projectID", projectID, "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	now := time.Now().UTC().Format(time.RFC3339)

	if err := h.firestoreClient.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		if err := tx.Delete(memberRef); err != nil {
			return err
		}
		if err := tx.Update(projectRef, []firestore.Update{
			{Path: "memberCount", Value: firestore.Increment(-1)},
			{Path: "updatedAt", Value: now},
		}); err != nil {
			return err
		}
		return tx.Update(userRef, []firestore.Update{
			{Path: fmt.Sprintf("projectRoles.%s", projectID), Value: firestore.Delete},
			{Path: "updatedAt", Value: now},
		})
	}); err != nil {
		slog.Error("backoffice: remove member tx failed", "projectID", projectID, "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	metadata := map[string]any{
		"role":        member.ProjectRole,
		"targetEmail": member.Email,
	}
	details := audit.EventDetails{TargetUID: uid, ProjectID: projectID}
	h.logAudit(r, audit.EventProjectMemberRemoved, "project_member", uid, metadata, details)
	h.logAudit(r, audit.EventBackofficeProjectMemberRemoved, "project_member", uid, metadata, details)
	w.WriteHeader(http.StatusNoContent)
}

// ListUsers godoc
// @Summary      List users
// @Description  Returns registered user profiles
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        limit          query   int     false  "Max results (default 200, max 500)"
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/users [get]
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	limit := parseLimit(r.URL.Query().Get("limit"), defaultUserLimit, maxUserListLimit)

	profiles, err := h.profileSvc.ListProfiles(r.Context(), limit)
	if err != nil {
		slog.Error("backoffice: list users failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	if profiles == nil {
		profiles = []*profile.Profile{}
	}

	uids := make([]string, len(profiles))
	for i, p := range profiles {
		uids[i] = p.UID
	}
	photos := fetchPhotoURLs(r.Context(), h.authClient, uids)

	users := make([]UserProfile, len(profiles))
	for i, p := range profiles {
		users[i] = UserProfile{Profile: *p, PhotoURL: photos[p.UID]}
	}

	pkg.RespondList(w, users, len(users))
}

// GetUser godoc
// @Summary      Get user
// @Description  Returns a single user profile by UID
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        uid            path    string  true  "Firebase UID"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/users/{uid} [get]
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	uid := chi.URLParam(r, "uid")
	if uid == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "uid is required")
		return
	}

	p, err := h.profileSvc.GetProfile(r.Context(), uid)
	if errors.Is(err, profile.ErrProfileNotFound) {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}
	if err != nil {
		slog.Error("backoffice: get user failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	pkg.RespondJSON(w, http.StatusOK, p)
}

// GetUserActivity godoc
// @Summary      Get user activity
// @Description  Returns audit events where the selected user is actor or target; requires superadmin
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        uid            path    string  true  "Firebase UID"
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/users/{uid}/activity [get]
func (h *Handler) GetUserActivity(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}
	uid := chi.URLParam(r, "uid")
	if uid == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "uid is required")
		return
	}
	if h.auditLogger == nil {
		pkg.RespondList(w, []audit.Event{}, 0)
		return
	}

	filter := auditQueryFilter(r, 50, 200)
	events, err := h.auditLogger.QueryByUser(r.Context(), uid, filter)
	if err != nil {
		slog.Error("backoffice: get user activity failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	pkg.RespondList(w, events, len(events))
}

// SetUserRole godoc
// @Summary      Set customer user role
// @Description  Updates a customer-facing role claim and profile mirror; requires superadmin
// @Tags         Backoffice
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string             true  "Bearer {firebase-id-token}"
// @Param        uid            path    string             true  "Firebase UID"
// @Param        body           body    SetUserRoleRequest true  "Role payload"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/users/{uid}/role [put]
func (h *Handler) SetUserRole(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}

	ctx := r.Context()
	uid := chi.URLParam(r, "uid")
	if uid == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "uid is required")
		return
	}

	var req SetUserRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}
	if !validCustomerRoles[req.Role] {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid role")
		return
	}

	user, err := h.authClient.GetUser(ctx, uid)
	if err != nil {
		slog.Error("backoffice: get user for role change failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}

	oldRole, _ := user.CustomClaims["role"].(string)
	if oldRole == "" {
		if p, err := h.profileSvc.GetProfile(ctx, uid); err == nil {
			oldRole = p.Role
		}
	}

	claims := make(map[string]any)
	maps.Copy(claims, user.CustomClaims)
	claims["role"] = req.Role
	if err := h.authClient.SetCustomUserClaims(ctx, uid, claims); err != nil {
		slog.Error("backoffice: set user role claims failed", "uid", uid, "role", req.Role, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	if err := h.profileSvc.SetRole(ctx, uid, req.Role); err != nil {
		slog.Error("backoffice: set user role profile failed", "uid", uid, "role", req.Role, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	metadata := map[string]any{"oldRole": oldRole, "newRole": req.Role}
	h.logAudit(r, audit.EventUserRoleChanged, "profile", uid, metadata, audit.EventDetails{TargetUID: uid})
	h.logAudit(r, audit.EventBackofficeUserRoleChanged, "profile", uid, metadata, audit.EventDetails{TargetUID: uid})
	pkg.RespondJSON(w, http.StatusOK, map[string]string{"uid": uid, "role": req.Role})
}

// DeleteUser godoc
// @Summary      Delete user
// @Description  Permanently deletes a user from Firebase Auth and Firestore; requires superadmin
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        uid            path    string  true  "Firebase UID"
// @Success      204
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/users/{uid} [delete]
func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}

	ctx := r.Context()
	uid := chi.URLParam(r, "uid")
	if uid == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "uid is required")
		return
	}

	var deletedProfile *profile.Profile
	if p, err := h.profileSvc.GetProfile(ctx, uid); err == nil {
		deletedProfile = p
	} else if !errors.Is(err, profile.ErrProfileNotFound) {
		slog.Warn("backoffice: load user before delete failed", "uid", uid, "error", err.Error())
	}

	if err := h.authClient.DeleteUser(ctx, uid); err != nil {
		slog.Error("backoffice: delete firebase user failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	if _, err := h.firestoreClient.Collection("users").Doc(uid).Delete(ctx); err != nil {
		slog.Error("backoffice: delete firestore user failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	metadata := map[string]any{}
	details := audit.EventDetails{TargetUID: uid}
	if deletedProfile != nil {
		metadata["email"] = deletedProfile.Email
		metadata["companyName"] = deletedProfile.CompanyName
		metadata["role"] = deletedProfile.Role
		details.ProjectID = deletedProfile.CompanyRegID
	}
	h.logAudit(r, audit.EventBackofficeUserDeleted, "profile", uid, metadata, details)
	w.WriteHeader(http.StatusNoContent)
}

// ListResults godoc
// @Summary      List results
// @Description  Returns all assessments enriched with profile data; optional projectID filter
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        projectID      query   string  false  "Filter by project ID"
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/results [get]
func (h *Handler) ListResults(w http.ResponseWriter, r *http.Request) {
	results, err := h.resultSvc.ListResults(r.Context(), nil, maxResultLimit)
	if err != nil {
		slog.Error("backoffice: list results failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	if results == nil {
		results = []result.Assessment{}
	}

	enriched := h.enrichAssessments(r, results)

	// Optional in-memory project filter (applied after enrichment)
	if projectID := r.URL.Query().Get("projectID"); projectID != "" {
		filtered := enriched[:0]
		for _, e := range enriched {
			if e.ProjectID == projectID {
				filtered = append(filtered, e)
			}
		}
		enriched = filtered
	}

	pkg.RespondList(w, enriched, len(enriched))
}

// GetResult godoc
// @Summary      Get result
// @Description  Returns a single assessment enriched with profile data
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        assessmentID   path    string  true  "Assessment ID"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/results/{assessmentID} [get]
func (h *Handler) GetResult(w http.ResponseWriter, r *http.Request) {
	assessmentID := chi.URLParam(r, "assessmentID")
	if assessmentID == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "assessmentID is required")
		return
	}

	a, err := h.resultSvc.GetResultByID(r.Context(), assessmentID)
	if errors.Is(err, result.ErrResultNotFound) {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "assessment not found")
		return
	}
	if err != nil {
		slog.Error("backoffice: get result failed", "assessmentID", assessmentID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	enriched := h.enrichAssessments(r, []result.Assessment{*a})
	pkg.RespondJSON(w, http.StatusOK, enriched[0])
}

// ExportCSV godoc
// @Summary      Export results as CSV
// @Description  Streams all assessments as a CSV file including projectID column
// @Tags         Backoffice
// @Produce      text/csv
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {file}    csv
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/export [get]
func (h *Handler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	results, err := h.resultSvc.ListResults(r.Context(), nil, maxBackofficeExportRows)
	if err != nil {
		slog.Error("backoffice: export csv failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	enriched := h.enrichAssessments(r, results)

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=backoffice-assessments.csv")

	writer := csv.NewWriter(w)
	defer writer.Flush()

	writer.Write([]string{
		"ID", "UID", "Project ID", "Company Name", "Industry Type", "Company Size",
		"Contact Name", "Contact Email", "Overall Score", "Diagnosis", "Submitted At",
	})

	for _, a := range enriched {
		writer.Write([]string{
			a.ID,
			a.UID,
			a.ProjectID,
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

	h.logAudit(r, audit.EventAdminExport, "export", "backoffice-assessments.csv", map[string]any{"count": len(enriched)}, audit.EventDetails{})
}

// ListAudit godoc
// @Summary      List audit events
// @Description  Searches platform audit events; requires superadmin
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/audit [get]
func (h *Handler) ListAudit(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}
	if h.auditLogger == nil {
		pkg.RespondList(w, []audit.Event{}, 0)
		return
	}
	filter := auditQueryFilter(r, 100, 500)
	events, err := h.auditLogger.Query(r.Context(), filter)
	if err != nil {
		slog.Error("backoffice: list audit failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	pkg.RespondList(w, events, len(events))
}

// ListStaff godoc
// @Summary      List staff
// @Description  Returns all Firebase Auth users with a backofficeRole claim; requires superadmin
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/staff [get]
func (h *Handler) ListStaff(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}

	ctx := r.Context()
	iter := h.authClient.Users(ctx, "")

	var staff []StaffMember
	scanned := 0

	for scanned < maxStaffScanLimit {
		user, err := iter.Next()
		if err != nil {
			// iterator exhausted or error — stop in both cases
			break
		}
		scanned++

		backofficeRole, _ := user.CustomClaims["backofficeRole"].(string)
		if backofficeRole == "" {
			continue
		}

		staff = append(staff, StaffMember{
			UID:            user.UID,
			Email:          user.Email,
			DisplayName:    user.DisplayName,
			PhotoURL:       user.PhotoURL,
			BackofficeRole: backofficeRole,
		})
	}

	if staff == nil {
		staff = []StaffMember{}
	}
	pkg.RespondList(w, staff, len(staff))
}

func backofficeInviteAppURL() string {
	if appURL := os.Getenv("BACKOFFICE_APP_URL"); appURL != "" {
		return appURL
	}
	return os.Getenv("APP_URL")
}

func staffMemberFromUser(user *firebaseAuth.UserRecord, role string) StaffMember {
	return StaffMember{
		UID:            user.UID,
		Email:          user.Email,
		DisplayName:    user.DisplayName,
		PhotoURL:       user.PhotoURL,
		BackofficeRole: role,
	}
}

func (h *Handler) resolveOrCreateStaffAuthUser(ctx context.Context, email string) (*firebaseAuth.UserRecord, error) {
	existingUser, err := h.authClient.GetUserByEmail(ctx, email)
	if err == nil {
		return existingUser, nil
	}
	if !firebaseAuth.IsUserNotFound(err) {
		return nil, fmt.Errorf("lookup staff auth user by email: %w", err)
	}

	createdUser, err := h.authClient.CreateUser(ctx, (&firebaseAuth.UserToCreate{}).Email(email))
	if err != nil {
		return nil, fmt.Errorf("create staff auth user: %w", err)
	}
	return createdUser, nil
}

func validBackofficeRole(role string) bool {
	return role == "superadmin" || role == "staff"
}

// InviteStaff godoc
// @Summary      Invite staff
// @Description  Creates or reuses a Firebase Auth user, assigns backofficeRole, and sends a password-setup invite email; requires superadmin
// @Tags         Backoffice
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string             true  "Bearer {firebase-id-token}"
// @Param        body           body    InviteStaffRequest true  "Invitation payload"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      500  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/staff/invitations [post]
func (h *Handler) InviteStaff(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}

	var req InviteStaffRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}
	parsedEmail, err := mail.ParseAddress(strings.TrimSpace(req.Email))
	if err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid email address")
		return
	}
	req.Email = parsedEmail.Address
	if !validBackofficeRole(req.BackofficeRole) {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "backofficeRole must be superadmin or staff")
		return
	}

	ctx := r.Context()
	user, err := h.resolveOrCreateStaffAuthUser(ctx, req.Email)
	if err != nil {
		slog.Error("backoffice: resolve staff invite user failed", "email", req.Email, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	oldRole, _ := user.CustomClaims["backofficeRole"].(string)

	claims := make(map[string]any)
	maps.Copy(claims, user.CustomClaims)
	claims["backofficeRole"] = req.BackofficeRole
	if err := h.authClient.SetCustomUserClaims(ctx, user.UID, claims); err != nil {
		slog.Error("backoffice: set staff invite claims failed", "uid", user.UID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	appURL := backofficeInviteAppURL()
	if appURL == "" {
		slog.Error("backoffice: BACKOFFICE_APP_URL/APP_URL env var not set; refusing to generate invite link")
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	link, err := h.authClient.PasswordResetLinkWithSettings(ctx, req.Email, &firebaseAuth.ActionCodeSettings{URL: appURL})
	if err != nil {
		slog.Error("backoffice: generate staff invite link failed", "email", req.Email, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	expiresAt := time.Now().UTC().Add(24 * time.Hour)
	if h.notifSvc != nil {
		go h.notifSvc.SendInvitation(
			context.Background(),
			req.Email,
			middleware.GetEmail(r),
			"FactorySync Backoffice",
			req.BackofficeRole,
			expiresAt,
			link,
		)
	}

	slog.Info("backoffice staff invited", "email", req.Email, "role", req.BackofficeRole, "invitedBy", middleware.GetEmail(r))
	eventType := audit.EventBackofficeStaffRoleGranted
	if oldRole != "" && oldRole != req.BackofficeRole {
		eventType = audit.EventBackofficeStaffRoleChanged
	}
	h.logAudit(r, eventType, "staff", user.UID, map[string]any{
		"targetEmail": req.Email,
		"oldRole":     oldRole,
		"newRole":     req.BackofficeRole,
	}, audit.EventDetails{TargetUID: user.UID})
	pkg.RespondJSON(w, http.StatusOK, staffMemberFromUser(user, req.BackofficeRole))
}

// SetStaffRole godoc
// @Summary      Set staff role
// @Description  Assigns a backofficeRole custom claim to a Firebase Auth user; requires superadmin
// @Tags         Backoffice
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string             true  "Bearer {firebase-id-token}"
// @Param        uid            path    string             true  "Firebase UID"
// @Param        body           body    SetStaffRoleRequest true  "Role payload"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/staff/{uid} [put]
func (h *Handler) SetStaffRole(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}

	ctx := r.Context()
	uid := chi.URLParam(r, "uid")
	if uid == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "uid is required")
		return
	}

	var req SetStaffRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}
	if !validBackofficeRole(req.BackofficeRole) {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "backofficeRole must be superadmin or staff")
		return
	}

	// Verify the target user exists
	user, err := h.authClient.GetUser(ctx, uid)
	if err != nil {
		slog.Error("backoffice: get user for set staff role failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}
	oldRole, _ := user.CustomClaims["backofficeRole"].(string)

	// Merge into existing claims rather than clobbering them
	claims := make(map[string]any)
	maps.Copy(claims, user.CustomClaims)
	claims["backofficeRole"] = req.BackofficeRole

	if err := h.authClient.SetCustomUserClaims(ctx, uid, claims); err != nil {
		slog.Error("backoffice: set staff role claims failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	eventType := audit.EventBackofficeStaffRoleGranted
	if oldRole != "" && oldRole != req.BackofficeRole {
		eventType = audit.EventBackofficeStaffRoleChanged
	}
	h.logAudit(r, eventType, "staff", uid, map[string]any{
		"targetEmail": user.Email,
		"oldRole":     oldRole,
		"newRole":     req.BackofficeRole,
	}, audit.EventDetails{TargetUID: uid})
	pkg.RespondJSON(w, http.StatusOK, staffMemberFromUser(user, req.BackofficeRole))
}

// RevokeStaffRole godoc
// @Summary      Revoke staff role
// @Description  Removes the backofficeRole custom claim from a Firebase Auth user; requires superadmin
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        uid            path    string  true  "Firebase UID"
// @Success      204
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/staff/{uid} [delete]
func (h *Handler) RevokeStaffRole(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}

	ctx := r.Context()
	uid := chi.URLParam(r, "uid")
	if uid == "" {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "uid is required")
		return
	}

	user, err := h.authClient.GetUser(ctx, uid)
	if err != nil {
		slog.Error("backoffice: get user for revoke staff role failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}
	oldRole, _ := user.CustomClaims["backofficeRole"].(string)

	// Rebuild claims without backofficeRole
	claims := make(map[string]any)
	for k, v := range user.CustomClaims {
		if k != "backofficeRole" {
			claims[k] = v
		}
	}

	if err := h.authClient.SetCustomUserClaims(ctx, uid, claims); err != nil {
		slog.Error("backoffice: revoke staff role claims failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	h.logAudit(r, audit.EventBackofficeStaffRoleRevoked, "staff", uid, map[string]any{
		"targetEmail": user.Email,
		"oldRole":     oldRole,
	}, audit.EventDetails{TargetUID: uid})
	w.WriteHeader(http.StatusNoContent)
}
