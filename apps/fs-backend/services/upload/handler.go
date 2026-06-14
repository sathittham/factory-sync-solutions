package upload

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/middleware"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/pkg"
)

const multipartMemory = 4 << 20

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Routes(r chi.Router) {
	r.Post("/avatar", h.UploadAvatar)
	r.Delete("/avatar", h.DeleteAvatar)
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
