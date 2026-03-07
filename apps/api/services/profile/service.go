package profile

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"

	"github.com/sathittham/factory-health-check/apps/api/pkg"
)

var (
	ErrProfileNotFound      = errors.New("profile not found")
	ErrAlreadyRegistered    = errors.New("user already registered")
	ErrTurnstileFailed      = errors.New("captcha verification failed")
)

type Service struct {
	repo      RepositoryInterface
	turnstile *pkg.TurnstileClient
}

func NewService(repo RepositoryInterface, turnstile *pkg.TurnstileClient) *Service {
	return &Service{repo: repo, turnstile: turnstile}
}

func (s *Service) GetProfile(ctx context.Context, uid string) (*Profile, error) {
	profile, err := s.repo.GetByUID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("get profile: %w", err)
	}
	if profile == nil {
		return nil, ErrProfileNotFound
	}
	return profile, nil
}

func (s *Service) CheckRegID(ctx context.Context, regID string) (*Profile, error) {
	profile, err := s.repo.GetByRegID(ctx, regID)
	if err != nil {
		return nil, fmt.Errorf("check reg id: %w", err)
	}
	return profile, nil
}

func (s *Service) CreateProfile(ctx context.Context, uid, email, displayName string, req *CreateProfileRequest) (*Profile, error) {
	// Verify Turnstile token
	if s.turnstile != nil {
		ok, err := s.turnstile.Verify(ctx, req.TurnstileToken)
		if err != nil {
			return nil, fmt.Errorf("turnstile verification: %w", ErrTurnstileFailed)
		}
		if !ok {
			return nil, ErrTurnstileFailed
		}
	}

	// Check if already registered
	existing, err := s.repo.GetByUID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("check existing profile: %w", err)
	}
	if existing != nil {
		return nil, ErrAlreadyRegistered
	}

	now := time.Now().UTC().Format(time.RFC3339)
	profile := &Profile{
		UID:          uid,
		Email:        email,
		DisplayName:  displayName,
		CompanyName:  req.CompanyName,
		CompanyRegID: req.CompanyRegID,
		IndustryType: req.IndustryType,
		CompanySize:  req.CompanySize,
		ContactName:  req.ContactName,
		ContactEmail: req.ContactEmail,
		ContactPhone: req.ContactPhone,
		Role:         "user",
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.repo.Create(ctx, profile); err != nil {
		return nil, fmt.Errorf("create profile: %w", err)
	}
	return profile, nil
}

// GetProfilesByUIDs returns profiles for the given UIDs (batch lookup for admin).
func (s *Service) GetProfilesByUIDs(ctx context.Context, uids []string) (map[string]*Profile, error) {
	profiles, err := s.repo.GetByUIDs(ctx, uids)
	if err != nil {
		return nil, fmt.Errorf("get profiles by uids: %w", err)
	}
	return profiles, nil
}

// ListProfiles returns all user profiles (admin use).
func (s *Service) ListProfiles(ctx context.Context, limit int) ([]*Profile, error) {
	return s.repo.ListAll(ctx, limit)
}

// SetRole updates the role field on a user's profile.
func (s *Service) SetRole(ctx context.Context, uid, role string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	updates := []firestore.Update{
		{Path: "role", Value: role},
		{Path: "updatedAt", Value: now},
	}
	return s.repo.Update(ctx, uid, updates)
}

func (s *Service) UpdateProfile(ctx context.Context, uid string, req *UpdateProfileRequest) (*Profile, error) {
	existing, err := s.repo.GetByUID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("get profile for update: %w", err)
	}
	if existing == nil {
		return nil, ErrProfileNotFound
	}

	now := time.Now().UTC().Format(time.RFC3339)
	var updates []firestore.Update

	if req.CompanyName != "" {
		updates = append(updates, firestore.Update{Path: "companyName", Value: req.CompanyName})
		existing.CompanyName = req.CompanyName
	}
	if req.IndustryType != "" {
		updates = append(updates, firestore.Update{Path: "industryType", Value: req.IndustryType})
		existing.IndustryType = req.IndustryType
	}
	if req.CompanySize != "" {
		updates = append(updates, firestore.Update{Path: "companySize", Value: req.CompanySize})
		existing.CompanySize = req.CompanySize
	}
	if req.ContactName != "" {
		updates = append(updates, firestore.Update{Path: "contactName", Value: req.ContactName})
		existing.ContactName = req.ContactName
	}
	if req.ContactEmail != "" {
		updates = append(updates, firestore.Update{Path: "contactEmail", Value: req.ContactEmail})
		existing.ContactEmail = req.ContactEmail
	}
	if req.ContactPhone != "" {
		updates = append(updates, firestore.Update{Path: "contactPhone", Value: req.ContactPhone})
		existing.ContactPhone = req.ContactPhone
	}

	if len(updates) == 0 {
		return existing, nil
	}

	updates = append(updates, firestore.Update{Path: "updatedAt", Value: now})
	existing.UpdatedAt = now

	if err := s.repo.Update(ctx, uid, updates); err != nil {
		return nil, fmt.Errorf("update profile: %w", err)
	}
	return existing, nil
}
