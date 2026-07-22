package httpapi

import (
	"context"
	"net/http"
	"strings"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/auth"
)

type authContextKey struct{}

func extractBearer(request *http.Request) string {
	parts := strings.Split(request.Header.Get("Authorization"), " ")
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return parts[1]
}

func requireAuth(service *auth.Service, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resolved, err := service.ResolveSession(r.Context(), extractBearer(r))
		if err != nil {
			WriteFailure(w, r, err)
			return
		}
		ctx := context.WithValue(r.Context(), authContextKey{}, resolved)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func currentAuth(request *http.Request) auth.Context {
	resolved, _ := request.Context().Value(authContextKey{}).(auth.Context)
	return resolved
}
