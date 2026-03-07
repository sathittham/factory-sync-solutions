package profile

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"factory-health-check/apps/api/middleware"
	"factory-health-check/apps/api/pkg"
)

type Handler struct {
	service *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{service: svc}
}

// Routes registers all profile routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/", h.GetProfile)
	r.Post("/", h.CreateProfile)
	r.Put("/", h.UpdateProfile)
	r.Get("/check/{regId}", h.CheckRegID)
}

// GetProfile godoc
// @Summary      Get user profile
// @Description  Returns the authenticated user's profile
// @Tags         Profile
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Failure      404  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/profile [get]
func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)

	profile, err := h.service.GetProfile(r.Context(), uid)
	if err != nil {
		handleError(w, r, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, profile)
}

// CreateProfile godoc
// @Summary      Register user profile
// @Description  Create user profile with company information after Google Sign-In
// @Tags         Profile
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string               true  "Bearer {firebase-id-token}"
// @Param        request        body    CreateProfileRequest  true  "Registration details"
// @Success      201  {object}  map[string]any
// @Failure      400  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Failure      409  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/profile [post]
func (h *Handler) CreateProfile(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	email := middleware.GetEmail(r)
	displayName := middleware.GetDisplayName(r)

	var req CreateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	if err := pkg.Validate.Struct(req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	profile, err := h.service.CreateProfile(r.Context(), uid, email, displayName, &req)
	if err != nil {
		handleError(w, r, err)
		return
	}
	pkg.RespondJSON(w, http.StatusCreated, profile)
}

// UpdateProfile godoc
// @Summary      Update user profile
// @Description  Update the authenticated user's profile fields
// @Tags         Profile
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string               true  "Bearer {firebase-id-token}"
// @Param        request        body    UpdateProfileRequest  true  "Update fields"
// @Success      200  {object}  map[string]any
// @Failure      400  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Failure      404  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/profile [put]
func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	if err := pkg.Validate.Struct(req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	profile, err := h.service.UpdateProfile(r.Context(), uid, &req)
	if err != nil {
		handleError(w, r, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, profile)
}

// CheckRegID godoc
// @Summary      Check if a company registration ID is already registered
// @Description  Returns the existing profile if the reg ID is taken, or empty if available
// @Tags         Profile
// @Produce      json
// @Param        regId  path  string  true  "13-digit company registration ID"
// @Success      200  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/profile/check/{regId} [get]
func (h *Handler) CheckRegID(w http.ResponseWriter, r *http.Request) {
	regID := chi.URLParam(r, "regId")
	if len(regID) != 13 {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "registration ID must be 13 digits")
		return
	}

	profile, err := h.service.CheckRegID(r.Context(), regID)
	if err != nil {
		handleError(w, r, err)
		return
	}

	if profile != nil {
		pkg.RespondJSON(w, http.StatusOK, map[string]any{
			"registered":  true,
			"companyName": profile.CompanyName,
		})
		return
	}

	pkg.RespondJSON(w, http.StatusOK, map[string]any{
		"registered": false,
	})
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, ErrProfileNotFound):
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case errors.Is(err, ErrAlreadyRegistered):
		pkg.RespondError(w, http.StatusConflict, "CONFLICT", err.Error())
	case errors.Is(err, ErrTurnstileFailed):
		pkg.RespondError(w, http.StatusBadRequest, "CAPTCHA_FAILED", err.Error())
	default:
		slog.Error("unexpected error",
			"error", err.Error(),
			"path", r.URL.Path,
			"method", r.Method,
		)
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
	}
}
