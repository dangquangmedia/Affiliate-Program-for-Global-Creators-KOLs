package httpapi

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type healthStub struct{ err error }

func (stub healthStub) Ping(context.Context) error { return stub.err }

func testRouter(health HealthChecker) http.Handler {
	return NewRouter(RouterConfig{
		WebOrigin: "http://localhost:3000",
		Health:    health,
		Logger:    slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
}

func TestHealthSuccess(t *testing.T) {
	recorder := httptest.NewRecorder()
	testRouter(healthStub{}).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", recorder.Code)
	}
	if body := recorder.Body.String(); body != "{\"db\":\"up\",\"status\":\"ok\"}\n" {
		t.Fatalf("body = %s", body)
	}
}

func TestHealthFailureUsesLegacyErrorEnvelope(t *testing.T) {
	recorder := httptest.NewRecorder()
	testRouter(healthStub{err: errors.New("down")}).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/health", nil))
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", recorder.Code)
	}
	body := recorder.Body.String()
	for _, want := range []string{"\"code\":\"INTERNAL_ERROR\"", "\"status\":503", "\"retryable\":true", "\"correlationId\":"} {
		if !strings.Contains(body, want) {
			t.Fatalf("body = %s, missing %s", body, want)
		}
	}
}

func TestCORSAllowsOnlyConfiguredOrigin(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodOptions, "/health", nil)
	request.Header.Set("Origin", "http://localhost:3000")
	request.Header.Set("Access-Control-Request-Method", http.MethodGet)
	testRouter(healthStub{}).ServeHTTP(recorder, request)
	if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Fatalf("allow origin = %q", got)
	}
}

func TestNotFoundUsesEnvelope(t *testing.T) {
	recorder := httptest.NewRecorder()
	testRouter(healthStub{}).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/missing", nil))
	if recorder.Code != http.StatusNotFound || !strings.Contains(recorder.Body.String(), "Cannot GET /missing") {
		t.Fatalf("status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}
