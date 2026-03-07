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
	ErrIncompleteAnswers = errors.New("all 35 questions must be answered")
	ErrInvalidAnswer     = errors.New("invalid answer: value must be 1-5")
)

type Service struct {
	quizConfig   *scoring.QuizConfig
	resultSvc    *result.Service
	notifSvc     *notification.Service
}

func NewService(quizConfig *scoring.QuizConfig, resultSvc *result.Service, notifSvc *notification.Service) *Service {
	return &Service{
		quizConfig: quizConfig,
		resultSvc:  resultSvc,
		notifSvc:   notifSvc,
	}
}

// GetQuestions returns the quiz configuration (questions + dimensions).
func (s *Service) GetQuestions() *scoring.QuizConfig {
	return s.quizConfig
}

// SubmitQuiz validates answers, computes scores, stores the result,
// and triggers notifications.
func (s *Service) SubmitQuiz(ctx context.Context, uid, contactEmail, contactName, companyName string, answers []scoring.QuizAnswer) (*result.Assessment, error) {
	// Validate answer count
	if len(answers) != len(s.quizConfig.Questions) {
		return nil, ErrIncompleteAnswers
	}

	// Validate each answer references a valid question and has valid value
	validQuestions := make(map[string]bool, len(s.quizConfig.Questions))
	for _, q := range s.quizConfig.Questions {
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
	scoringResult := scoring.ComputeScores(s.quizConfig.Questions, s.quizConfig.Dimensions, answers)

	// Build assessment
	now := time.Now().UTC().Format(time.RFC3339)
	assessment := &result.Assessment{
		ID:           uuid.New().String(),
		UID:          uid,
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
