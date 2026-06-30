package backoffice

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/go-chi/chi/v5"
)

type fakeAPIDocsReader struct {
	objects map[string][]byte
	err     error
	calls   int
}

func (r *fakeAPIDocsReader) GetObject(_ context.Context, bucket, key string) ([]byte, error) {
	r.calls++
	if r.err != nil {
		return nil, r.err
	}
	body, ok := r.objects[bucket+"/"+key]
	if !ok {
		return nil, fmt.Errorf("missing fake object: %w", ErrAPIDocsNotFound)
	}
	return body, nil
}

func writeAPIDocsFixture(t *testing.T, root string) {
	t.Helper()
	versionDir := filepath.Join(root, "v1")
	if err := os.MkdirAll(versionDir, 0o755); err != nil {
		t.Fatalf("mkdir fixture: %v", err)
	}
	files := map[string]string{
		"metadata.json": `{"environment":"development","apiVersion":"v1","gitSHA":"abc123","generatedAt":"2026-06-14T08:00:00Z","openapiVersion":"2.0","jsonKey":"openapi/v1/current/swagger.json","yamlKey":"openapi/v1/current/swagger.yaml"}`,
		"swagger.json":  `{"swagger":"2.0","info":{"title":"FactorySync Solutions API","version":"v1"}}`,
		"swagger.yaml":  "swagger: \"2.0\"\ninfo:\n  title: FactorySync Solutions API\n  version: v1\n",
	}
	for name, body := range files {
		if err := os.WriteFile(filepath.Join(versionDir, name), []byte(body), 0o644); err != nil {
			t.Fatalf("write fixture %s: %v", name, err)
		}
	}
}

func TestAPIDocsServiceVersions(t *testing.T) {
	svc := NewAPIDocsServiceForFilesystem(t.TempDir(), "v2", []string{"v1", "v2", "v2"})

	versions, err := svc.Versions()
	if err != nil {
		t.Fatalf("Versions() error = %v", err)
	}
	if len(versions) != 2 {
		t.Fatalf("len(versions) = %d, want 2", len(versions))
	}
	if versions[0].APIVersion != "v1" || versions[0].IsCurrent {
		t.Fatalf("versions[0] = %+v, want v1 non-current", versions[0])
	}
	if versions[1].APIVersion != "v2" || !versions[1].IsCurrent {
		t.Fatalf("versions[1] = %+v, want v2 current", versions[1])
	}
}

func TestAPIDocsServiceFilesystemReadsArtifacts(t *testing.T) {
	root := t.TempDir()
	writeAPIDocsFixture(t, root)
	svc := NewAPIDocsServiceForFilesystem(root, "v1", []string{"v1"})

	metadata, err := svc.Metadata(context.Background(), "v1")
	if err != nil {
		t.Fatalf("Metadata() error = %v", err)
	}
	if metadata.APIVersion != "v1" || metadata.GitSHA != "abc123" {
		t.Fatalf("metadata = %+v, want v1 abc123", metadata)
	}

	spec, err := svc.OpenAPIJSON(context.Background(), "v1")
	if err != nil {
		t.Fatalf("OpenAPIJSON() error = %v", err)
	}
	specMap, ok := spec.(map[string]any)
	if !ok || specMap["swagger"] != "2.0" {
		t.Fatalf("spec = %#v, want swagger 2.0", spec)
	}

	yaml, err := svc.OpenAPIYAML(context.Background(), "v1")
	if err != nil {
		t.Fatalf("OpenAPIYAML() error = %v", err)
	}
	if yaml == "" {
		t.Fatal("yaml is empty")
	}
}

func TestAPIDocsServiceUnsupportedVersion(t *testing.T) {
	root := t.TempDir()
	writeAPIDocsFixture(t, root)
	svc := NewAPIDocsServiceForFilesystem(root, "v1", []string{"v1"})

	_, err := svc.Metadata(context.Background(), "v2")
	if !errors.Is(err, ErrInvalidAPIDocsVersion) {
		t.Fatalf("Metadata() error = %v, want ErrInvalidAPIDocsVersion", err)
	}
}

