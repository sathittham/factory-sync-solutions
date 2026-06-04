package result

import "github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/scoring"

// Assessment represents a completed quiz assessment stored in Firestore.
type Assessment struct {
	ID          string                  `json:"id" firestore:"id"`
	UID         string                  `json:"uid" firestore:"uid"`
	QuizID      string                  `json:"quizId" firestore:"quizId"`
	Answers     []scoring.QuizAnswer    `json:"answers" firestore:"answers"`
	Scores      []scoring.DimensionScore `json:"scores" firestore:"scores"`
	OverallScore float64                `json:"overallScore" firestore:"overallScore"`
	Strengths   []string                `json:"strengths" firestore:"strengths"`
	Weaknesses  []string                `json:"weaknesses" firestore:"weaknesses"`
	Diagnosis   string                  `json:"diagnosis" firestore:"diagnosis"`
	SubmittedAt string                  `json:"submittedAt" firestore:"submittedAt"`
}

// AssessmentSummary is a lightweight view used in list responses.
type AssessmentSummary struct {
	ID           string  `json:"id"`
	UID          string  `json:"uid"`
	QuizID       string  `json:"quizId"`
	OverallScore float64 `json:"overallScore"`
	Diagnosis    string  `json:"diagnosis"`
	SubmittedAt  string  `json:"submittedAt"`
	// Joined from user profile for admin views
	CompanyName  string `json:"companyName,omitempty"`
	IndustryType string `json:"industryType,omitempty"`
	CompanySize  string `json:"companySize,omitempty"`
}
