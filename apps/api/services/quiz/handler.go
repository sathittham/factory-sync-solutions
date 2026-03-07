package quiz

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/sathittham/factory-health-check/apps/api/middleware"
	"github.com/sathittham/factory-health-check/apps/api/pkg"
)

type Handler struct {
	service    *Service
	profileSvc profileGetter
}

// profileGetter is a minimal interface to look up profile data for notifications.
type profileGetter interface {
	GetProfileData(ctx interface{}, uid string) (contactEmail, contactName, companyName string, err error)
}

func NewHandler(svc *Service, profileSvc profileGetter) *Handler {
	return &Handler{service: svc, profileSvc: profileSvc}
}

// Routes registers all quiz routes on the given router.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/questions", h.GetQuestions)
	r.Post("/submit", h.SubmitQuiz)
}

// GetQuestions godoc
// @Summary      Get quiz questions
// @Description  Returns all quiz questions grouped by dimension
// @Tags         Quiz
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/quiz/questions [get]
func (h *Handler) GetQuestions(w http.ResponseWriter, r *http.Request) {
	pkg.RespondJSON(w, http.StatusOK, h.service.GetQuestions())
}

// SubmitQuiz godoc
// @Summary      Submit quiz answers
// @Description  Submit all quiz answers for scoring and diagnosis
// @Tags         Quiz
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string           true  "Bearer {firebase-id-token}"
// @Param        request        body    SubmitQuizRequest true  "Quiz answers"
// @Success      201  {object}  map[string]any
// @Failure      400  {object}  map[string]any
// @Failure      401  {object}  map[string]any
// @Failure      500  {object}  map[string]any
// @Security     BearerAuth
// @Router       /api/v1/quiz/submit [post]
func (h *Handler) SubmitQuiz(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)

	var req SubmitQuizRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}

	if err := pkg.Validate.Struct(req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	// Look up profile for notification details
	var contactEmail, contactName, companyName string
	if h.profileSvc != nil {
		var err error
		contactEmail, contactName, companyName, err = h.profileSvc.GetProfileData(r.Context(), uid)
		if err != nil {
			slog.Warn("could not fetch profile for notification", "uid", uid, "error", err.Error())
		}
	}

	assessment, err := h.service.SubmitQuiz(r.Context(), uid, contactEmail, contactName, companyName, req.Answers)
	if err != nil {
		handleError(w, r, err)
		return
	}

	pkg.RespondJSON(w, http.StatusCreated, assessment)
}

func handleError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, ErrIncompleteAnswers):
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
	case errors.Is(err, ErrInvalidAnswer):
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
	default:
		slog.Error("unexpected error",
			"error", err.Error(),
			"path", r.URL.Path,
			"method", r.Method,
		)
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
	}
}
