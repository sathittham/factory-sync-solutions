package upload

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/time/rate"

	"github.com/sathittham/factory-sync-solutions/apps/backend/middleware"
	"github.com/sathittham/factory-sync-solutions/apps/backend/pkg"
)

const multipartMemory = 4 << 20

// avatarUploadRateLimit caps avatar uploads at 10 per minute per user, on top
// of the global per-IP limiter — the image decode/resize/encode pipeline is
// the most expensive operation this service exposes.
var avatarUploadRateLimit = middleware.RateLimitByUID("upload-avatar", rate.Every(6*time.Second), 10)

// fileUploadRateLimit caps the backoffice general-upload utility at 20 per
// minute per user, on top of the global per-IP limiter.
var fileUploadRateLimit = middleware.RateLimitByUID("upload-file", rate.Every(3*time.Second), 20)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Routes(r chi.Router) {
	r.With(avatarUploadRateLimit).Post("/avatar", h.UploadAvatar)
	r.Delete("/avatar", h.DeleteAvatar)
}

// BackofficeRoutes registers the general-purpose upload utility, mounted
// under /backoffice/upload and gated to backoffice staff/superadmin by the
// RequireBackofficeRole middleware in main.go.
func (h *Handler) BackofficeRoutes(r chi.Router) {
	r.With(fileUploadRateLimit).Post("/file", h.UploadFile)
}

// UploadAvatar godoc
// @Summary      Upload avatar
// @Description  Uploads, crops, converts, and stores the authenticated user's avatar in R2
// @Tags         Upload
// @Accept       multipart/form-data
// @Produce      json
// @Param        Authorization  header    string  true  "Bearer {firebase-id-token}"
// @Param        file           formData  file    true  "Avatar image"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Failure      503  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /upload/avatar [post]
func (h *Handler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	r.Body = http.MaxBytesReader(w, r.Body, AvatarMaxBytes+multipartMemory)

	if err := r.ParseMultipartForm(multipartMemory); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid multipart form")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "file is required")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, AvatarMaxBytes+1))
	if err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "could not read file")
		return
	}
	if len(data) > AvatarMaxBytes {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", fmt.Sprintf("file must be %d bytes or less", AvatarMaxBytes))
		return
	}

	resp, err := h.service.UploadAvatar(r.Context(), uid, data)
	if err != nil {
		handleUploadError(w, r, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, resp)
}

// DeleteAvatar godoc
// @Summary      Delete avatar
// @Description  Deletes the authenticated user's avatar from R2 and clears avatarURL
// @Tags         Upload
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      204
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Failure      503  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /upload/avatar [delete]
func (h *Handler) DeleteAvatar(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	if err := h.service.DeleteAvatar(r.Context(), uid); err != nil {
		handleUploadError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// UploadFile godoc
// @Summary      Upload a general file (backoffice utility)
// @Description  Uploads an image, PDF, or spreadsheet as-is to R2 and returns its CDN URL. Backoffice staff/superadmin only.
// @Tags         Upload
// @Accept       multipart/form-data
// @Produce      json
// @Param        Authorization  header    string  true  "Bearer {firebase-id-token}"
// @Param        file           formData  file    true  "File to upload"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      503  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/upload/file [post]
func (h *Handler) UploadFile(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, GeneralFileMaxBytes+multipartMemory)

	if err := r.ParseMultipartForm(multipartMemory); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "file is required")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, GeneralFileMaxBytes+1))
	if err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "could not read file")
		return
	}
	if len(data) > GeneralFileMaxBytes {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", fmt.Sprintf("file must be %d bytes or less", GeneralFileMaxBytes))
		return
	}

	resp, err := h.service.UploadFile(r.Context(), header.Filename, data)
	if err != nil {
		handleUploadError(w, r, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, resp)
}

func handleUploadError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, ErrUploadDisabled):
		pkg.RespondError(w, http.StatusServiceUnavailable, "UPLOAD_DISABLED", "upload service is not configured")
	case errors.Is(err, ErrFileTooLarge), errors.Is(err, ErrInvalidFileType), errors.Is(err, ErrInvalidImage):
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
	case errors.Is(err, ErrProfileNotFound):
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	default:
		slog.Error("upload error", "error", err.Error(), "path", r.URL.Path, "method", r.Method)
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
	}
}
