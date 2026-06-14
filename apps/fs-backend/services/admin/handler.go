package admin

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/mail"
	"os"
	"regexp"
	"strconv"
	"time"

	"cloud.google.com/go/firestore"
	firebaseAuth "firebase.google.com/go/v4/auth"
	"github.com/go-chi/chi/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/middleware"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/pkg"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/audit"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/notification"
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
	notifSvc    *notification.Service
	fsClient    *firestore.Client
}

func NewHandler(resultSvc *result.Service, profileSvc *profile.Service, authClient *firebaseAuth.Client, auditLogger *audit.Logger, notifSvc *notification.Service, fsClient *firestore.Client) *Handler {
	return &Handler{resultSvc: resultSvc, profileSvc: profileSvc, authClient: authClient, auditLogger: auditLogger, notifSvc: notifSvc, fsClient: fsClient}
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

// enrichedUser extends Profile with Firebase Auth data.
type enrichedUser struct {
	profile.Profile
	PhotoURL  string `json:"photoURL"`
	IsPending bool   `json:"isPending,omitempty"`
	InvitedAt string `json:"invitedAt,omitempty"`
}

// pendingInvitation mirrors the Firestore document stored under the "invitations" collection.
// Company fields are snapshotted from the inviter's profile at invite time and used to
// populate the new member's profile when they accept the invitation.
type pendingInvitation struct {
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

// fetchPhotoURLs returns a uid→photoURL map via Firebase Auth batch lookup.
// UIDs are chunked to respect the 100-identifier limit per call.
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
			slog.Error("fetchPhotoURLs: GetUsers failed", "error", err.Error())
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
// @Param        industryType   query   string  false  "Filter by industry type"
// @Param        companySize    query   string  false  "Filter by company size"
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /admin/assessments [get]
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
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /admin/assessments/{assessmentId} [get]
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
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /admin/export [get]
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
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /admin/users [get]
// @Router       /manage/users [get]
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

	uids := make([]string, len(profiles))
	for i, p := range profiles {
		uids[i] = p.UID
	}
	photos := fetchPhotoURLs(r.Context(), h.authClient, uids)

	users := make([]enrichedUser, len(profiles))
	for i, p := range profiles {
		users[i] = enrichedUser{Profile: *p, PhotoURL: photos[p.UID]}
	}

	users = h.appendPendingInvitations(r.Context(), users, profiles)

	pkg.RespondList(w, users, len(users))
}

// appendPendingInvitations fetches the "invitations" collection and appends any invited users
// whose UID is not already present in profiles (i.e. they haven't registered yet).
func (h *Handler) appendPendingInvitations(ctx context.Context, users []enrichedUser, profiles []*profile.Profile) []enrichedUser {
	if h.fsClient == nil {
		return users
	}

	profileUIDs := make(map[string]bool, len(profiles))
	for _, p := range profiles {
		profileUIDs[p.UID] = true
	}

	invDocs, err := h.fsClient.Collection("invitations").
		Where("expiresAt", ">", time.Now().UTC().Format(time.RFC3339)).
		Limit(500).
		Documents(ctx).GetAll()
	if err != nil {
		slog.Warn("list users: fetch invitations failed", "error", err.Error())
		return users
	}

	for _, doc := range invDocs {
		var inv pendingInvitation
		if err := doc.DataTo(&inv); err != nil || profileUIDs[inv.UID] {
			continue
		}
		users = append(users, enrichedUser{
			Profile: profile.Profile{
				UID:   inv.UID,
				Email: inv.Email,
				Role:  inv.Role,
			},
			IsPending: true,
			InvitedAt: inv.InvitedAt,
		})
	}
	return users
}

// purgeStaleInvitations deletes all invitation documents whose email matches,
// cleaning up orphans left by previously failed invite attempts.
func (h *Handler) purgeStaleInvitations(ctx context.Context, email string) {
	docs, err := h.fsClient.Collection("invitations").Where("email", "==", email).Documents(ctx).GetAll()
	if err != nil {
		slog.Warn("invite: purge stale invitations query failed", "email", email, "error", err.Error())
		return
	}
	for _, doc := range docs {
		if _, err := doc.Ref.Delete(ctx); err != nil {
			slog.Warn("invite: delete stale invitation failed", "id", doc.Ref.ID, "error", err.Error())
		}
	}
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
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      500  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /admin/users/{uid}/role [put]
// @Router       /manage/users/{uid}/role [put]
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
	if !validRoles[req.Role] {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "role must be one of: user, manager, system_admin, owner")
		return
	}

	var oldRole string
	if p, err := h.profileSvc.GetProfile(r.Context(), uid); err == nil {
		oldRole = p.Role
	} else if !errors.Is(err, profile.ErrProfileNotFound) {
		slog.Warn("set role: load old profile role failed", "uid", uid, "error", err.Error())
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
	if h.auditLogger != nil {
		h.auditLogger.LogWithDetails(r.Context(), middleware.GetUID(r), audit.EventUserRoleChanged, "profile", uid, map[string]any{
			"oldRole": oldRole,
			"newRole": req.Role,
		}, audit.EventDetails{
			ActorEmail: middleware.GetEmail(r),
			ActorName:  middleware.GetDisplayName(r),
			TargetUID:  uid,
		})
	}
	pkg.RespondJSON(w, http.StatusOK, map[string]string{"uid": uid, "role": req.Role})
}

var validRoles = map[string]bool{
	"user": true, "manager": true, "system_admin": true, "owner": true,
}

// inviteRequest is the payload for member invitations.
type inviteRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

// resolveOrCreateAuthUser ensures a Firebase Auth account exists for the given email.
// Returns the UID and a boolean indicating whether the caller should abort with a 409 (user
// already has a completed Firestore profile). Any other error is returned wrapped.
func (h *Handler) resolveOrCreateAuthUser(ctx context.Context, email string) (uid string, conflict bool, err error) {
	existingUser, authErr := h.authClient.GetUserByEmail(ctx, email)
	switch {
	case authErr == nil:
		// Auth user exists — only block if they also have a Firestore profile (i.e. are a member).
		if h.fsClient != nil {
			profileDoc, ferr := h.fsClient.Collection("users").Doc(existingUser.UID).Get(ctx)
			if ferr == nil && profileDoc.Exists() {
				return "", true, nil
			}
			if ferr != nil && status.Code(ferr) != codes.NotFound {
				return "", false, fmt.Errorf("check existing profile for %s: %w", existingUser.UID, ferr)
			}
		}
		// No profile → pending/orphan; re-use their existing UID.
		slog.Info("invite: re-inviting pending user", "email", email, "uid", existingUser.UID)
		return existingUser.UID, false, nil
	case firebaseAuth.IsUserNotFound(authErr):
		newUser, cerr := h.authClient.CreateUser(ctx, (&firebaseAuth.UserToCreate{}).Email(email))
		if cerr != nil {
			return "", false, fmt.Errorf("create firebase user: %w", cerr)
		}
		return newUser.UID, false, nil
	default:
		return "", false, fmt.Errorf("lookup user by email: %w", authErr)
	}
}

// fetchInviterCompanySnapshot loads the inviter's profile from Firestore and returns the
// company fields to snapshot into the invitation document.
// Failures are non-fatal — an empty profile is returned so the invite is not blocked.
func (h *Handler) fetchInviterCompanySnapshot(ctx context.Context, inviterUID string) profile.Profile {
	if h.fsClient == nil || inviterUID == "" {
		return profile.Profile{}
	}
	doc, err := h.fsClient.Collection("users").Doc(inviterUID).Get(ctx)
	if err != nil {
		slog.Warn("invite: fetch inviter profile failed, continuing with empty company fields",
			"inviterUID", inviterUID, "error", err.Error())
		return profile.Profile{}
	}
	var p profile.Profile
	if err := doc.DataTo(&p); err != nil {
		slog.Warn("invite: decode inviter profile failed, continuing with empty company fields",
			"inviterUID", inviterUID, "error", err.Error())
		return profile.Profile{}
	}
	return p
}

// persistInvitation purges stale invitation docs for the email asynchronously, then writes the new one.
func (h *Handler) persistInvitation(ctx context.Context, inv pendingInvitation) error {
	go h.purgeStaleInvitations(context.Background(), inv.Email)
	if _, err := h.fsClient.Collection("invitations").Doc(inv.UID).Set(ctx, inv); err != nil {
		return fmt.Errorf("persist invitation: %w", err)
	}
	return nil
}

// InviteMember godoc
// @Summary      Invite a new member
// @Description  Creates a Firebase Auth user and sends a password-setup invite email
// @Tags         Admin
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string         true  "Bearer {firebase-id-token}"
// @Param        body           body    inviteRequest  true  "Invitation payload"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      409  {object}  pkg.ErrorResponse
// @Failure      500  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /manage/invitations [post]
func (h *Handler) InviteMember(w http.ResponseWriter, r *http.Request) {
	var req inviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid request body")
		return
	}
	if _, err := mail.ParseAddress(req.Email); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid email address")
		return
	}
	if !validRoles[req.Role] {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid role")
		return
	}

	ctx := r.Context()

	targetUID, conflict, err := h.resolveOrCreateAuthUser(ctx, req.Email)
	if err != nil {
		slog.Error("invite: resolve auth user failed", "email", req.Email, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	if conflict {
		pkg.RespondError(w, http.StatusConflict, "CONFLICT", "user with this email already exists")
		return
	}

	// Set the initial role via custom claims.
	if err := h.authClient.SetCustomUserClaims(ctx, targetUID, map[string]any{"role": req.Role}); err != nil {
		slog.Error("invite: set custom claims failed", "uid", targetUID, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	// Generate the password-reset link before writing to Firestore so that a failed
	// link generation does not leave a stale invitation document behind.
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		slog.Error("invite: APP_URL env var not set; refusing to generate invite link")
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	link, err := h.authClient.PasswordResetLinkWithSettings(ctx, req.Email,
		&firebaseAuth.ActionCodeSettings{URL: appURL})
	if err != nil {
		slog.Error("invite: generate password reset link failed", "email", req.Email, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	inviterEmail := middleware.GetEmail(r)
	inviterSnapshot := h.fetchInviterCompanySnapshot(ctx, middleware.GetUID(r))

	now := time.Now().UTC()
	expiresAt := now.Add(24 * time.Hour)

	if h.fsClient != nil {
		if err := h.persistInvitation(ctx, pendingInvitation{
			UID:          targetUID,
			Email:        req.Email,
			Role:         req.Role,
			InvitedBy:    inviterEmail,
			InvitedAt:    now.Format(time.RFC3339),
			ExpiresAt:    expiresAt.Format(time.RFC3339),
			CompanyName:  inviterSnapshot.CompanyName,
			CompanyRegID: inviterSnapshot.CompanyRegID,
			IndustryType: inviterSnapshot.IndustryType,
			CompanySize:  inviterSnapshot.CompanySize,
		}); err != nil {
			slog.Error("invite: persist invitation failed", "uid", targetUID, "error", err.Error())
			pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
			return
		}
	}

	go h.notifSvc.SendInvitation(context.Background(), req.Email, inviterEmail, inviterSnapshot.CompanyName, req.Role, expiresAt, link)

	slog.Info("member invited", "email", req.Email, "role", req.Role, "invitedBy", inviterEmail)
	pkg.RespondJSON(w, http.StatusOK, map[string]string{"email": req.Email, "role": req.Role})
}

// AcceptInvitation godoc
// @Summary      Accept a pending invitation
// @Description  Creates a Firestore profile from the invitation document and deletes it
// @Tags         Admin
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Failure      500  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /invitations/accept [post]
func (h *Handler) AcceptInvitation(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	if uid == "" {
		pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	if h.fsClient == nil {
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	ctx := r.Context()

	doc, err := h.fsClient.Collection("invitations").Doc(uid).Get(ctx)
	if status.Code(err) == codes.NotFound {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "no pending invitation found")
		return
	}
	if err != nil {
		slog.Error("accept invitation: fetch invitation failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	var inv pendingInvitation
	if err := doc.DataTo(&inv); err != nil {
		slog.Error("accept invitation: decode invitation failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	if inv.ExpiresAt != "" {
		expiresAt, parseErr := time.Parse(time.RFC3339, inv.ExpiresAt)
		if parseErr == nil && time.Now().UTC().After(expiresAt) {
			pkg.RespondError(w, http.StatusGone, "INVITATION_EXPIRED", "invitation link has expired")
			return
		}
	}

	email := middleware.GetEmail(r)
	displayName := middleware.GetDisplayName(r)
	now := time.Now().UTC().Format(time.RFC3339)

	p := profile.Profile{
		UID:          uid,
		Email:        email,
		DisplayName:  displayName,
		CompanyName:  inv.CompanyName,
		CompanyRegID: inv.CompanyRegID,
		IndustryType: inv.IndustryType,
		CompanySize:  inv.CompanySize,
		ContactName:  displayName, // editable via profile update later
		ContactEmail: email,
		Role:         inv.Role,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	createdProfile, err := h.profileSvc.CreateInvitedProfile(ctx, &p)
	if errors.Is(err, profile.ErrAlreadyRegistered) {
		pkg.RespondError(w, http.StatusConflict, "CONFLICT", "user is already registered")
		return
	}
	if err != nil {
		slog.Error("accept invitation: write profile failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	// Best-effort cleanup — a failure here does not undo the profile creation.
	if _, err := h.fsClient.Collection("invitations").Doc(uid).Delete(ctx); err != nil {
		slog.Warn("accept invitation: delete invitation doc failed", "uid", uid, "error", err.Error())
	}

	slog.Info("invitation accepted", "uid", uid, "email", email, "role", inv.Role)
	pkg.RespondJSON(w, http.StatusOK, createdProfile)
}

// CancelInvitation godoc
// @Summary      Cancel a pending invitation
// @Description  Deletes the Firestore invitation document and the Firebase Auth user for a pending invite
// @Tags         Admin
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        uid            path    string  true  "Firebase UID of the pending invite"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      500  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /manage/invitations/{uid} [delete]
func (h *Handler) CancelInvitation(w http.ResponseWriter, r *http.Request) {
	uid := chi.URLParam(r, "uid")
	if uid == "" || len(uid) > 128 {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid uid")
		return
	}

	ctx := r.Context()

	// SEC-001: Verify this is a pending invitation before deleting anything.
	if h.fsClient != nil {
		_, err := h.fsClient.Collection("invitations").Doc(uid).Get(ctx)
		if status.Code(err) == codes.NotFound {
			pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "no pending invitation found")
			return
		}
		if err != nil {
			slog.Error("cancel invitation: fetch invitation failed", "uid", uid, "error", err.Error())
			pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
			return
		}
	}

	// CORRECTNESS-004: Delete Firebase Auth user first so Firestore doc remains as a tombstone if Firebase fails.
	if err := h.authClient.DeleteUser(ctx, uid); err != nil {
		if firebaseAuth.IsUserNotFound(err) {
			slog.Warn("cancel invitation: firebase user not found, continuing", "uid", uid)
		} else {
			slog.Error("cancel invitation: delete firebase user failed", "uid", uid, "error", err.Error())
			pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
			return
		}
	}

	if h.fsClient != nil {
		if _, err := h.fsClient.Collection("invitations").Doc(uid).Delete(ctx); err != nil {
			slog.Error("cancel invitation: delete firestore doc failed", "uid", uid, "error", err.Error())
			pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
			return
		}
	}

	slog.Info("invitation cancelled", "uid", uid)
	pkg.RespondJSON(w, http.StatusOK, map[string]string{"uid": uid})
}

// ResendInvitation godoc
// @Summary      Resend a pending invitation
// @Description  Re-sends the password-setup invite email for an existing pending invitation
// @Tags         Admin
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        uid            path    string  true  "Firebase UID of the pending invite"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Failure      500  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /manage/invitations/{uid}/resend [post]
func (h *Handler) ResendInvitation(w http.ResponseWriter, r *http.Request) {
	uid := chi.URLParam(r, "uid")
	if uid == "" || len(uid) > 128 {
		pkg.RespondError(w, http.StatusBadRequest, "BAD_REQUEST", "invalid uid")
		return
	}

	ctx := r.Context()

	doc, err := h.fsClient.Collection("invitations").Doc(uid).Get(ctx)
	if status.Code(err) == codes.NotFound {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "invitation not found")
		return
	}
	if err != nil {
		slog.Error("resend invitation: fetch firestore doc failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	var inv pendingInvitation
	if err := doc.DataTo(&inv); err != nil {
		slog.Error("resend invitation: decode invitation failed", "uid", uid, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		slog.Error("resend invitation: APP_URL env var not set; refusing to generate invite link")
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}
	settings := &firebaseAuth.ActionCodeSettings{URL: appURL}
	link, err := h.authClient.PasswordResetLinkWithSettings(ctx, inv.Email, settings)
	if err != nil {
		slog.Error("resend invitation: generate password reset link failed", "email", inv.Email, "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
		return
	}

	resendNow := time.Now().UTC()
	resendExpiresAt := resendNow.Add(24 * time.Hour)

	go h.notifSvc.SendInvitation(context.Background(), inv.Email, middleware.GetEmail(r), inv.CompanyName, inv.Role, resendExpiresAt, link)

	if _, err := doc.Ref.Set(ctx, map[string]any{
		"invitedAt": resendNow.Format(time.RFC3339),
		"expiresAt": resendExpiresAt.Format(time.RFC3339),
	}, firestore.MergeAll); err != nil {
		slog.Error("resend invitation: update timestamps failed", "uid", uid, "error", err.Error())
	}

	slog.Info("invitation resent", "uid", uid, "email", inv.Email)
	pkg.RespondJSON(w, http.StatusOK, map[string]string{"uid": uid, "email": inv.Email})
}
