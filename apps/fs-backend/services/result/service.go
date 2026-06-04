package result

import (
	"context"
	"errors"
	"fmt"
)

var ErrResultNotFound = errors.New("result not found")

type Service struct {
	repo RepositoryInterface
}

func NewService(repo RepositoryInterface) *Service {
	return &Service{repo: repo}
}

// StoreResult persists a completed assessment.
func (s *Service) StoreResult(ctx context.Context, assessment *Assessment) error {
	if err := s.repo.Create(ctx, assessment); err != nil {
		return fmt.Errorf("store result: %w", err)
	}
	return nil
}

// GetResult returns a specific assessment, scoped to the requesting user.
func (s *Service) GetResult(ctx context.Context, uid, assessmentID string) (*Assessment, error) {
	a, err := s.repo.GetByID(ctx, assessmentID)
	if err != nil {
		return nil, fmt.Errorf("get result: %w", err)
	}
	if a == nil || a.UID != uid {
		return nil, ErrResultNotFound
	}
	return a, nil
}

// GetUserResults returns all assessments for the authenticated user.
func (s *Service) GetUserResults(ctx context.Context, uid string) ([]Assessment, error) {
	results, err := s.repo.GetByUID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("get user results: %w", err)
	}
	return results, nil
}

// ListResults returns all assessments (admin use).
func (s *Service) ListResults(ctx context.Context, filters map[string]string, limit int) ([]Assessment, error) {
	results, err := s.repo.ListAll(ctx, filters, limit)
	if err != nil {
		return nil, fmt.Errorf("list results: %w", err)
	}
	return results, nil
}
