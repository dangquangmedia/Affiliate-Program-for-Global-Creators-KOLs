package earnings

import (
	"context"
	"fmt"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/country"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
	"github.com/jackc/pgx/v5/pgtype"
)

type Earning struct {
	ID            string  `json:"id"`
	CampaignTitle *string `json:"campaignTitle"`
	GrossMinor    int64   `json:"grossMinor"`
	TaxMinor      int64   `json:"taxMinor"`
	NetMinor      int64   `json:"netMinor"`
	Currency      string  `json:"currency"`
	Status        string  `json:"status"`
	CreatedAt     string  `json:"createdAt"`
}

type Summary struct {
	Currency          *string `json:"currency"`
	TotalGrossMinor   int64   `json:"totalGrossMinor"`
	TotalTaxMinor     int64   `json:"totalTaxMinor"`
	TotalNetMinor     int64   `json:"totalNetMinor"`
	PendingNetMinor   int64   `json:"pendingNetMinor"`
	AvailableNetMinor int64   `json:"availableNetMinor"`
	PaidNetMinor      int64   `json:"paidNetMinor"`
}

type LedgerEntry struct {
	ID                string `json:"id"`
	EntryType         string `json:"entryType"`
	AmountMinor       int64  `json:"amountMinor"`
	Currency          string `json:"currency"`
	RefType           string `json:"refType"`
	RefID             string `json:"refId"`
	CreatedAt         string `json:"createdAt"`
	BalanceAfterMinor int64  `json:"balanceAfterMinor"`
}

type Ledger struct {
	Entries      []LedgerEntry `json:"entries"`
	BalanceMinor int64         `json:"balanceMinor"`
	Currency     *string       `json:"currency"`
}

type Dashboard struct {
	Earnings []Earning `json:"earnings"`
	Summary  Summary   `json:"summary"`
	Ledger   Ledger    `json:"ledger"`
}

type Service struct {
	queries   *sqlcgen.Queries
	countries *country.Service
}

func NewService(queries *sqlcgen.Queries, countries *country.Service) *Service {
	return &Service{queries: queries, countries: countries}
}

func wireTime(value pgtype.Timestamptz) string {
	return value.Time.UTC().Format("2006-01-02T15:04:05.000Z")
}

func (service *Service) profile(ctx context.Context, userID, market string) (pgtype.UUID, pgtype.UUID, error) {
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return pgtype.UUID{}, pgtype.UUID{}, err
	}
	user, err := store.ParseUUID(userID)
	if err != nil {
		return pgtype.UUID{}, pgtype.UUID{}, fmt.Errorf("parse earnings user: %w", err)
	}
	profile, err := service.queries.UpsertCreatorCountryProfile(ctx, sqlcgen.UpsertCreatorCountryProfileParams{
		ID: store.NewUUID(), UserID: user, CountryID: countryRow.ID,
	})
	if err != nil {
		return pgtype.UUID{}, pgtype.UUID{}, fmt.Errorf("ensure earnings profile: %w", err)
	}
	return profile.ID, countryRow.ID, nil
}

func (service *Service) Dashboard(ctx context.Context, userID, market string) (Dashboard, error) {
	profileID, countryID, err := service.profile(ctx, userID, market)
	if err != nil {
		return Dashboard{}, err
	}
	rows, err := service.queries.ListEarningsForDashboard(ctx, sqlcgen.ListEarningsForDashboardParams{
		ProfileID: profileID, CountryID: countryID,
	})
	if err != nil {
		return Dashboard{}, fmt.Errorf("list earnings dashboard: %w", err)
	}
	earningRows := make([]Earning, 0, len(rows))
	summary := Summary{}
	for _, row := range rows {
		title := row.CampaignTitle
		net := row.GrossMinor - row.TaxMinor
		earningRows = append(earningRows, Earning{
			ID: store.UUIDString(row.ID), CampaignTitle: &title,
			GrossMinor: row.GrossMinor, TaxMinor: row.TaxMinor, NetMinor: net,
			Currency: row.Currency, Status: string(row.Status), CreatedAt: wireTime(row.CreatedAt),
		})
		summary.TotalGrossMinor += row.GrossMinor
		summary.TotalTaxMinor += row.TaxMinor
		switch row.Status {
		case sqlcgen.EarningStatusPENDING:
			summary.PendingNetMinor += net
		case sqlcgen.EarningStatusAVAILABLE:
			summary.AvailableNetMinor += net
		case sqlcgen.EarningStatusPAID:
			summary.PaidNetMinor += net
		}
	}
	summary.TotalNetMinor = summary.TotalGrossMinor - summary.TotalTaxMinor
	if len(rows) > 0 {
		currency := rows[0].Currency
		summary.Currency = &currency
	}

	ledgerRows, err := service.queries.ListLedgerEntriesForProfile(ctx, sqlcgen.ListLedgerEntriesForProfileParams{
		ProfileID: profileID, CountryID: countryID,
	})
	if err != nil {
		return Dashboard{}, fmt.Errorf("list earnings ledger: %w", err)
	}
	running := int64(0)
	entries := make([]LedgerEntry, 0, len(ledgerRows))
	for _, row := range ledgerRows {
		running += row.AmountMinor
		entries = append(entries, LedgerEntry{
			ID: store.UUIDString(row.ID), EntryType: string(row.EntryType), AmountMinor: row.AmountMinor,
			Currency: row.Currency, RefType: row.RefType, RefID: store.UUIDString(row.RefID),
			CreatedAt: wireTime(row.CreatedAt), BalanceAfterMinor: running,
		})
	}
	for left, right := 0, len(entries)-1; left < right; left, right = left+1, right-1 {
		entries[left], entries[right] = entries[right], entries[left]
	}
	ledger := Ledger{Entries: entries, BalanceMinor: running}
	if len(ledgerRows) > 0 {
		currency := ledgerRows[len(ledgerRows)-1].Currency
		ledger.Currency = &currency
	}
	return Dashboard{Earnings: earningRows, Summary: summary, Ledger: ledger}, nil
}
