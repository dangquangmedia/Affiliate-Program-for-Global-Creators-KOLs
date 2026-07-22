package country

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/apierr"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
	"github.com/jackc/pgx/v5"
)

var marketPattern = regexp.MustCompile(`^[A-Z]{2}$`)

type Context struct {
	Market           string `json:"market"`
	CountryName      string `json:"countryName"`
	Currency         string `json:"currency"`
	CurrencyExponent int16  `json:"currencyExponent"`
	Locale           string `json:"locale"`
	FallbackLocale   string `json:"fallbackLocale"`
}

type MarketContext struct {
	Market           string `json:"market"`
	CountryName      string `json:"countryName"`
	Locale           string `json:"locale"`
	FallbackLocale   string `json:"fallbackLocale"`
	Currency         string `json:"currency"`
	CurrencyExponent int16  `json:"currencyExponent"`
	ConfigVersion    int32  `json:"configVersion"`
	Enabled          bool   `json:"enabled"`
}

type Profile struct {
	ProfileID       string  `json:"profileId"`
	OnboardingState string  `json:"onboardingState"`
	Context         Context `json:"context"`
}

type Service struct {
	queries *sqlcgen.Queries
}

func NewService(queries *sqlcgen.Queries) *Service {
	return &Service{queries: queries}
}

func (service *Service) GetMarketContext(ctx context.Context, market string) (MarketContext, error) {
	code := strings.ToUpper(market)
	if !marketPattern.MatchString(code) {
		return MarketContext{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", fmt.Sprintf("%q is not a recognized market.", market))
	}
	country, err := service.queries.GetCountryByCode(ctx, code)
	if errors.Is(err, pgx.ErrNoRows) {
		return MarketContext{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", fmt.Sprintf("%q is not a recognized market.", market))
	}
	if err != nil {
		return MarketContext{}, fmt.Errorf("get market country: %w", err)
	}
	config, err := service.queries.GetCountryConfigByCountryID(ctx, country.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		return MarketContext{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", fmt.Sprintf("Market %q has no country configuration.", code))
	}
	if err != nil {
		return MarketContext{}, fmt.Errorf("get market config: %w", err)
	}
	return MarketContext{
		Market: country.Code, CountryName: country.Name, Locale: country.Locale,
		FallbackLocale: country.FallbackLocale, Currency: country.CurrencyCode,
		CurrencyExponent: country.CurrencyExponent, ConfigVersion: config.ConfigVersion,
		Enabled: country.Enabled,
	}, nil
}

func (service *Service) RequireAvailable(ctx context.Context, market string) (sqlcgen.Country, error) {
	code := strings.ToUpper(market)
	if !marketPattern.MatchString(code) {
		return sqlcgen.Country{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", fmt.Sprintf("%q is not a market.", market))
	}
	row, err := service.queries.GetCountryByCode(ctx, code)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && !row.Enabled) {
		return sqlcgen.Country{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", fmt.Sprintf("Market %q is not available.", code))
	}
	if err != nil {
		return sqlcgen.Country{}, fmt.Errorf("require country: %w", err)
	}
	return row, nil
}

func contextFromCountry(row sqlcgen.Country) Context {
	return Context{
		Market: row.Code, CountryName: row.Name, Currency: row.CurrencyCode,
		CurrencyExponent: row.CurrencyExponent, Locale: row.Locale, FallbackLocale: row.FallbackLocale,
	}
}

func (service *Service) Select(ctx context.Context, userID, market string) (Profile, error) {
	country, err := service.RequireAvailable(ctx, market)
	if err != nil {
		return Profile{}, err
	}
	parsedUserID, err := store.ParseUUID(userID)
	if err != nil {
		return Profile{}, fmt.Errorf("parse profile user: %w", err)
	}
	profile, err := service.queries.UpsertCreatorCountryProfile(ctx, sqlcgen.UpsertCreatorCountryProfileParams{
		ID: store.NewUUID(), UserID: parsedUserID, CountryID: country.ID,
	})
	if err != nil {
		return Profile{}, fmt.Errorf("select creator country: %w", err)
	}
	return Profile{
		ProfileID: store.UUIDString(profile.ID), OnboardingState: profile.OnboardingState,
		Context: contextFromCountry(country),
	}, nil
}

func (service *Service) List(ctx context.Context, userID string) ([]Profile, error) {
	parsedUserID, err := store.ParseUUID(userID)
	if err != nil {
		return nil, fmt.Errorf("parse profile user: %w", err)
	}
	rows, err := service.queries.ListCreatorCountryProfiles(ctx, parsedUserID)
	if err != nil {
		return nil, fmt.Errorf("list creator countries: %w", err)
	}
	result := make([]Profile, 0, len(rows))
	for _, row := range rows {
		result = append(result, Profile{
			ProfileID: store.UUIDString(row.ProfileID), OnboardingState: row.OnboardingState,
			Context: Context{
				Market: row.Code, CountryName: row.Name, Currency: row.CurrencyCode,
				CurrencyExponent: row.CurrencyExponent, Locale: row.Locale, FallbackLocale: row.FallbackLocale,
			},
		})
	}
	return result, nil
}
