package notification

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func testEmailClient(server *httptest.Server) *EmailClient {
	return &EmailClient{
		httpClient: server.Client(),
		baseURL:    server.URL,
		accountID:  "acct123",
		apiToken:   "tok_secret",
		from:       "FactorySync <no-reply@factorysyncsolutions.com>",
	}
}

func TestEmailClientSend_success(t *testing.T) {
	var gotAuth, gotPath, gotCT string
	var gotBody cfEmailRequest
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		gotPath = r.URL.Path
		gotCT = r.Header.Get("Content-Type")
		b, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(b, &gotBody)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true,"errors":[],"result":{"delivered":["u@e.com"]}}`))
	}))
	defer srv.Close()

	c := testEmailClient(srv)
	if err := c.send(context.Background(), []string{"u@e.com"}, "Subj", "<p>hi</p>"); err != nil {
		t.Fatalf("send: %v", err)
	}
	if gotAuth != "Bearer tok_secret" {
		t.Errorf("Authorization = %q, want Bearer tok_secret", gotAuth)
	}
	if gotPath != "/accounts/acct123/email/sending/send" {
		t.Errorf("path = %q", gotPath)
	}
	if !strings.HasPrefix(gotCT, "application/json") {
		t.Errorf("Content-Type = %q", gotCT)
	}
	if gotBody.From != c.from || len(gotBody.To) != 1 || gotBody.To[0] != "u@e.com" ||
		gotBody.Subject != "Subj" || gotBody.HTML != "<p>hi</p>" {
		t.Errorf("request body = %+v", gotBody)
	}
}

func TestEmailClientSend_apiError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":false,"errors":[{"code":1000,"message":"Sender domain not verified"}]}`))
	}))
	defer srv.Close()

	err := testEmailClient(srv).send(context.Background(), []string{"u@e.com"}, "s", "h")
	if err == nil || !strings.Contains(err.Error(), "Sender domain not verified") {
		t.Fatalf("expected domain-not-verified error, got %v", err)
	}
}

func TestEmailClientSend_noRetryOn4xx(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"success":false,"errors":[{"code":400,"message":"bad request"}]}`))
	}))
	defer srv.Close()

	if err := testEmailClient(srv).send(context.Background(), []string{"u@e.com"}, "s", "h"); err == nil {
		t.Fatal("expected error on 400")
	}
	if n := calls.Load(); n != 1 {
		t.Errorf("expected 1 call (no retry on 4xx), got %d", n)
	}
}

func TestEmailClientSend_retriesOn5xx(t *testing.T) {
	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if calls.Add(1) == 1 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"success":true}`))
	}))
	defer srv.Close()

	if err := testEmailClient(srv).send(context.Background(), []string{"u@e.com"}, "s", "h"); err != nil {
		t.Fatalf("expected success after retry, got %v", err)
	}
	if n := calls.Load(); n != 2 {
		t.Errorf("expected 2 calls (retry on 5xx), got %d", n)
	}
}