func TestAPIDocsServiceMissingArtifact(t *testing.T) {
	svc := NewAPIDocsServiceForFilesystem(t.TempDir(), "v1", []string{"v1"})

	_, err := svc.Metadata(context.Background(), "v1")
	if !errors.Is(err, ErrAPIDocsNotFound) {
		t.Fatalf("Metadata() error = %v, want ErrAPIDocsNotFound", err)
	}
}

func TestAPIDocsServiceR2ReadsCurrentArtifacts(t *testing.T) {
	reader := &fakeAPIDocsReader{
		objects: map[string][]byte{
			"docs-bucket/openapi/v1/current/metadata.json": []byte(`{"environment":"staging","apiVersion":"v1","gitSHA":"abc123","generatedAt":"2026-06-14T08:00:00Z","openapiVersion":"2.0","jsonKey":"openapi/v1/current/swagger.json","yamlKey":"openapi/v1/current/swagger.yaml"}`),
		},
	}
	svc := &APIDocsService{
		source:         apiDocsSourceR2,
		r2Bucket:       "docs-bucket",
		r2Prefix:       "openapi",
		defaultVersion: "v1",
		versions:       buildAPIDocsVersions([]string{"v1"}, "v1"),
		reader:         reader,
	}

	metadata, err := svc.Metadata(context.Background(), "v1")
	if err != nil {
		t.Fatalf("Metadata() error = %v", err)
	}
	if metadata.Environment != "staging" || metadata.JSONKey != "openapi/v1/current/swagger.json" {
		t.Fatalf("metadata = %+v, want staging current json key", metadata)
	}
	if reader.calls != 1 {
		t.Fatalf("reader.calls = %d, want 1", reader.calls)
	}
}

func TestAPIDocsServiceR2ReadFailureWrapsError(t *testing.T) {
	reader := &fakeAPIDocsReader{err: fmt.Errorf("r2 down: %w", ErrAPIDocsUnavailable)}
	svc := &APIDocsService{
		source:         apiDocsSourceR2,
		r2Bucket:       "docs-bucket",
		r2Prefix:       "openapi",
		defaultVersion: "v1",
		versions:       buildAPIDocsVersions([]string{"v1"}, "v1"),
		reader:         reader,
	}

	_, err := svc.Metadata(context.Background(), "v1")
	if !errors.Is(err, ErrAPIDocsUnavailable) {
		t.Fatalf("Metadata() error = %v, want ErrAPIDocsUnavailable", err)
	}
}

func TestGetAPIDocsMetadataRejectsBeforeDocsReadWhenNotSuperAdmin(t *testing.T) {
	reader := &fakeAPIDocsReader{
		objects: map[string][]byte{
			"docs-bucket/openapi/v1/current/metadata.json": []byte(`{"environment":"staging","apiVersion":"v1","gitSHA":"abc123","generatedAt":"2026-06-14T08:00:00Z","openapiVersion":"2.0","jsonKey":"openapi/v1/current/swagger.json","yamlKey":"openapi/v1/current/swagger.yaml"}`),
		},
	}
	handler := &Handler{
		apiDocsSvc: &APIDocsService{
			source:         apiDocsSourceR2,
			r2Bucket:       "docs-bucket",
			r2Prefix:       "openapi",
			defaultVersion: "v1",
			versions:       buildAPIDocsVersions([]string{"v1"}, "v1"),
			reader:         reader,
		},
		requireSuperAdminCheck: func(w http.ResponseWriter, _ *http.Request) bool {
			http.Error(w, "superadmin access required", http.StatusForbidden)
			return false
		},
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/backoffice/api-docs/v1/metadata", nil)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("apiVersion", "v1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx))
	rr := httptest.NewRecorder()

	handler.GetAPIDocsMetadata(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusForbidden)
	}
	if reader.calls != 0 {
		t.Fatalf("reader.calls = %d, want 0", reader.calls)
	}
}
