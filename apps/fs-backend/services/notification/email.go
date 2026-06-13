package notification

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
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

// resultEmailData holds the template data for the result email.
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

// SendInvitation sends a member invitation email with a sign-in link.
func (e *EmailClient) SendInvitation(ctx context.Context, to, inviterEmail, role, link string) error {
	body, err := buildInviteEmailHTML(inviterEmail, role, link)
	if err != nil {
		return fmt.Errorf("build invite email html: %w", err)
	}

	params := &resend.SendEmailRequest{
		From:    e.from,
		To:      []string{to},
		Subject: "คุณได้รับคำเชิญเข้าร่วม FactorySync Solutions",
		Html:    body,
	}

	_, err = e.client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("resend send invitation: %w", err)
	}
	return nil
}

// inviteEmailData holds template data for invitation emails.
type inviteEmailData struct {
	InviterEmail string
	Role         string
	InviteLink   string
}

var inviteEmailTmpl = template.Must(template.New("invite").Parse(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
<h1 style="color:#1a56db;">FactorySync Solutions</h1>
<p>คุณได้รับคำเชิญให้เข้าร่วม <strong>FactorySync Solutions</strong> โดย <strong>{{.InviterEmail}}</strong></p>
<p>บทบาท: <strong>{{.Role}}</strong></p>
<div style="margin:30px 0;text-align:center;">
  <a href="{{.InviteLink}}" style="background:#1a56db;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;">
    ตั้งรหัสผ่านและเข้าสู่ระบบ
  </a>
</div>
<p style="color:#6b7280;font-size:13px;">หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยต่ออีเมลนี้</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">
<p style="color:#6b7280;font-size:12px;">FactorySync Solutions — ระบบประเมินสุขภาพโรงงาน</p>
</body>
</html>`))

func buildInviteEmailHTML(inviterEmail, role, link string) (string, error) {
	data := inviteEmailData{
		InviterEmail: inviterEmail,
		Role:         role,
		InviteLink:   link,
	}
	var buf bytes.Buffer
	if err := inviteEmailTmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("execute invite email template: %w", err)
	}
	return buf.String(), nil
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
