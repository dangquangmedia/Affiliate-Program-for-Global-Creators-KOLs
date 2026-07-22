package audit

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/auth"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Input struct {
	ActorUserID string
	CountryID   *string
	Action      string
	TargetType  string
	TargetID    string
	Metadata    map[string]any
}

type Event struct {
	ID          string  `json:"id"`
	ActorName   string  `json:"actorName"`
	Action      string  `json:"action"`
	CountryCode *string `json:"countryCode"`
	TargetType  *string `json:"targetType"`
	TargetID    *string `json:"targetId"`
	Metadata    any     `json:"metadata"`
	CreatedAt   string  `json:"createdAt"`
}

type Service struct {
	queries *sqlcgen.Queries
}

func NewService(queries *sqlcgen.Queries) *Service {
	return &Service{queries: queries}
}

// Record deliberately accepts the caller's Queries instance. Staff decisions pass a transaction-
// bound instance so the decision and append-only audit event commit or roll back together.
func Record(ctx context.Context, queries *sqlcgen.Queries, input Input) error {
	actorID, err := store.ParseUUID(input.ActorUserID)
	if err != nil {
		return fmt.Errorf("parse audit actor: %w", err)
	}
	targetID, err := store.ParseUUID(input.TargetID)
	if err != nil {
		return fmt.Errorf("parse audit target: %w", err)
	}
	var countryID pgtype.UUID
	if input.CountryID != nil {
		countryID, err = store.ParseUUID(*input.CountryID)
		if err != nil {
			return fmt.Errorf("parse audit country: %w", err)
		}
	}
	var metadata []byte
	if input.Metadata != nil {
		metadata, err = json.Marshal(input.Metadata)
		if err != nil {
			return fmt.Errorf("encode audit metadata: %w", err)
		}
	}
	if err := queries.CreateAuditEvent(ctx, sqlcgen.CreateAuditEventParams{
		ID: store.NewUUID(), ActorUserID: actorID, CountryID: countryID,
		Action: input.Action, TargetType: store.Text(input.TargetType), TargetID: targetID,
		Metadata: metadata,
	}); err != nil {
		return fmt.Errorf("create audit event: %w", err)
	}
	return nil
}

func (service *Service) List(ctx context.Context, principal auth.Context, market string) ([]Event, error) {
	if err := auth.AssertGlobalAdmin(principal); err != nil {
		return nil, err
	}
	var countryID pgtype.UUID
	if strings.TrimSpace(market) != "" {
		country, err := service.queries.GetCountryByCode(ctx, strings.ToUpper(market))
		if errors.Is(err, pgx.ErrNoRows) {
			return []Event{}, nil
		}
		if err != nil {
			return nil, fmt.Errorf("resolve audit country: %w", err)
		}
		countryID = country.ID
	}
	rows, err := service.queries.ListAuditEvents(ctx, countryID)
	if err != nil {
		return nil, fmt.Errorf("list audit events: %w", err)
	}
	result := make([]Event, 0, len(rows))
	for _, row := range rows {
		var metadata any
		if len(row.Metadata) > 0 {
			if err := json.Unmarshal(row.Metadata, &metadata); err != nil {
				return nil, fmt.Errorf("decode audit metadata: %w", err)
			}
		}
		result = append(result, Event{
			ID: store.UUIDString(row.ID), ActorName: row.ActorName, Action: row.Action,
			CountryCode: store.NullText(row.CountryCode), TargetType: store.NullText(row.TargetType),
			TargetID: uuidPointer(row.TargetID), Metadata: metadata,
			CreatedAt: row.CreatedAt.Time.UTC().Format("2006-01-02T15:04:05.000Z"),
		})
	}
	return result, nil
}

func uuidPointer(value pgtype.UUID) *string {
	if !value.Valid {
		return nil
	}
	result := store.UUIDString(value)
	return &result
}
