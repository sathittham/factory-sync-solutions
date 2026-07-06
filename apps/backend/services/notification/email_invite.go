package notification

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"log/slog"
	"time"
)

type inviteEmailData struct {
	InviterEmail string
	CompanyName  string
	RoleTH       string
	RoleEN       string
	ExpiresAt    string
	InviteLink   string
}

func roleDisplayNames(role string) (th, en string) {
	switch role {
	case "owner":
		return "เจ้าของ", "Owner"
	case "system_admin":
		return "ผู้ดูแลระบบ", "System Admin"
	case "manager":
		return "ผู้จัดการ", "Manager"
	case "user":
		return "สมาชิก", "Member"
	case "staff":
		return "ทีมงาน", "Staff"
	case "superadmin":
		return "ผู้ดูแลระบบสูงสุด", "Super Admin"
	default:
		slog.Warn("roleDisplayNames: unknown role, using fallback", "role", role)
		return "สมาชิก", "Member"
	}
}

var inviteEmailTmpl = template.Must(template.New("invite").Parse(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>คำเชิญเข้าร่วม FactorySync Solutions</title>
</head>
<body style="font-family:Helvetica,Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td>
    <div style="background:#1a56db;padding:24px 32px;border-radius:8px 8px 0 0;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">FactorySync Solutions</h1>
      <p style="color:#bfdbfe;margin:8px 0 0;font-size:13px;">ระบบประเมินสุขภาพโรงงาน</p>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
      <h2 style="font-size:18px;color:#111827;margin:0 0 16px;">คุณได้รับคำเชิญ!</h2>
      <p style="color:#374151;line-height:1.6;margin:0 0 8px;">
        <strong>{{.InviterEmail}}</strong> ได้เชิญคุณเข้าร่วม <strong>{{.CompanyName}}</strong> บน FactorySync Solutions
      </p>
      <p style="color:#374151;margin:0 0 24px;">
        บทบาทของคุณ: <strong style="color:#1a56db;">{{.RoleTH}}</strong>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 8px;">
        <strong>{{.InviterEmail}}</strong> has invited you to join <strong>{{.CompanyName}}</strong> on FactorySync Solutions.
      </p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 32px;">
        Your role: <strong style="color:#1a56db;">{{.RoleEN}}</strong>
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{{.InviteLink}}"
           style="display:inline-block;background:#1a56db;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:700;">
          ตั้งรหัสผ่านและเข้าสู่ระบบ
        </a>
        <p style="color:#6b7280;font-size:12px;margin:8px 0 0;">Set password &amp; sign in</p>
      </div>
      <p style="color:#f59e0b;font-size:13px;text-align:center;margin:0 0 24px;">
        ⚠️ ลิงก์นี้จะหมดอายุวันที่ {{.ExpiresAt}}<br>
        <span style="font-size:12px;">This link expires on {{.ExpiresAt}}</span>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยต่ออีเมลนี้<br>
        If you didn&#39;t request this, please ignore this email.
      </p>
    </div>
    <div style="text-align:center;padding:16px;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        FactorySync Solutions — ระบบประเมินสุขภาพโรงงาน / Factory Health Assessment Platform
      </p>
    </div>
  </td></tr>
</table>
</body>
</html>`))

// SendInvitation sends a member invitation email with a sign-in link.
func (e *EmailClient) SendInvitation(ctx context.Context, to, inviterEmail, companyName, role string, expiresAt time.Time, link string) error {
	body, err := buildInviteEmailHTML(inviterEmail, companyName, role, expiresAt, link)
	if err != nil {
		return fmt.Errorf("build invite email html: %w", err)
	}

	subject := "คุณได้รับคำเชิญเข้าร่วม FactorySync Solutions / You've been invited to FactorySync Solutions"
	if err := e.send(ctx, []string{to}, subject, body); err != nil {
		return fmt.Errorf("send invitation email: %w", err)
	}
	return nil
}

func buildInviteEmailHTML(inviterEmail, companyName, role string, expiresAt time.Time, link string) (string, error) {
	roleTH, roleEN := roleDisplayNames(role)
	data := inviteEmailData{
		InviterEmail: inviterEmail,
		CompanyName:  companyName,
		RoleTH:       roleTH,
		RoleEN:       roleEN,
		ExpiresAt:    expiresAt.UTC().Format("2 Jan 2006 15:04 UTC"),
		InviteLink:   link,
	}
	var buf bytes.Buffer
	if err := inviteEmailTmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("execute invite email template: %w", err)
	}
	return buf.String(), nil
}
