package pkg

import (
	"strings"
	"testing"
)

func TestBuildPasswordResetActionURL(t *testing.T) {
	tests := []struct {
		name         string
		appURL       string
		firebaseLink string
		wantPrefix   string
		wantContains []string
		wantErr      bool
	}{
		{
			name:         "rewrites firebase action link to app auth action route",
			appURL:       "https://app.example.com",
			firebaseLink: "https://project.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=abc123&apiKey=firebase-key&continueUrl=https%3A%2F%2Fapp.example.com",
			wantPrefix:   "https://app.example.com/auth/action?",
			wantContains: []string{"mode=resetPassword", "oobCode=abc123", "apiKey=firebase-key", "continueUrl=https%3A%2F%2Fapp.example.com"},
		},
		{
			name:         "normalizes app url path to auth action",
			appURL:       "https://app.example.com/register",
			firebaseLink: "https://project.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=abc123",
			wantPrefix:   "https://app.example.com/auth/action?",
			wantContains: []string{"mode=resetPassword", "oobCode=abc123"},
		},
		{
			name:         "rejects malformed app url",
			appURL:       "app.example.com",
			firebaseLink: "https://project.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=abc123",
			wantErr:      true,
		},
		{
			name:         "rejects firebase link without code",
			appURL:       "https://app.example.com",
			firebaseLink: "https://project.firebaseapp.com/__/auth/action?mode=resetPassword",
			wantErr:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := BuildPasswordResetActionURL(tt.appURL, tt.firebaseLink)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !strings.HasPrefix(got, tt.wantPrefix) {
				t.Fatalf("got %q, want prefix %q", got, tt.wantPrefix)
			}
			for _, want := range tt.wantContains {
				if !strings.Contains(got, want) {
					t.Errorf("got %q, want it to contain %q", got, want)
				}
			}
		})
	}
}
