package profile

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"

	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/pkg"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/audit"
)

var (
	ErrProfileNotFound   = errors.New("profile not found")
	ErrAlreadyRegistered = errors.New("user already registered")
	ErrTurnstileFailed   = errors.New("captcha verification failed")
)

type Service struct {
	repo        RepositoryInterface
	turnstile   *pkg.TurnstileClient
	auditLogger *audit.Logger
}

func NewService(repo RepositoryInterface, turnstile *pkg.TurnstileClient) *Service {
	return &Service{repo: repo, turnstile: turnstile}
}

// SetAuditLogger attaches an audit logger to the service. Safe to call after NewService.
func (s *Service) SetAuditLogger(l *audit.Logger) {
	s.auditLogger = l
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

func (s *Service) CreateProfile(ctx context.Context, uid, email, displayName, avatarURL string, req *CreateProfileRequest) (*Profile, error) {
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
		UID:                uid,
		Email:              email,
		DisplayName:        displayName,
		AvatarURL:          avatarURL,
		CompanyName:        req.CompanyName,
		CompanyRegID:       req.CompanyRegID,
		IndustryType:       req.IndustryType,
		CompanySize:        req.CompanySize,
		ContactName:        req.ContactName,
		ContactEmail:       req.ContactEmail,
		ContactPhone:       req.ContactPhone,
		Role:               "owner",
		ProjectRoles:       map[string]string{req.CompanyRegID: "owner"},
		ConsentVersion:     req.ConsentVersion,
		ConsentAt:          now,
		EmailNotifications: true,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := s.repo.Create(ctx, profile); err != nil {
		return nil, fmt.Errorf("create profile: %w", err)
	}

	s.logAudit(ctx, uid, audit.EventUserRegistered, "profile", uid, map[string]any{"companyName": req.CompanyName}, audit.EventDetails{
		TargetUID: uid,
		ProjectID: req.CompanyRegID,
	})
	return profile, nil
}

// CreateInvitedProfile creates a profile from an accepted invitation without
// requiring Turnstile. The invitation has already been authenticated by UID.
func (s *Service) CreateInvitedProfile(ctx context.Context, p *Profile) (*Profile, error) {
	if p == nil {
		return nil, fmt.Errorf("create invited profile: %w", ErrProfileNotFound)
	}

	existing, err := s.repo.GetByUID(ctx, p.UID)
	if err != nil {
		return nil, fmt.Errorf("check existing invited profile: %w", err)
	}
	if existing != nil {
		return nil, ErrAlreadyRegistered
	}

	now := time.Now().UTC().Format(time.RFC3339)
	if p.CreatedAt == "" {
		p.CreatedAt = now
	}
	if p.UpdatedAt == "" {
		p.UpdatedAt = now
	}
	if p.Role == "" {
		p.Role = "owner"
	}
	if p.ContactName == "" {
		p.ContactName = p.DisplayName
	}
	if p.ContactEmail == "" {
		p.ContactEmail = p.Email
	}
	if p.ProjectRoles == nil {
		p.ProjectRoles = map[string]string{p.CompanyRegID: p.Role}
	}
	if _, ok := p.ProjectRoles[p.CompanyRegID]; !ok {
		p.ProjectRoles[p.CompanyRegID] = p.Role
	}
	p.EmailNotifications = true

	if err := s.repo.Create(ctx, p); err != nil {
		return nil, fmt.Errorf("create invited profile: %w", err)
	}

	s.logAudit(ctx, p.UID, audit.EventUserRegistered, "profile", p.UID, map[string]any{"companyName": p.CompanyName}, audit.EventDetails{
		TargetUID: p.UID,
		ProjectID: p.CompanyRegID,
	})
	return p, nil
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
	if err := s.repo.Update(ctx, uid, updates); err != nil {
		return fmt.Errorf("set role for uid %s: %w", uid, err)
	}
	return nil
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
	var changedFields []string

	if req.CompanyName != "" {
		updates = append(updates, firestore.Update{Path: "companyName", Value: req.CompanyName})
		existing.CompanyName = req.CompanyName
		changedFields = append(changedFields, "companyName")
	}
	if req.IndustryType != "" {
		updates = append(updates, firestore.Update{Path: "industryType", Value: req.IndustryType})
		existing.IndustryType = req.IndustryType
		changedFields = append(changedFields, "industryType")
	}
	if req.CompanySize != "" {
		updates = append(updates, firestore.Update{Path: "companySize", Value: req.CompanySize})
		existing.CompanySize = req.CompanySize
		changedFields = append(changedFields, "companySize")
	}
	if req.ContactName != "" {
		updates = append(updates, firestore.Update{Path: "contactName", Value: req.ContactName})
		existing.ContactName = req.ContactName
		changedFields = append(changedFields, "contactName")
	}
	if req.ContactEmail != "" {
		updates = append(updates, firestore.Update{Path: "contactEmail", Value: req.ContactEmail})
		existing.ContactEmail = req.ContactEmail
		changedFields = append(changedFields, "contactEmail")
	}
	if req.ContactPhone != "" {
		updates = append(updates, firestore.Update{Path: "contactPhone", Value: req.ContactPhone})
		existing.ContactPhone = req.ContactPhone
		changedFields = append(changedFields, "contactPhone")
	}
	if req.EmailNotifications != nil {
		updates = append(updates, firestore.Update{Path: "emailNotifications", Value: *req.EmailNotifications})
		existing.EmailNotifications = *req.EmailNotifications
		changedFields = append(changedFields, "emailNotifications")
	}

	if len(updates) == 0 {
		return existing, nil
	}

	updates = append(updates, firestore.Update{Path: "updatedAt", Value: now})
	existing.UpdatedAt = now

	if err := s.repo.Update(ctx, uid, updates); err != nil {
		return nil, fmt.Errorf("update profile: %w", err)
	}

	s.logAudit(ctx, uid, audit.EventUserProfileUpdated, "profile", uid, map[string]any{"changedFields": changedFields}, audit.EventDetails{
		TargetUID: uid,
		ProjectID: existing.CompanyRegID,
	})
	return existing, nil
}

// LogLogin records a user.login audit event for the given uid.
func (s *Service) LogLogin(ctx context.Context, uid string, metadata map[string]any) {
	s.logAudit(ctx, uid, audit.EventUserLogin, "user", uid, metadata, audit.EventDetails{TargetUID: uid})
}

// GetActivity returns the most recent audit events for the given user (max 50).
func (s *Service) GetActivity(ctx context.Context, uid string) ([]ActivityEventResponse, error) {
	if s.auditLogger == nil {
		return []ActivityEventResponse{}, nil
	}

	docs, err := s.auditLogger.QueryByUser(ctx, uid, audit.QueryFilter{Limit: 50})
	if err != nil {
		return nil, fmt.Errorf("get activity for user %s: %w", uid, err)
	}

	events := make([]ActivityEventResponse, 0, len(docs))
	for _, d := range docs {
		events = append(events, ActivityEventResponse{
			ID:           d.ID,
			ActorUID:     d.ActorUID,
			ActorEmail:   d.ActorEmail,
			ActorName:    d.ActorName,
			EventType:    string(d.EventType),
			ResourceType: d.ResourceType,
			ResourceID:   d.ResourceID,
			TargetUID:    d.TargetUID,
			ProjectID:    d.ProjectID,
			CreatedAt:    d.CreatedAt,
			Metadata:     d.Metadata,
		})
	}
	return events, nil
}

func (s *Service) logAudit(ctx context.Context, actorUID string, eventType audit.EventType, resourceType, resourceID string, metadata map[string]any, details audit.EventDetails) {
	if s.auditLogger == nil {
		return
	}
	s.auditLogger.LogWithDetails(ctx, actorUID, eventType, resourceType, resourceID, metadata, details)
}
