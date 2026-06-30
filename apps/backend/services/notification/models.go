package notification

// EmailJob tracks the status of an email delivery.
type EmailJob struct {
	ID           string  `json:"id" firestore:"id"`
	UID          string  `json:"uid" firestore:"uid"`
	AssessmentID string  `json:"assessmentId" firestore:"assessmentId"`
	Status       string  `json:"status" firestore:"status"` // "pending" | "sent" | "failed"
	CreatedAt    string  `json:"createdAt" firestore:"createdAt"`
	SentAt       string  `json:"sentAt,omitempty" firestore:"sentAt,omitempty"`
	Error        *string `json:"error,omitempty" firestore:"error,omitempty"`
}
