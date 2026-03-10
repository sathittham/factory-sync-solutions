package quiz

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/sathittham/factory-health-check/apps/api/services/notification"
	"github.com/sathittham/factory-health-check/apps/api/services/result"
	"github.com/sathittham/factory-health-check/apps/api/services/scoring"
)

var (
	ErrIncompleteAnswers = errors.New("all questions must be answered")
	ErrInvalidAnswer     = errors.New("invalid answer: value must be 1-5")
	ErrQuizNotFound      = errors.New("quiz not found")
)

type Service struct {
	registry  *scoring.QuizRegistry
	resultSvc *result.Service
	notifSvc  *notification.Service
}

func NewService(registry *scoring.QuizRegistry, resultSvc *result.Service, notifSvc *notification.Service) *Service {
	return &Service{
		registry:  registry,
		resultSvc: resultSvc,
		notifSvc:  notifSvc,
	}
}

// GetQuestions returns the quiz configuration for a specific quiz ID.
func (s *Service) GetQuestions(quizID string) *scoring.QuizConfig {
	return s.registry.Get(quizID)
}

// ListQuizzes returns lightweight summaries of all available quizzes.
func (s *Service) ListQuizzes() []QuizListItem {
	configs := s.registry.List()
	items := make([]QuizListItem, 0, len(configs))
	for _, c := range configs {
		items = append(items, QuizListItem{ID: c.ID, NameTh: c.NameTh, NameEn: c.NameEn})
	}
	return items
}

// SubmitQuiz validates answers, computes scores, stores the result,
// and triggers notifications.
func (s *Service) SubmitQuiz(ctx context.Context, uid, contactEmail, contactName, companyName, quizID string, answers []scoring.QuizAnswer) (*result.Assessment, error) {
	quizConfig := s.registry.Get(quizID)
	if quizConfig == nil {
		return nil, ErrQuizNotFound
	}

	// Validate answer count
	if len(answers) != len(quizConfig.Questions) {
		return nil, ErrIncompleteAnswers
	}

	// Validate each answer references a valid question and has valid value
	validQuestions := make(map[string]bool, len(quizConfig.Questions))
	for _, q := range quizConfig.Questions {
		validQuestions[q.ID] = true
	}
	for _, a := range answers {
		if !validQuestions[a.QuestionID] {
			return nil, fmt.Errorf("unknown question %s: %w", a.QuestionID, ErrInvalidAnswer)
		}
		if a.Value < 1 || a.Value > 5 {
			return nil, ErrInvalidAnswer
		}
	}

	// Compute scores
	scoringResult := scoring.ComputeScores(quizConfig.Questions, quizConfig.Dimensions, answers)

	// Build assessment
	now := time.Now().UTC().Format(time.RFC3339)
	assessment := &result.Assessment{
		ID:           uuid.New().String(),
		UID:          uid,
		QuizID:       quizID,
		Answers:      answers,
		Scores:       scoringResult.DimensionScores,
		OverallScore: scoringResult.OverallScore,
		Strengths:    scoringResult.Strengths,
		Weaknesses:   scoringResult.Weaknesses,
		Diagnosis:    scoringResult.Diagnosis,
		SubmittedAt:  now,
	}

	// Persist result
	if err := s.resultSvc.StoreResult(ctx, assessment); err != nil {
		return nil, fmt.Errorf("store assessment: %w", err)
	}

	// Trigger notifications (fire-and-forget — failures logged, not propagated)
	if s.notifSvc != nil {
		go s.notifSvc.NotifyQuizResult(ctx, assessment, contactEmail, contactName, companyName, scoringResult.DimensionScores)
	}

	return assessment, nil
}
