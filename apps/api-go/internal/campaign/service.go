package campaign

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/apierr"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/audit"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/auth"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/country"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Summary struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Brand           string `json:"brand"`
	Platform        string `json:"platform"`
	RequiredHashtag string `json:"requiredHashtag"`
	Currency        string `json:"currency"`
	RewardMinor     int64  `json:"rewardMinor"`
	Status          string `json:"status"`
	SlotsTotal      int32  `json:"slotsTotal"`
	SlotsTaken      int32  `json:"slotsTaken"`
	SlotsLeft       int32  `json:"slotsLeft"`
	Full            bool   `json:"full"`
}

type RewardRule struct {
	TriggerType     string `json:"triggerType"`
	PricingType     string `json:"pricingType"`
	CapType         string `json:"capType"`
	FlatAmountMinor *int64 `json:"flatAmountMinor"`
	CapSlots        *int32 `json:"capSlots"`
	BudgetCapMinor  *int64 `json:"budgetCapMinor"`
}

type Detail struct {
	Summary
	Brief  string      `json:"brief"`
	Reward *RewardRule `json:"reward"`
}

type CreateInput struct {
	Title           string
	Brand           string
	Platform        string
	RequiredHashtag string
	Brief           string
	RewardMinor     float64
	SlotsTotal      float64
}

type Service struct {
	queries   *sqlcgen.Queries
	tx        *store.TxManager
	countries *country.Service
}

func NewService(queries *sqlcgen.Queries, tx *store.TxManager, countries *country.Service) *Service {
	return &Service{queries: queries, tx: tx, countries: countries}
}

func toSummary(row sqlcgen.Campaign) Summary {
	slotsLeft := row.SlotsTotal - row.SlotsTaken
	return Summary{
		ID: store.UUIDString(row.ID), Title: row.Title, Brand: row.Brand, Platform: row.Platform,
		RequiredHashtag: row.RequiredHashtag, Currency: row.Currency, RewardMinor: row.RewardMinor,
		Status: string(row.Status), SlotsTotal: row.SlotsTotal, SlotsTaken: row.SlotsTaken,
		SlotsLeft: slotsLeft, Full: slotsLeft <= 0,
	}
}

func toDetail(campaignRow sqlcgen.Campaign, rewardRow *sqlcgen.RewardRule) Detail {
	detail := Detail{Summary: toSummary(campaignRow), Brief: campaignRow.Brief}
	if rewardRow == nil {
		return detail
	}
	var flat *int64
	if rewardRow.FlatAmountMinor.Valid {
		value := rewardRow.FlatAmountMinor.Int64
		flat = &value
	}
	var capSlots *int32
	if rewardRow.CapSlots.Valid {
		value := rewardRow.CapSlots.Int32
		capSlots = &value
	}
	var budget *int64
	if flat != nil && capSlots != nil {
		value := *flat * int64(*capSlots)
		budget = &value
	}
	detail.Reward = &RewardRule{
		TriggerType: string(rewardRow.TriggerType), PricingType: string(rewardRow.PricingType),
		CapType: string(rewardRow.CapType), FlatAmountMinor: flat, CapSlots: capSlots,
		BudgetCapMinor: budget,
	}
	return detail
}

func (service *Service) List(ctx context.Context, market string) ([]Summary, error) {
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return nil, err
	}
	rows, err := service.queries.ListCampaignsByCountry(ctx, countryRow.ID)
	if err != nil {
		return nil, fmt.Errorf("list campaigns: %w", err)
	}
	result := make([]Summary, 0, len(rows))
	for _, row := range rows {
		result = append(result, toSummary(row))
	}
	return result, nil
}

