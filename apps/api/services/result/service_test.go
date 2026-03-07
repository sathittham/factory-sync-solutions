package result

import (
	"context"
	"errors"
	"testing"
)

type MockRepository struct {
	CreateFunc  func(ctx context.Context, assessment *Assessment) error
	GetByIDFunc func(ctx context.Context, id string) (*Assessment, error)
	GetByUIDFunc func(ctx context.Context, uid string) ([]Assessment, error)
	ListAllFunc func(ctx context.Context, filters map[string]string, limit int) ([]Assessment, error)
}

var _ RepositoryInterface = (*MockRepository)(nil)

func (m *MockRepository) Create(ctx context.Context, assessment *Assessment) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, assessment)
	}
	return nil
}

func (m *MockRepository) GetByID(ctx context.Context, id string) (*Assessment, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, nil
}

func (m *MockRepository) GetByUID(ctx context.Context, uid string) ([]Assessment, error) {
	if m.GetByUIDFunc != nil {
		return m.GetByUIDFunc(ctx, uid)
	}
	return nil, nil
}

func (m *MockRepository) ListAll(ctx context.Context, filters map[string]string, limit int) ([]Assessment, error) {
	if m.ListAllFunc != nil {
		return m.ListAllFunc(ctx, filters, limit)
	}
	return nil, nil
}

func TestStoreResult_Success(t *testing.T) {
	var stored *Assessment
	mock := &MockRepository{
		CreateFunc: func(_ context.Context, a *Assessment) error {
			stored = a
			return nil
		},
	}
	svc := NewService(mock)

	a := &Assessment{ID: "a-1", UID: "u-1", OverallScore: 3.5}
	if err := svc.StoreResult(context.Background(), a); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if stored == nil || stored.ID != "a-1" {
		t.Fatal("assessment was not stored")
	}
}

func TestStoreResult_RepoError(t *testing.T) {
	mock := &MockRepository{
		CreateFunc: func(_ context.Context, _ *Assessment) error {
			return errors.New("firestore down")
		},
	}
	svc := NewService(mock)

	err := svc.StoreResult(context.Background(), &Assessment{ID: "a-1"})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestGetResult_Success(t *testing.T) {
	mock := &MockRepository{
		GetByIDFunc: func(_ context.Context, id string) (*Assessment, error) {
			return &Assessment{ID: id, UID: "u-1", OverallScore: 4.0}, nil
		},
	}
	svc := NewService(mock)

	a, err := svc.GetResult(context.Background(), "u-1", "a-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if a.ID != "a-1" {
		t.Errorf("id = %s, want a-1", a.ID)
	}
}

func TestGetResult_NotFound(t *testing.T) {
	mock := &MockRepository{
		GetByIDFunc: func(_ context.Context, _ string) (*Assessment, error) {
			return nil, nil
		},
	}
	svc := NewService(mock)

	_, err := svc.GetResult(context.Background(), "u-1", "nonexistent")
	if !errors.Is(err, ErrResultNotFound) {
		t.Fatalf("error = %v, want ErrResultNotFound", err)
	}
}

func TestGetResult_WrongUser(t *testing.T) {
	mock := &MockRepository{
		GetByIDFunc: func(_ context.Context, id string) (*Assessment, error) {
			return &Assessment{ID: id, UID: "other-user"}, nil
		},
	}
	svc := NewService(mock)

	_, err := svc.GetResult(context.Background(), "u-1", "a-1")
	if !errors.Is(err, ErrResultNotFound) {
		t.Fatalf("error = %v, want ErrResultNotFound (wrong user)", err)
	}
}

func TestGetUserResults_Success(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(_ context.Context, uid string) ([]Assessment, error) {
			return []Assessment{
				{ID: "a-1", UID: uid, OverallScore: 3.5},
				{ID: "a-2", UID: uid, OverallScore: 4.2},
			}, nil
		},
	}
	svc := NewService(mock)

	results, err := svc.GetUserResults(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("len = %d, want 2", len(results))
	}
}

func TestGetUserResults_Empty(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(_ context.Context, _ string) ([]Assessment, error) {
			return nil, nil
		},
	}
	svc := NewService(mock)

	results, err := svc.GetUserResults(context.Background(), "u-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if results != nil {
		t.Fatalf("expected nil results, got %v", results)
	}
}

func TestListResults_Success(t *testing.T) {
	mock := &MockRepository{
		ListAllFunc: func(_ context.Context, _ map[string]string, _ int) ([]Assessment, error) {
			return []Assessment{{ID: "a-1"}, {ID: "a-2"}, {ID: "a-3"}}, nil
		},
	}
	svc := NewService(mock)

	results, err := svc.ListResults(context.Background(), nil, 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 3 {
		t.Fatalf("len = %d, want 3", len(results))
	}
}
