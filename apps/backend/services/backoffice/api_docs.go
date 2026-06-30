package backoffice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/aws/smithy-go"
)

const (
	apiDocsSourceFilesystem = "filesystem"
	apiDocsSourceR2         = "r2"
	defaultAPIDocsPrefix    = "openapi"
	defaultAPIDocsVersion   = "v1"
	defaultAPIDocsLocalDir  = "docs"
)

var (
	ErrAPIDocsNotFound       = errors.New("api docs not found")
	ErrAPIDocsUnavailable    = errors.New("api docs unavailable")
	ErrInvalidAPIDocsVersion = errors.New("invalid api docs version")
)

type apiDocsObjectReader interface {
	GetObject(ctx context.Context, bucket, key string) ([]byte, error)
}

type APIDocsService struct {
	source         string
	localDir       string
	r2Bucket       string
	r2Prefix       string
	defaultVersion string
	versions       []APIDocsVersion
	reader         apiDocsObjectReader
	disabledErr    error
}

type r2APIDocsReader struct {
	client *s3.Client
}

func newR2APIDocsReader(accountID, accessKeyID, accessKeySecret string) (*r2APIDocsReader, error) {
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, accessKeySecret, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		return nil, fmt.Errorf("load api docs r2 config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
	})
	return &r2APIDocsReader{client: client}, nil
}

func (r *r2APIDocsReader) GetObject(ctx context.Context, bucket, key string) ([]byte, error) {
	output, err := r.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		var noSuchKey *types.NoSuchKey
		if errors.As(err, &noSuchKey) {
			return nil, fmt.Errorf("get api docs r2 object: %w", ErrAPIDocsNotFound)
		}
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) && (apiErr.ErrorCode() == "NoSuchKey" || apiErr.ErrorCode() == "NoSuchBucket") {
			return nil, fmt.Errorf("get api docs r2 object: %w", ErrAPIDocsNotFound)
		}
		return nil, fmt.Errorf("get api docs r2 object: %w", err)
	}
	defer output.Body.Close()

	body, err := io.ReadAll(output.Body)
	if err != nil {
		return nil, fmt.Errorf("read api docs r2 object: %w", err)
	}
	return body, nil
}

func NewAPIDocsServiceFromEnv() *APIDocsService {
	source := strings.TrimSpace(os.Getenv("API_DOCS_SOURCE"))
	if source == "" {
		source = apiDocsSourceFilesystem
	}
	localDir := strings.TrimSpace(os.Getenv("API_DOCS_LOCAL_DIR"))
	if localDir == "" {
		localDir = defaultAPIDocsLocalDir
	}
	prefix := strings.Trim(strings.TrimSpace(os.Getenv("API_DOCS_R2_PREFIX")), "/")
	if prefix == "" {
		prefix = defaultAPIDocsPrefix
	}
	defaultVersion := strings.TrimSpace(os.Getenv("API_DOCS_DEFAULT_VERSION"))
	if defaultVersion == "" {
		defaultVersion = defaultAPIDocsVersion
	}
	versions := parseAPIDocsVersions(os.Getenv("API_DOCS_SUPPORTED_VERSIONS"), defaultVersion)

	service := &APIDocsService{
		source:         source,
		localDir:       localDir,
		r2Bucket:       strings.TrimSpace(os.Getenv("API_DOCS_R2_BUCKET")),
		r2Prefix:       prefix,
		defaultVersion: defaultVersion,
		versions:       versions,
	}

	if source != apiDocsSourceR2 {
		return service
	}

	accountID := strings.TrimSpace(os.Getenv("API_DOCS_R2_ACCOUNT_ID"))
	accessKeyID := strings.TrimSpace(os.Getenv("API_DOCS_R2_ACCESS_KEY_ID"))
	accessKeySecret := strings.TrimSpace(os.Getenv("API_DOCS_R2_ACCESS_KEY_SECRET"))
	missing := missingAPIDocsR2Env(map[string]string{
		"API_DOCS_R2_ACCOUNT_ID":        accountID,
		"API_DOCS_R2_ACCESS_KEY_ID":     accessKeyID,
		"API_DOCS_R2_ACCESS_KEY_SECRET": accessKeySecret,
		"API_DOCS_R2_BUCKET":            service.r2Bucket,
	})
	if len(missing) > 0 {
		service.disabledErr = fmt.Errorf("%w: missing %s", ErrAPIDocsUnavailable, strings.Join(missing, ", "))
		return service
	}

	reader, err := newR2APIDocsReader(accountID, accessKeyID, accessKeySecret)
	if err != nil {
		service.disabledErr = fmt.Errorf("%w: %v", ErrAPIDocsUnavailable, err)
		return service
	}
	service.reader = reader
	return service
}

