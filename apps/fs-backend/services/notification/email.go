package notification

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/services/scoring"

	"github.com/resend/resend-go/v2"
)

// EmailClient sends result emails via the Resend API.
type EmailClient struct {
	client *resend.Client
	from   string
}

func NewEmailClient(apiKey, from string) *EmailClient {
	return &EmailClient{
		client: resend.NewClient(apiKey),
		from:   from,
	}
}

// SendResult sends the assessment result email to the user.
func (e *EmailClient) SendResult(ctx context.Context, to, contactName, companyName string, overallScore float64, diagnosis string, scores []scoring.DimensionScore, strengths, weaknesses []string) error {
	html := buildResultEmailHTML(contactName, companyName, overallScore, diagnosis, scores, strengths, weaknesses)

	params := &resend.SendEmailRequest{
		From:    e.from,
		To:      []string{to},
		Subject: fmt.Sprintf("FactorySync Solutions Result — %s (%.2f/5.00)", diagnosis, overallScore),
		Html:    html,
	}

	_, err := e.client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("resend send: %w", err)
	}
	return nil
}

func buildResultEmailHTML(contactName, companyName string, overallScore float64, diagnosis string, scores []scoring.DimensionScore, strengths, weaknesses []string) string {
	var sb strings.Builder

	sb.WriteString(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">`)

	sb.WriteString(`<h1 style="color:#1a56db;">FactorySync Solutions</h1>`)
	sb.WriteString(fmt.Sprintf(`<p>Dear %s,</p>`, contactName))
	sb.WriteString(fmt.Sprintf(`<p>Here are the assessment results for <strong>%s</strong>.</p>`, companyName))

	// Overall score
	sb.WriteString(fmt.Sprintf(`<div style="background:#f0f7ff;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
		<h2 style="margin:0;">Overall Score</h2>
		<p style="font-size:36px;font-weight:bold;margin:10px 0;">%.2f / 5.00</p>
		<p style="font-size:20px;color:#1a56db;">%s</p>
	</div>`, overallScore, diagnosis))

	// Dimension scores
	sb.WriteString(`<h3>Dimension Scores</h3><table style="width:100%;border-collapse:collapse;">`)
	sb.WriteString(`<tr style="background:#f3f4f6;"><th style="text-align:left;padding:8px;">Dimension</th><th style="text-align:right;padding:8px;">Score</th></tr>`)
	for _, ds := range scores {
		sb.WriteString(fmt.Sprintf(`<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">%s</td><td style="text-align:right;padding:8px;border-bottom:1px solid #e5e7eb;">%.2f</td></tr>`, ds.DimensionName, ds.Score))
	}
	sb.WriteString(`</table>`)

	// Strengths
	if len(strengths) > 0 {
		sb.WriteString(`<h3 style="color:#16a34a;">Strengths</h3><ul>`)
		for _, s := range strengths {
			sb.WriteString(fmt.Sprintf(`<li>%s</li>`, s))
		}
		sb.WriteString(`</ul>`)
	}

	// Weaknesses
	if len(weaknesses) > 0 {
		sb.WriteString(`<h3 style="color:#dc2626;">Areas for Improvement</h3><ul>`)
		for _, w := range weaknesses {
			sb.WriteString(fmt.Sprintf(`<li>%s</li>`, w))
		}
		sb.WriteString(`</ul>`)
	}

	sb.WriteString(fmt.Sprintf(`<hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">
		<p style="color:#6b7280;font-size:12px;">This report was generated on %s. FactorySync Solutions.</p>`,
		time.Now().UTC().Format("2006-01-02")))

	sb.WriteString(`</body></html>`)
	return sb.String()
}
