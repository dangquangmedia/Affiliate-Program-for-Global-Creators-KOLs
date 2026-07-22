package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/apierr"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
	"github.com/jackc/pgx/v5"
)

const (
	mockProvider = "mock-google"
	sessionTTL   = 7 * 24 * time.Hour
)

type User struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
}

type Role struct {
	CountryID *string `json:"countryId"`
	Role      string  `json:"role"`
}

type Context struct {
	User  User   `json:"user"`
	Roles []Role `json:"roles"`
}

type LoginResult struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
	User      User      `json:"user"`
}

type Service struct {
	queries *sqlcgen.Queries
	now     func() time.Time
}

func NewService(queries *sqlcgen.Queries) *Service {
	return &Service{queries: queries, now: time.Now}
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func newToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate session token: %w", err)
	}
	return hex.EncodeToString(raw), nil
}

func (service *Service) MockLogin(ctx context.Context, email, displayName string) (LoginResult, error) {
	normalizedEmail := strings.ToLower(strings.TrimSpace(email))
	name := strings.TrimSpace(displayName)
	if name == "" {
		name, _, _ = strings.Cut(normalizedEmail, "@")
	}

	user, err := service.queries.UpsertMockUser(ctx, sqlcgen.UpsertMockUserParams{
		ID:              store.NewUUID(),
		Email:           normalizedEmail,
		DisplayName:     name,
		AuthProvider:    mockProvider,
		ProviderSubject: normalizedEmail,
	})
	if err != nil {
		return LoginResult{}, fmt.Errorf("upsert mock user: %w", err)
	}

	token, err := newToken()
	if err != nil {
		return LoginResult{}, err
	}
	// Nest serializes Date as UTC with millisecond precision. Keep the same wire representation.
	expiresAt := service.now().Add(sessionTTL).UTC().Truncate(time.Millisecond)
	if _, err := service.queries.CreateSession(ctx, sqlcgen.CreateSessionParams{
		ID:        store.NewUUID(),
		UserID:    user.ID,
		TokenHash: hashToken(token),
		ExpiresAt: store.Timestamptz(expiresAt),
	}); err != nil {
		return LoginResult{}, fmt.Errorf("create session: %w", err)
	}

	return LoginResult{
		Token:     token,
		ExpiresAt: expiresAt,
		User: User{
			ID:          store.UUIDString(user.ID),
			Email:       user.Email,
			DisplayName: user.DisplayName,
		},
	}, nil
}

func (service *Service) ResolveSession(ctx context.Context, token string) (Context, error) {
	if token == "" {
		return Context{}, apierr.New(http.StatusUnauthorized, "UNAUTHENTICATED", "Missing session token.")
	}
	row, err := service.queries.GetSessionUserByTokenHash(ctx, hashToken(token))
	if errors.Is(err, pgx.ErrNoRows) {
		return Context{}, apierr.New(http.StatusUnauthorized, "UNAUTHENTICATED", "Session is invalid or expired.")
	}
	if err != nil {
		return Context{}, fmt.Errorf("resolve session: %w", err)
	}
	if row.RevokedAt.Valid || !row.ExpiresAt.Valid || !row.ExpiresAt.Time.After(service.now()) {
		return Context{}, apierr.New(http.StatusUnauthorized, "UNAUTHENTICATED", "Session is invalid or expired.")
	}

	roleRows, err := service.queries.ListRolesForUser(ctx, row.UserID)
	if err != nil {
		return Context{}, fmt.Errorf("list session roles: %w", err)
	}
	roles := make([]Role, 0, len(roleRows))
	for _, roleRow := range roleRows {
		var countryID *string
		if roleRow.CountryID.Valid {
			value := store.UUIDString(roleRow.CountryID)
			countryID = &value
		}
		roles = append(roles, Role{CountryID: countryID, Role: string(roleRow.Role)})
	}

	return Context{
		User:  User{ID: store.UUIDString(row.UserID), Email: row.Email, DisplayName: row.DisplayName},
		Roles: roles,
	}, nil
}

func (service *Service) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	if err := service.queries.RevokeSessionByTokenHash(ctx, hashToken(token)); err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}
	return nil
}
