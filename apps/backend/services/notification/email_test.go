package notification

import (
	"strings"
	"testing"
	"time"

	"github.com/sathittham/factory-sync-solutions/apps/backend/services/scoring"
)

// ----------------------------------------------------------------------------
// roleDisplayNames
// ----------------------------------------------------------------------------

func TestRoleDisplayNames(t *testing.T) {
	tests := []struct {
		name   string
		role   string
		wantTH string
		wantEN string
	}{
		{
			name:   "owner",
			role:   "owner",
			wantTH: "เจ้าของ",
			wantEN: "Owner",
		},
		{
			name:   "system_admin",
			role:   "system_admin",
			wantTH: "ผู้ดูแลระบบ",
			wantEN: "System Admin",
		},
		{
			name:   "manager",
			role:   "manager",
			wantTH: "ผู้จัดการ",
			wantEN: "Manager",
		},
		{
			name:   "user",
			role:   "user",
			wantTH: "สมาชิก",
			wantEN: "Member",
		},
		{
			name:   "staff",
			role:   "staff",
			wantTH: "ทีมงาน",
			wantEN: "Staff",
		},
		{
			name:   "superadmin",
			role:   "superadmin",
			wantTH: "ผู้ดูแลระบบสูงสุด",
			wantEN: "Super Admin",
		},
		{
			name:   "unknown role falls back to Member without panicking",
			role:   "unknown_role",
			wantTH: "สมาชิก",
			wantEN: "Member",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotTH, gotEN := roleDisplayNames(tt.role)
			if gotTH != tt.wantTH {
				t.Errorf("roleDisplayNames(%q) TH = %q, want %q", tt.role, gotTH, tt.wantTH)
			}
			if gotEN != tt.wantEN {
				t.Errorf("roleDisplayNames(%q) EN = %q, want %q", tt.role, gotEN, tt.wantEN)
			}
		})
	}
}

// ----------------------------------------------------------------------------
// buildInviteEmailHTML
// ----------------------------------------------------------------------------

func TestBuildInviteEmailHTML(t *testing.T) {
	baseExpiry := time.Date(2025, 1, 15, 10, 30, 0, 0, time.UTC)
	baseLink := "https://app.example.com/invite?token=abc123"

	tests := []struct {
		name         string
		inviterEmail string
		companyName  string
		role         string
		expiresAt    time.Time
		link         string
		wantContains []string
		wantAbsent   []string
		wantErr      bool
	}{
		{
			name:         "owner role shows correct role strings",
			inviterEmail: "admin@example.com",
			companyName:  "ACME Corp",
			role:         "owner",
			expiresAt:    baseExpiry,
			link:         baseLink,
			wantContains: []string{"เจ้าของ", "Owner"},
		},
		{
			name:         "system_admin role shows correct role strings",
			inviterEmail: "admin@example.com",
			companyName:  "ACME Corp",
			role:         "system_admin",
			expiresAt:    baseExpiry,
			link:         baseLink,
			wantContains: []string{"ผู้ดูแลระบบ", "System Admin"},
		},
		{
			name:         "manager role shows correct role strings",
			inviterEmail: "admin@example.com",
			companyName:  "ACME Corp",
			role:         "manager",
			expiresAt:    baseExpiry,
			link:         baseLink,
			wantContains: []string{"ผู้จัดการ", "Manager"},
		},
		{
			name:         "user role shows correct role strings",
			inviterEmail: "admin@example.com",
			companyName:  "ACME Corp",
			role:         "user",
			expiresAt:    baseExpiry,
			link:         baseLink,
			wantContains: []string{"สมาชิก", "Member"},
		},
		{
			name:         "expiry date formatted as day Mon year HH:MM UTC",
			inviterEmail: "admin@example.com",
			companyName:  "ACME Corp",
			role:         "user",
			expiresAt:    baseExpiry,
			link:         baseLink,
			wantContains: []string{"15 Jan 2025 10:30 UTC"},
		},
		{
			name:         "XSS in inviterEmail is escaped by html/template",
			inviterEmail: "<evil>@xss.com",
			companyName:  "ACME Corp",
			role:         "user",
			expiresAt:    baseExpiry,
			link:         baseLink,
			wantAbsent:   []string{"<evil>"},
		},
		{
			name:         "empty companyName renders without template error",
			inviterEmail: "admin@example.com",
			companyName:  "",
			role:         "user",
			expiresAt:    baseExpiry,
			link:         baseLink,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildInviteEmailHTML(tt.inviterEmail, tt.companyName, tt.role, tt.expiresAt, tt.link)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got == "" {
				t.Fatal("expected non-empty HTML output, got empty string")
			}
			for _, want := range tt.wantContains {
				if !strings.Contains(got, want) {
					t.Errorf("HTML output does not contain %q", want)
				}
			}
			for _, absent := range tt.wantAbsent {
				if strings.Contains(got, absent) {
					t.Errorf("HTML output must not contain %q (XSS risk)", absent)
				}
			}
		})
	}
}