func (service *Service) find(ctx context.Context, market, id string) (sqlcgen.Campaign, error) {
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return sqlcgen.Campaign{}, err
	}
	parsedID, err := store.ParseUUID(id)
	if err != nil {
		return sqlcgen.Campaign{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Campaign not found in this country.")
	}
	row, err := service.queries.GetCampaignForCountry(ctx, sqlcgen.GetCampaignForCountryParams{
		ID: parsedID, CountryID: countryRow.ID,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return sqlcgen.Campaign{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Campaign not found in this country.")
	}
	if err != nil {
		return sqlcgen.Campaign{}, fmt.Errorf("get campaign: %w", err)
	}
	return row, nil
}

func (service *Service) Get(ctx context.Context, market, id string) (Detail, error) {
	row, err := service.find(ctx, market, id)
	if err != nil {
		return Detail{}, err
	}
	reward, err := service.queries.GetRewardRuleByCampaignID(ctx, row.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		return toDetail(row, nil), nil
	}
	if err != nil {
		return Detail{}, fmt.Errorf("get campaign reward: %w", err)
	}
	return toDetail(row, &reward), nil
}

func (service *Service) Similar(ctx context.Context, market, id string) ([]Summary, error) {
	target, err := service.find(ctx, market, id)
	if err != nil {
		return nil, err
	}
	rows, err := service.queries.ListActiveCampaignsByCountry(ctx, target.CountryID)
	if err != nil {
		return nil, fmt.Errorf("list similar campaigns: %w", err)
	}
	filtered := make([]sqlcgen.Campaign, 0, len(rows))
	for _, row := range rows {
		if row.ID == target.ID || row.SlotsTaken >= row.SlotsTotal {
			continue
		}
		filtered = append(filtered, row)
	}
	sort.SliceStable(filtered, func(i, j int) bool {
		a, b := filtered[i], filtered[j]
		aPlatform, bPlatform := a.Platform == target.Platform, b.Platform == target.Platform
		if aPlatform != bPlatform {
			return aPlatform
		}
		return absolute(a.RewardMinor-target.RewardMinor) < absolute(b.RewardMinor-target.RewardMinor)
	})
	if len(filtered) > 3 {
		filtered = filtered[:3]
	}
	result := make([]Summary, 0, len(filtered))
	for _, row := range filtered {
		result = append(result, toSummary(row))
	}
	return result, nil
}

func absolute(value int64) int64 {
	if value < 0 {
		return -value
	}
	return value
}

func (service *Service) Create(ctx context.Context, principal auth.Context, market string, input CreateInput) (Detail, error) {
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return Detail{}, err
	}
	countryID := store.UUIDString(countryRow.ID)
	if err := auth.AssertStaffForCountry(principal, countryID, "LOCAL_ADMIN"); err != nil {
		return Detail{}, err
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return Detail{}, apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", "Title is required.")
	}
	if math.IsNaN(input.RewardMinor) || math.IsInf(input.RewardMinor, 0) || math.Trunc(input.RewardMinor) != input.RewardMinor || input.RewardMinor <= 0 || input.RewardMinor > math.MaxInt64 {
		return Detail{}, apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", "rewardMinor must be a positive integer.")
	}
	if math.IsNaN(input.SlotsTotal) || math.IsInf(input.SlotsTotal, 0) || math.Trunc(input.SlotsTotal) != input.SlotsTotal || input.SlotsTotal <= 0 || input.SlotsTotal > math.MaxInt32 {
		return Detail{}, apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", "slotsTotal must be a positive integer.")
	}
	rewardMinor := int64(input.RewardMinor)
	slotsTotal := int32(input.SlotsTotal)
	brand := strings.TrimSpace(input.Brand)
	if brand == "" {
		brand = "—"
	}
	platform := strings.TrimSpace(input.Platform)
	if platform == "" {
		platform = "—"
	}
	var campaignRow sqlcgen.Campaign
	var rewardRow sqlcgen.RewardRule
	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		created, err := queries.CreateCampaign(ctx, sqlcgen.CreateCampaignParams{
			ID: store.NewUUID(), CountryID: countryRow.ID, Brand: brand, Title: title,
			RewardMinor: rewardMinor, Currency: countryRow.CurrencyCode, SlotsTotal: slotsTotal,
			Platform: platform, RequiredHashtag: strings.TrimSpace(input.RequiredHashtag), Brief: strings.TrimSpace(input.Brief),
		})
		if err != nil {
			return fmt.Errorf("create campaign: %w", err)
		}
		reward, err := queries.CreateRewardRule(ctx, sqlcgen.CreateRewardRuleParams{
			ID: store.NewUUID(), CampaignID: created.ID,
			FlatAmountMinor: pgtype.Int8{Int64: rewardMinor, Valid: true},
			CapSlots:        pgtype.Int4{Int32: slotsTotal, Valid: true},
		})
		if err != nil {
			return fmt.Errorf("create campaign reward: %w", err)
		}
		if err := audit.Record(ctx, queries, audit.Input{
			ActorUserID: principal.User.ID, CountryID: &countryID, Action: "CAMPAIGN_CREATED",
			TargetType: "campaign", TargetID: store.UUIDString(created.ID),
			Metadata: map[string]any{"title": title, "rewardMinor": rewardMinor, "slotsTotal": slotsTotal},
		}); err != nil {
			return err
		}
		campaignRow, rewardRow = created, reward
		return nil
	})
	if err != nil {
		return Detail{}, err
	}
	return toDetail(campaignRow, &rewardRow), nil
}