func NewAPIDocsServiceForFilesystem(localDir, defaultVersion string, versions []string) *APIDocsService {
	if defaultVersion == "" {
		defaultVersion = defaultAPIDocsVersion
	}
	return &APIDocsService{
		source:         apiDocsSourceFilesystem,
		localDir:       localDir,
		defaultVersion: defaultVersion,
		versions:       buildAPIDocsVersions(versions, defaultVersion),
	}
}

func parseAPIDocsVersions(raw, defaultVersion string) []APIDocsVersion {
	parts := strings.Split(raw, ",")
	versions := make([]string, 0, len(parts))
	for _, part := range parts {
		version := strings.TrimSpace(part)
		if version != "" {
			versions = append(versions, version)
		}
	}
	if len(versions) == 0 {
		versions = []string{defaultVersion}
	}
	return buildAPIDocsVersions(versions, defaultVersion)
}

func buildAPIDocsVersions(versions []string, defaultVersion string) []APIDocsVersion {
	result := make([]APIDocsVersion, 0, len(versions))
	seen := make(map[string]bool, len(versions))
	for _, version := range versions {
		version = strings.TrimSpace(version)
		if version == "" || seen[version] {
			continue
		}
		seen[version] = true
		result = append(result, APIDocsVersion{
			APIVersion: version,
			Label:      "API " + version,
			IsCurrent:  version == defaultVersion,
		})
	}
	return result
}

func missingAPIDocsR2Env(values map[string]string) []string {
	missing := make([]string, 0)
	for name, value := range values {
		if strings.TrimSpace(value) == "" {
			missing = append(missing, name)
		}
	}
	return missing
}

func (s *APIDocsService) Versions() ([]APIDocsVersion, error) {
	if err := s.ensureConfigured(); err != nil {
		return nil, err
	}
	return append([]APIDocsVersion(nil), s.versions...), nil
}

func (s *APIDocsService) Metadata(ctx context.Context, apiVersion string) (*APIDocsMetadata, error) {
	body, err := s.readArtifact(ctx, apiVersion, "metadata.json")
	if err != nil {
		return nil, err
	}
	var metadata APIDocsMetadata
	if err := json.Unmarshal(body, &metadata); err != nil {
		return nil, fmt.Errorf("decode api docs metadata: %w", err)
	}
	return &metadata, nil
}

func (s *APIDocsService) OpenAPIJSON(ctx context.Context, apiVersion string) (any, error) {
	body, err := s.readArtifact(ctx, apiVersion, "swagger.json")
	if err != nil {
		return nil, err
	}
	var spec any
	if err := json.Unmarshal(body, &spec); err != nil {
		return nil, fmt.Errorf("decode api docs json: %w", err)
	}
	return spec, nil
}

func (s *APIDocsService) OpenAPIYAML(ctx context.Context, apiVersion string) (string, error) {
	body, err := s.readArtifact(ctx, apiVersion, "swagger.yaml")
	if err != nil {
		return "", err
	}
	return string(body), nil
}

func (s *APIDocsService) readArtifact(ctx context.Context, apiVersion, filename string) ([]byte, error) {
	if err := s.ensureConfigured(); err != nil {
		return nil, err
	}
	if !s.isSupportedVersion(apiVersion) {
		return nil, fmt.Errorf("unsupported api docs version %q: %w", apiVersion, ErrInvalidAPIDocsVersion)
	}

	switch s.source {
	case apiDocsSourceFilesystem:
		return s.readFilesystemArtifact(apiVersion, filename)
	case apiDocsSourceR2:
		key := strings.Join([]string{s.r2Prefix, apiVersion, "current", filename}, "/")
		body, err := s.reader.GetObject(ctx, s.r2Bucket, key)
		if err != nil {
			return nil, fmt.Errorf("read api docs r2 artifact: %w", err)
		}
		return body, nil
	default:
		return nil, fmt.Errorf("unknown api docs source %q: %w", s.source, ErrAPIDocsUnavailable)
	}
}

func (s *APIDocsService) readFilesystemArtifact(apiVersion, filename string) ([]byte, error) {
	path := filepath.Join(s.localDir, apiVersion, filename)
	body, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("read api docs filesystem artifact: %w", ErrAPIDocsNotFound)
		}
		return nil, fmt.Errorf("read api docs filesystem artifact: %w", err)
	}
	return body, nil
}

func (s *APIDocsService) ensureConfigured() error {
	if s == nil {
		return ErrAPIDocsUnavailable
	}
	if s.disabledErr != nil {
		return s.disabledErr
	}
	if len(s.versions) == 0 {
		return fmt.Errorf("no api docs versions configured: %w", ErrAPIDocsUnavailable)
	}
	if s.source == apiDocsSourceR2 && s.reader == nil {
		return fmt.Errorf("api docs r2 reader is not configured: %w", ErrAPIDocsUnavailable)
	}
	return nil
}

func (s *APIDocsService) isSupportedVersion(apiVersion string) bool {
	for _, version := range s.versions {
		if version.APIVersion == apiVersion {
			return true
		}
	}
	return false
}
