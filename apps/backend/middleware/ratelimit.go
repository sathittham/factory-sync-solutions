package middleware

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"github.com/sathittham/factory-sync-solutions/apps/backend/pkg"
)

var (
	limiters    = make(map[string]*rate.Limiter)
	mu          sync.Mutex
	cleanupOnce sync.Once
)

func getLimiter(key string, limit rate.Limit, burst int) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()
	if lim, ok := limiters[key]; ok {
		return lim
	}
	lim := rate.NewLimiter(limit, burst)
	limiters[key] = lim
	return lim
}

// startCleanup clears stale limiter entries every 5 minutes. Safe to call from
// multiple middleware constructors — the goroutine only starts once.
func startCleanup() {
	cleanupOnce.Do(func() {
		go func() {
			for {
				time.Sleep(5 * time.Minute)
				mu.Lock()
				limiters = make(map[string]*rate.Limiter)
				mu.Unlock()
			}
		}()
	})
}

// RateLimitByIP applies per-IP rate limiting as defense-in-depth.
// Primary rate limiting should be handled by Cloudflare WAF rules.
// This per-instance limiter is not globally accurate across Cloud Function instances.
func RateLimitByIP(next http.Handler) http.Handler {
	startCleanup()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		lim := getLimiter("ip:"+ip, rate.Every(time.Second), 10) // 10 req/sec burst
		if !lim.Allow() {
			pkg.RespondError(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "too many requests")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RateLimitByUID applies a per-user, per-action rate limit as defense-in-depth
// on top of RateLimitByIP — e.g. limiting how often one account can call an
// expensive endpoint regardless of source IP. Must be mounted after
// FirebaseAuth so GetUID(r) is populated. Like RateLimitByIP, this
// per-instance limiter is not globally accurate across Cloud Function
// instances.
func RateLimitByUID(action string, limit rate.Limit, burst int) func(http.Handler) http.Handler {
	startCleanup()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			uid := GetUID(r)
			lim := getLimiter("uid:"+action+":"+uid, limit, burst)
			if !lim.Allow() {
				pkg.RespondError(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "too many requests")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
