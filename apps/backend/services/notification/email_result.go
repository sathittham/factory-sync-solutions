package notification

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"time"

	"github.com/resend/resend-go/v2"
	"github.com/sathittham/factory-sync-solutions/apps/backend/services/scoring"
)

type resultEmailData struct {
	ContactName  string
	CompanyName  string
	OverallScore float64
	Diagnosis    string
	Scores       []scoring.DimensionScore
	Strengths    []string
	Weaknesses   []string
	GeneratedAt  string
}

var resultEmailTmpl = template.Must(template.New("result").Parse(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
<h1 style="color:#1a56db;">FactorySync Solutions</h1>
<p>Dear {{.ContactName}},</p>
<p>Here are the assessment results for <strong>{{.CompanyName}}</strong>.</p>

<div style="background:#f0f7ff;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
  <h2 style="margin:0;">Overall Score</h2>
  <p style="font-size:36px;font-weight:bold;margin:10px 0;">{{printf "%.2f" .OverallScore}} / 5.00</p>
  <p style="font-size:20px;color:#1a56db;">{{.Diagnosis}}</p>
</div>

<h3>Dimension Scores</h3>
<table style="width:100%;border-collapse:collapse;">
  <tr style="background:#f3f4f6;">
    <th style="text-align:left;padding:8px;">Dimension</th>
    <th style="text-align:right;padding:8px;">Score</th>
  </tr>
  {{range .Scores}}
  <tr>
    <td style="padding:8px;border-bottom:1px solid #e5e7eb;">{{.DimensionName}}</td>
    <td style="text-align:right;padding:8px;border-bottom:1px solid #e5e7eb;">{{printf "%.2f" .Score}}</td>
  </tr>
  {{end}}
</table>

{{if .Strengths}}
<h3 style="color:#16a34a;">Strengths</h3>
<ul>
  {{range .Strengths}}<li>{{.}}</li>{{end}}
</ul>
{{end}}

{{if .Weaknesses}}
<h3 style="color:#dc2626;">Areas for Improvement</h3>
<ul>
  {{range .Weaknesses}}<li>{{.}}</li>{{end}}
</ul>
{{end}}

<hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">
<p style="color:#6b7280;font-size:12px;">This report was generated on {{.GeneratedAt}}. FactorySync Solutions.</p>
</body>
</html>`))

// SendResult sends the assessment result email to the user.
func (e *EmailClient) SendResult(ctx context.Context, to, contactName, companyName string, overallScore float64, diagnosis string, scores []scoring.DimensionScore, strengths, weaknesses []string) error {
	body, err := buildResultEmailHTML(contactName, companyName, overallScore, diagnosis, scores, strengths, weaknesses)
	if err != nil {
		return fmt.Errorf("build result email html: %w", err)
	}

	params := &resend.SendEmailRequest{
		From:    e.from,
		To:      []string{to},
		Subject: fmt.Sprintf("FactorySync Solutions Result — %s (%.2f/5.00)", diagnosis, overallScore),
		Html:    body,
	}

	_, err = e.client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("resend send: %w", err)
	}
	return nil
}

func buildResultEmailHTML(contactName, companyName string, overallScore float64, diagnosis string, scores []scoring.DimensionScore, strengths, weaknesses []string) (string, error) {
	data := resultEmailData{
		ContactName:  contactName,
		CompanyName:  companyName,
		OverallScore: overallScore,
		Diagnosis:    diagnosis,
		Scores:       scores,
		Strengths:    strengths,
		Weaknesses:   weaknesses,
		GeneratedAt:  time.Now().UTC().Format("2006-01-02"),
	}

	var buf bytes.Buffer
	if err := resultEmailTmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("execute result email template: %w", err)
	}
	return buf.String(), nil
}
