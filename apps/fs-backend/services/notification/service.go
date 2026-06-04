package notification

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/result"
	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/scoring"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
)

// Service orchestrates email and Slack notifications.
// Notification failures are logged but never propagated to the caller.
type Service struct {
	email    *EmailClient
	slack    *SlackClient
	fsClient *firestore.Client
}

func NewService(email *EmailClient, slack *SlackClient, fsClient *firestore.Client) *Service {
	return &Service{email: email, slack: slack, fsClient: fsClient}
}

// NotifyRegistration sends a Slack notification for a new registration.
func (s *Service) NotifyRegistration(ctx context.Context, companyName, contactName, industryType string) {
	webhookURL := os.Getenv("SLACK_WEBHOOK_REGISTRATION")
	if err := s.slack.SendRegistration(ctx, webhookURL, companyName, contactName, industryType); err != nil {
		slog.Error("slack registration notification failed", "error", err.Error())
	}
}

// NotifyQuizResult sends an email to the user (if emailNotifications is true) and a Slack notification.
func (s *Service) NotifyQuizResult(ctx context.Context, assessment *result.Assessment, contactEmail, contactName, companyName string, emailNotifications bool, scores []scoring.DimensionScore) {
	if emailNotifications {
		// Track email job
		jobID := uuid.New().String()
		now := time.Now().UTC().Format(time.RFC3339)
		job := &EmailJob{
			ID:           jobID,
			UID:          assessment.UID,
			AssessmentID: assessment.ID,
			Status:       "pending",
			CreatedAt:    now,
		}
		s.createEmailJob(ctx, job)

		// Send email
		if s.email != nil {
			err := s.email.SendResult(ctx, contactEmail, contactName, companyName,
				assessment.OverallScore, assessment.Diagnosis, scores,
				assessment.Strengths, assessment.Weaknesses)
			if err != nil {
				slog.Error("result email failed", "error", err.Error(), "uid", assessment.UID)
				errMsg := err.Error()
				job.Status = "failed"
				job.Error = &errMsg
			} else {
				job.Status = "sent"
				sentAt := time.Now().UTC().Format(time.RFC3339)
				job.SentAt = sentAt
			}
			s.updateEmailJob(ctx, job)
		}
	}

	// Always send Slack notification regardless of email preference
	webhookURL := os.Getenv("SLACK_WEBHOOK_QUIZ_RESULT")
	if err := s.slack.SendQuizResult(ctx, webhookURL, companyName, assessment.OverallScore, assessment.Diagnosis); err != nil {
		slog.Error("slack quiz result notification failed", "error", err.Error())
	}
}

func (s *Service) createEmailJob(ctx context.Context, job *EmailJob) {
	if s.fsClient == nil {
		return
	}
	if _, err := s.fsClient.Collection("email_jobs").Doc(job.ID).Set(ctx, job); err != nil {
		slog.Error("create email job failed", "error", err.Error())
	}
}

func (s *Service) updateEmailJob(ctx context.Context, job *EmailJob) {
	if s.fsClient == nil {
		return
	}
	if _, err := s.fsClient.Collection("email_jobs").Doc(job.ID).Set(ctx, job); err != nil {
		slog.Error("update email job failed", "error", err.Error())
	}
}
