package backoffice

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/sathittham/factory-sync-solutions/apps/backend/pkg"
)

// ListAPIDocsVersions godoc
// @Summary      List API docs versions
// @Description  Returns API documentation versions available to superadmins
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      503  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/api-docs/versions [get]
func (h *Handler) ListAPIDocsVersions(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}

	versions, err := h.apiDocsSvc.Versions()
	if err != nil {
		h.handleAPIDocsError(w, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, APIDocsVersionsResponse{Versions: versions})
}

// GetAPIDocsMetadata godoc
// @Summary      Get API docs metadata
// @Description  Returns metadata for the selected API documentation version
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        apiVersion     path    string  true  "API version"  Enums(v1)
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Failure      503  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/api-docs/{apiVersion}/metadata [get]
func (h *Handler) GetAPIDocsMetadata(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}

	metadata, err := h.apiDocsSvc.Metadata(r.Context(), chi.URLParam(r, "apiVersion"))
	if err != nil {
		h.handleAPIDocsError(w, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, metadata)
}

// GetAPIDocsJSON godoc
// @Summary      Get OpenAPI JSON
// @Description  Returns the selected API version OpenAPI JSON document wrapped in the standard response envelope
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        apiVersion     path    string  true  "API version"  Enums(v1)
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Failure      503  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/api-docs/{apiVersion}/openapi.json [get]
func (h *Handler) GetAPIDocsJSON(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}

	spec, err := h.apiDocsSvc.OpenAPIJSON(r.Context(), chi.URLParam(r, "apiVersion"))
	if err != nil {
		h.handleAPIDocsError(w, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, APIDocsSpecResponse{Spec: spec})
}

// GetAPIDocsYAML godoc
// @Summary      Get OpenAPI YAML
// @Description  Returns the selected API version OpenAPI YAML document wrapped in the standard response envelope
// @Tags         Backoffice
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Param        apiVersion     path    string  true  "API version"  Enums(v1)
// @Success      200  {object}  pkg.JSONResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Failure      503  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /backoffice/api-docs/{apiVersion}/openapi.yaml [get]
func (h *Handler) GetAPIDocsYAML(w http.ResponseWriter, r *http.Request) {
	if !h.requireSuperAdmin(w, r) {
		return
	}

	yaml, err := h.apiDocsSvc.OpenAPIYAML(r.Context(), chi.URLParam(r, "apiVersion"))
	if err != nil {
		h.handleAPIDocsError(w, err)
		return
	}
	pkg.RespondJSON(w, http.StatusOK, APIDocsYAMLResponse{YAML: yaml})
}

func (h *Handler) handleAPIDocsError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidAPIDocsVersion), errors.Is(err, ErrAPIDocsNotFound):
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "api docs not found")
	case errors.Is(err, ErrAPIDocsUnavailable):
		slog.Error("backoffice: api docs unavailable", "error", err.Error())
		pkg.RespondError(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", "api docs unavailable")
	default:
		slog.Error("backoffice: api docs failed", "error", err.Error())
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", msgInternalError)
	}
}