// ----------------------------------------------------------------------------
// buildResultEmailHTML
// ----------------------------------------------------------------------------

func TestBuildResultEmailHTML(t *testing.T) {
	sampleScores := []scoring.DimensionScore{
		{DimensionID: "d1", DimensionName: "Leadership", Score: 4.0, MaxScore: 5.0},
		{DimensionID: "d2", DimensionName: "Operations", Score: 2.5, MaxScore: 5.0},
	}

	tests := []struct {
		name         string
		contactName  string
		companyName  string
		overallScore float64
		diagnosis    string
		scores       []scoring.DimensionScore
		strengths    []string
		weaknesses   []string
		wantContains []string
		wantAbsent   []string
		wantErr      bool
	}{
		{
			name:         "smoke test produces non-empty HTML containing companyName",
			contactName:  "Somchai Jaidee",
			companyName:  "Thai Factory Co.",
			overallScore: 3.75,
			diagnosis:    "Developing",
			scores:       sampleScores,
			strengths:    []string{"Strong leadership", "Good safety record"},
			weaknesses:   []string{"Needs better logistics"},
			wantContains: []string{"Thai Factory Co."},
		},
		{
			name:         "empty strengths slice omits Strengths heading",
			contactName:  "Somchai Jaidee",
			companyName:  "Thai Factory Co.",
			overallScore: 2.0,
			diagnosis:    "Early Stage",
			scores:       sampleScores,
			strengths:    []string{},
			weaknesses:   []string{"Needs better logistics"},
			wantAbsent:   []string{"Strengths"},
		},
		{
			name:         "empty weaknesses slice omits Areas for Improvement heading",
			contactName:  "Somchai Jaidee",
			companyName:  "Thai Factory Co.",
			overallScore: 4.8,
			diagnosis:    "Advanced",
			scores:       sampleScores,
			strengths:    []string{"Excellent operations"},
			weaknesses:   []string{},
			wantAbsent:   []string{"Areas for Improvement"},
		},
		{
			name:         "overallScore formatted to two decimal places",
			contactName:  "Somchai Jaidee",
			companyName:  "Thai Factory Co.",
			overallScore: 3.14159,
			diagnosis:    "Developing",
			scores:       sampleScores,
			strengths:    []string{"Good"},
			weaknesses:   []string{"Improve"},
			wantContains: []string{"3.14"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := buildResultEmailHTML(
				tt.contactName,
				tt.companyName,
				tt.overallScore,
				tt.diagnosis,
				tt.scores,
				tt.strengths,
				tt.weaknesses,
			)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got == "" {
				t.Fatal("expected non-empty HTML output, got empty string")
			}
			for _, want := range tt.wantContains {
				if !strings.Contains(got, want) {
					t.Errorf("HTML output does not contain %q", want)
				}
			}
			for _, absent := range tt.wantAbsent {
				if strings.Contains(got, absent) {
					t.Errorf("HTML output must not contain %q", absent)
				}
			}
		})
	}
}
