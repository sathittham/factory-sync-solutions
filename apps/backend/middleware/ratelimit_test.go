package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"golang.org/x/time/rate"
)

func TestRateLimitByUID_BlocksAfterBurst(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := RateLimitByUID("test-action", rate.Every(time.Hour), 2)(next)

	req := SetTestAuthContext(httptest.NewRequest(http.MethodPost, "/x", nil), "uid-rate-limit-test", "test@example.com", "Test User")

	for i := range 2 {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("request %d: status = %d, want 200", i, rr.Code)
		}
	}

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want 429", rr.Code)
	}
}

func TestRateLimitByUID_ScopedPerUser(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := RateLimitByUID("test-action-scoped", rate.Every(time.Hour), 1)(next)

	reqA := SetTestAuthContext(httptest.NewRequest(http.MethodPost, "/x", nil), "uid-a", "a@example.com", "A")
	reqB := SetTestAuthContext(httptest.NewRequest(http.MethodPost, "/x", nil), "uid-b", "b@example.com", "B")

	rrA := httptest.NewRecorder()
	handler.ServeHTTP(rrA, reqA)
	if rrA.Code != http.StatusOK {
		t.Fatalf("user A first request: status = %d, want 200", rrA.Code)
	}

	rrA2 := httptest.NewRecorder()
	handler.ServeHTTP(rrA2, reqA)
	if rrA2.Code != http.StatusTooManyRequests {
		t.Fatalf("user A second request: status = %d, want 429", rrA2.Code)
	}

	rrB := httptest.NewRecorder()
	handler.ServeHTTP(rrB, reqB)
	if rrB.Code != http.StatusOK {
		t.Fatalf("user B request: status = %d, want 200 (separate limiter from user A)", rrB.Code)
	}
}
