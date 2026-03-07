package quiz

import (
	"context"
	"errors"
	"testing"

	"factory-health-check/apps/api/services/notification"
	"factory-health-check/apps/api/services/result"
	"factory-health-check/apps/api/services/scoring"
)

type mockResultRepo struct {
	CreateFunc   func(ctx context.Context, assessment *result.Assessment) error
	GetByIDFunc  func(ctx context.Context, id string) (*result.Assessment, error)
	GetByUIDFunc func(ctx context.Context, uid string) ([]result.Assessment, error)
	ListAllFunc  func(ctx context.Context, filters map[string]string, limit int) ([]result.Assessment, error)
}

func (m *mockResultRepo) Create(ctx context.Context, a *result.Assessment) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, a)
	}
	return nil
}
func (m *mockResultRepo) GetByID(ctx context.Context, id string) (*result.Assessment, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, nil
}
func (m *mockResultRepo) GetByUID(ctx context.Context, uid string) ([]result.Assessment, error) {
	if m.GetByUIDFunc != nil {
		return m.GetByUIDFunc(ctx, uid)
	}
	return nil, nil
}
func (m *mockResultRepo) ListAll(ctx context.Context, filters map[string]string, limit int) ([]result.Assessment, error) {
	if m.ListAllFunc != nil {
		return m.ListAllFunc(ctx, filters, limit)
	}
	return nil, nil
}

func buildTestConfig() *scoring.QuizConfig {
	config, err := scoring.LoadQuestions("../../config/questions.json")
	if err != nil {
		panic("failed to load test questions: " + err.Error())
	}
	return config
}

func allThrees(config *scoring.QuizConfig) []scoring.QuizAnswer {
	answers := make([]scoring.QuizAnswer, len(config.Questions))
	for i, q := range config.Questions {
		answers[i] = scoring.QuizAnswer{QuestionID: q.ID, Value: 3}
	}
	return answers
}

func TestSubmitQuiz_Success(t *testing.T) {
	config := buildTestConfig()
	resultRepo := &mockResultRepo{}
	resultSvc := result.NewService(resultRepo)
	svc := NewService(config, resultSvc, nil)

	answers := allThrees(config)
	assessment, err := svc.SubmitQuiz(context.Background(), "u-1", "test@example.com", "Test", "TestCo", answers)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if assessment.UID != "u-1" {
		t.Errorf("uid = %s, want u-1", assessment.UID)
	}
	if assessment.OverallScore != 3.0 {
		t.Errorf("overallScore = %v, want 3.0", assessment.OverallScore)
	}
	if assessment.Diagnosis != "Established" {
		t.Errorf("diagnosis = %s, want Established", assessment.Diagnosis)
	}
	if assessment.ID == "" {
		t.Error("expected non-empty assessment ID")
	}
}

func TestSubmitQuiz_IncompleteAnswers(t *testing.T) {
	config := buildTestConfig()
	resultSvc := result.NewService(&mockResultRepo{})
	svc := NewService(config, resultSvc, nil)

	answers := []scoring.QuizAnswer{{QuestionID: "q1", Value: 3}}
	_, err := svc.SubmitQuiz(context.Background(), "u-1", "", "", "", answers)
	if !errors.Is(err, ErrIncompleteAnswers) {
		t.Fatalf("error = %v, want ErrIncompleteAnswers", err)
	}
}

func TestSubmitQuiz_InvalidAnswerValue(t *testing.T) {
	config := buildTestConfig()
	resultSvc := result.NewService(&mockResultRepo{})
	svc := NewService(config, resultSvc, nil)

	answers := allThrees(config)
	answers[0].Value = 6 // invalid
	_, err := svc.SubmitQuiz(context.Background(), "u-1", "", "", "", answers)
	if !errors.Is(err, ErrInvalidAnswer) {
		t.Fatalf("error = %v, want ErrInvalidAnswer", err)
	}
}

func TestSubmitQuiz_InvalidQuestionID(t *testing.T) {
	config := buildTestConfig()
	resultSvc := result.NewService(&mockResultRepo{})
	svc := NewService(config, resultSvc, nil)

	answers := allThrees(config)
	answers[0].QuestionID = "nonexistent"
	_, err := svc.SubmitQuiz(context.Background(), "u-1", "", "", "", answers)
	if !errors.Is(err, ErrInvalidAnswer) {
		t.Fatalf("error = %v, want ErrInvalidAnswer", err)
	}
}

func TestSubmitQuiz_StoreError(t *testing.T) {
	config := buildTestConfig()
	resultRepo := &mockResultRepo{
		CreateFunc: func(_ context.Context, _ *result.Assessment) error {
			return errors.New("firestore down")
		},
	}
	resultSvc := result.NewService(resultRepo)
	svc := NewService(config, resultSvc, nil)

	answers := allThrees(config)
	_, err := svc.SubmitQuiz(context.Background(), "u-1", "", "", "", answers)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestSubmitQuiz_WithNotificationService(t *testing.T) {
	config := buildTestConfig()
	resultRepo := &mockResultRepo{}
	resultSvc := result.NewService(resultRepo)
	notifSvc := notification.NewService(nil, nil, nil)
	svc := NewService(config, resultSvc, notifSvc)

	answers := allThrees(config)
	assessment, err := svc.SubmitQuiz(context.Background(), "u-1", "test@example.com", "Test", "TestCo", answers)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if assessment == nil {
		t.Fatal("expected non-nil assessment")
	}
}

func TestGetQuestions(t *testing.T) {
	config := buildTestConfig()
	svc := NewService(config, nil, nil)

	q := svc.GetQuestions()
	if q == nil {
		t.Fatal("expected non-nil quiz config")
	}
	if len(q.Questions) != 35 {
		t.Errorf("questions = %d, want 35", len(q.Questions))
	}
	if len(q.Dimensions) != 7 {
		t.Errorf("dimensions = %d, want 7", len(q.Dimensions))
	}
}
