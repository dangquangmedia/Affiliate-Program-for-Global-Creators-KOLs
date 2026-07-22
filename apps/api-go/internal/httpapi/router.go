package httpapi

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	appmiddleware "github.com/dangquangmedia/affiliate-global/apps/api-go/internal/httpapi/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

type HealthChecker interface {
	Ping(context.Context) error
}

type RouterConfig struct {
	WebOrigin     string
	Health        HealthChecker
	Logger        *slog.Logger
	HealthTimeout time.Duration
	Services      *Services
}

func NewRouter(cfg RouterConfig) http.Handler {
	router := chi.NewRouter()
	router.Use(appmiddleware.RequestID)
	router.Use(appmiddleware.Recovery(cfg.Logger))
	router.Use(appmiddleware.AccessLog(cfg.Logger))
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.WebOrigin},
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"X-Correlation-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	router.Get("/", func(w http.ResponseWriter, _ *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]any{
			"service": "affiliate-global-api",
			"endpoints": []string{
				"/health",
				"/markets/{market}/context (e.g. /markets/vn/context)",
				"POST /auth/mock-login",
				"GET /auth/me",
				"POST /auth/logout",
				"POST /me/country/{market} (auth)",
				"GET /me/countries (auth)",
				"GET|POST /me/country/{market}/kyc (auth, creator)",
				"GET /ops/{market}/kyc/queue · POST /ops/{market}/kyc/{caseId}/review (auth, staff)",
				"GET /markets/{market}/campaigns · GET .../{id} (auth) · POST .../campaigns (admin)",
				"POST /markets/{market}/campaigns/{id}/join · /leave · GET /me/country/{market}/participations",
			},
		})
	})

	router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		timeout := cfg.HealthTimeout
		if timeout <= 0 {
			timeout = 2 * time.Second
		}
		ctx, cancel := context.WithTimeout(r.Context(), timeout)
		defer cancel()
		if err := cfg.Health.Ping(ctx); err != nil {
			WriteError(w, r, http.StatusServiceUnavailable, "INTERNAL_ERROR", "Service Unavailable Exception")
			return
		}
		WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "db": "up"})
	})

	registerWeek2Routes(router, cfg.Services)
	registerWeek5Routes(router, cfg.Services)

	router.NotFound(func(w http.ResponseWriter, r *http.Request) {
		WriteError(w, r, http.StatusNotFound, "INTERNAL_ERROR", fmt.Sprintf("Cannot %s %s", r.Method, r.URL.Path))
	})
	router.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		WriteError(w, r, http.StatusNotFound, "INTERNAL_ERROR", fmt.Sprintf("Cannot %s %s", r.Method, r.URL.Path))
	})

	return router
}
