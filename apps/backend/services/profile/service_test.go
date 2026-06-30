package profile

import (
	"context"
	"errors"
	"testing"

	"cloud.google.com/go/firestore"
)

type MockRepository struct {
	GetByUIDFunc   func(ctx context.Context, uid string) (*Profile, error)
	GetByRegIDFunc func(ctx context.Context, regID string) (*Profile, error)
	CreateFunc     func(ctx context.Context, profile *Profile) error
	UpdateFunc     func(ctx context.Context, uid string, updates []firestore.Update) error
}

var _ RepositoryInterface = (*MockRepository)(nil)

func (m *MockRepository) GetByUID(ctx context.Context, uid string) (*Profile, error) {
	if m.GetByUIDFunc != nil {
		return m.GetByUIDFunc(ctx, uid)
	}
	return nil, nil
}

func (m *MockRepository) GetByRegID(ctx context.Context, regID string) (*Profile, error) {
	if m.GetByRegIDFunc != nil {
		return m.GetByRegIDFunc(ctx, regID)
	}
	return nil, nil
}

func (m *MockRepository) Create(ctx context.Context, profile *Profile) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, profile)
	}
	return nil
}

func (m *MockRepository) Update(ctx context.Context, uid string, updates []firestore.Update) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, uid, updates)
	}
	return nil
}

func (m *MockRepository) ListAll(ctx context.Context, limit int) ([]*Profile, error) {
	return nil, nil
}

func (m *MockRepository) GetByUIDs(ctx context.Context, uids []string) (map[string]*Profile, error) {
	result := make(map[string]*Profile)
	for _, uid := range uids {
		p, err := m.GetByUID(ctx, uid)
		if err != nil {
			return nil, err
		}
		if p != nil {
			result[uid] = p
		}
	}
	return result, nil
}

func TestGetProfile_Success(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(ctx context.Context, uid string) (*Profile, error) {
			return &Profile{UID: uid, CompanyName: "ABC Factory"}, nil
		},
	}
	svc := NewService(mock, nil)

	profile, err := svc.GetProfile(context.Background(), "uid-123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if profile.CompanyName != "ABC Factory" {
		t.Errorf("companyName = %s, want ABC Factory", profile.CompanyName)
	}
}

func TestGetProfile_NotFound(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(ctx context.Context, uid string) (*Profile, error) {
			return nil, nil
		},
	}
	svc := NewService(mock, nil)

	_, err := svc.GetProfile(context.Background(), "nonexistent")
	if !errors.Is(err, ErrProfileNotFound) {
		t.Fatalf("error = %v, want ErrProfileNotFound", err)
	}
}

func TestCreateProfile_Success(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(ctx context.Context, uid string) (*Profile, error) {
			return nil, nil // not found — can create
		},
		CreateFunc: func(ctx context.Context, profile *Profile) error {
			return nil
		},
	}
	svc := NewService(mock, nil)

	profile, err := svc.CreateProfile(context.Background(), "uid-123", "test@example.com", "Test User", "https://example.com/avatar.png", &CreateProfileRequest{
		CompanyName:    "ABC Factory",
		CompanyRegID:   "1234567890123",
		IndustryType:   "manufacturing",
		CompanySize:    "medium",
		ContactName:    "Somchai",
		ContactEmail:   "somchai@abc.com",
		ContactPhone:   "0812345678",
		TurnstileToken: "test-token",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if profile.UID != "uid-123" {
		t.Errorf("uid = %s, want uid-123", profile.UID)
	}
	if profile.Role != "owner" {
		t.Errorf("role = %s, want owner", profile.Role)
	}
	if profile.ProjectRoles["1234567890123"] != "owner" {
		t.Errorf("project role = %s, want owner", profile.ProjectRoles["1234567890123"])
	}
	if profile.Email != "test@example.com" {
		t.Errorf("email = %s, want test@example.com", profile.Email)
	}
	if profile.AvatarURL != "https://example.com/avatar.png" {
		t.Errorf("avatarURL = %s, want https://example.com/avatar.png", profile.AvatarURL)
	}
}

func TestCreateProfile_AlreadyRegistered(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(ctx context.Context, uid string) (*Profile, error) {
			return &Profile{UID: uid}, nil // already exists
		},
	}
	svc := NewService(mock, nil)

	_, err := svc.CreateProfile(context.Background(), "uid-123", "test@example.com", "Test User", "", &CreateProfileRequest{
		CompanyName:    "ABC Factory",
		CompanyRegID:   "1234567890123",
		IndustryType:   "manufacturing",
		CompanySize:    "medium",
		ContactName:    "Somchai",
		ContactEmail:   "somchai@abc.com",
		ContactPhone:   "0812345678",
		TurnstileToken: "test-token",
	})
	if !errors.Is(err, ErrAlreadyRegistered) {
		t.Fatalf("error = %v, want ErrAlreadyRegistered", err)
	}
}
