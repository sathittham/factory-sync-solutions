package middleware

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/pkg"
)

var (
	limiters = make(map[string]*rate.Limiter)
	mu       sync.Mutex
)

func getLimiter(key string, r rate.Limit, burst int) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()
	if lim, ok := limiters[key]; ok {
		return lim
	}
	lim := rate.NewLimiter(r, burst)
	limiters[key] = lim
	return lim
}

// RateLimitByIP applies per-IP rate limiting as defense-in-depth.
// Primary rate limiting should be handled by Cloudflare WAF rules.
// This per-instance limiter is not globally accurate across Cloud Function instances.
func RateLimitByIP(next http.Handler) http.Handler {
	// Cleanup stale entries every 5 minutes
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			mu.Lock()
			limiters = make(map[string]*rate.Limiter)
			mu.Unlock()
		}
	}()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		lim := getLimiter(ip, rate.Every(time.Second), 10) // 10 req/sec burst
		if !lim.Allow() {
			pkg.RespondError(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "too many requests")
			return
		}
		next.ServeHTTP(w, r)
	})
}
