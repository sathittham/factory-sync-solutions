package quiz

import "github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/scoring"

// SubmitQuizRequest is the payload for quiz submission.
type SubmitQuizRequest struct {
	QuizID  string               `json:"quizId" validate:"required"`
	Answers []scoring.QuizAnswer `json:"answers" validate:"required,min=1"`
}

// QuizListItem is a lightweight summary of an available quiz.
type QuizListItem struct {
	ID     string `json:"id"`
	NameTh string `json:"nameTh"`
	NameEn string `json:"nameEn"`
}
