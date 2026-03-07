package quiz

import "factory-health-check/apps/api/services/scoring"

// SubmitQuizRequest is the payload for quiz submission.
type SubmitQuizRequest struct {
	Answers []scoring.QuizAnswer `json:"answers" validate:"required,min=1"`
}
