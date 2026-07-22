package reconciliation

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/apierr"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/audit"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/auth"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/country"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Line struct {
	ID            string  `json:"id"`
	EarningID     string  `json:"earningId"`
	CreatorName   string  `json:"creatorName"`
	CampaignTitle *string `json:"campaignTitle"`
	NetMinor      int64   `json:"netMinor"`
	Currency      string  `json:"currency"`
	Anomaly       *string `json:"anomaly"`
}

type Batch struct {
	ID            string  `json:"id"`
	Period        string  `json:"period"`
	Status        string  `json:"status"`
	LockedAt      *string `json:"lockedAt"`
	LineCount     int64   `json:"lineCount"`
	TotalNetMinor int64   `json:"totalNetMinor"`
	Currency      *string `json:"currency"`
	Lines         []Line  `json:"lines,omitempty"`
}

type Service struct {
	queries   *sqlcgen.Queries
	tx        *store.TxManager
	countries *country.Service
}

func NewService(queries *sqlcgen.Queries, tx *store.TxManager, countries *country.Service) *Service {
	return &Service{queries: queries, tx: tx, countries: countries}
}

func wireTime(value pgtype.Timestamptz) *string {
	if !value.Valid {
		return nil
	}
	result := value.Time.UTC().Format("2006-01-02T15:04:05.000Z")
	return &result
}

func currencyPointer(value any) *string {
	switch typed := value.(type) {
	case string:
		return &typed
	case []byte:
		result := string(typed)
		return &result
	default:
		return nil
	}
}

func batchFromList(row sqlcgen.ListReconciliationBatchesRow) Batch {
	return Batch{
		ID: store.UUIDString(row.ID), Period: row.Period, Status: string(row.Status),
		LockedAt: wireTime(row.LockedAt), LineCount: row.LineCount,
		TotalNetMinor: row.TotalNetMinor, Currency: currencyPointer(row.Currency),
	}
}

func (service *Service) authorize(ctx context.Context, principal auth.Context, market string) (sqlcgen.Country, error) {
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return sqlcgen.Country{}, err
	}
	if err := auth.AssertStaffForCountry(principal, store.UUIDString(countryRow.ID), "LOCAL_FINANCE"); err != nil {
		return sqlcgen.Country{}, err
	}
	return countryRow, nil
}

func (service *Service) List(ctx context.Context, principal auth.Context, market string) ([]Batch, error) {
	countryRow, err := service.authorize(ctx, principal, market)
	if err != nil {
		return nil, err
	}
	rows, err := service.queries.ListReconciliationBatches(ctx, countryRow.ID)
	if err != nil {
		return nil, fmt.Errorf("list reconciliation batches: %w", err)
	}
	result := make([]Batch, 0, len(rows))
	for _, row := range rows {
		result = append(result, batchFromList(row))
	}
	return result, nil
}

func normalizePeriod(raw string) (string, error) {
	period := strings.TrimSpace(raw)
	if period == "" {
		return time.Now().UTC().Format("2006-01"), nil
	}
	if parsed, err := time.Parse("2006-01", period); err != nil || parsed.Format("2006-01") != period {
		return "", apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", "period must use YYYY-MM format.")
	}
	return period, nil
}

func (service *Service) Create(ctx context.Context, principal auth.Context, market, rawPeriod string) (Batch, error) {
	countryRow, err := service.authorize(ctx, principal, market)
	if err != nil {
		return Batch{}, err
	}
	period, err := normalizePeriod(rawPeriod)
	if err != nil {
		return Batch{}, err
	}
	batchID := store.NewUUID()
	countryID := store.UUIDString(countryRow.ID)
	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		if _, err := queries.LockCountryForReconciliation(ctx, countryRow.ID); err != nil {
			return fmt.Errorf("lock reconciliation country: %w", err)
		}
		earnings, err := queries.ListPendingUnreconciledEarnings(ctx, countryRow.ID)
		if err != nil {
			return fmt.Errorf("list pending reconciliation earnings: %w", err)
		}
		if len(earnings) == 0 {
			return apierr.New(http.StatusConflict, "NOTHING_TO_RECONCILE", "There are no pending earnings to reconcile.")
		}
		if _, err := queries.CreateReconciliationBatch(ctx, sqlcgen.CreateReconciliationBatchParams{
			ID: batchID, CountryID: countryRow.ID, Period: period,
		}); err != nil {
			return fmt.Errorf("create reconciliation batch: %w", err)
		}
		for _, earning := range earnings {
			if _, err := queries.CreateReconciliationLine(ctx, sqlcgen.CreateReconciliationLineParams{
				ID: store.NewUUID(), BatchID: batchID, EarningID: earning.ID,
				NetMinor: earning.GrossMinor - earning.TaxMinor, Currency: earning.Currency,
			}); err != nil {
				return fmt.Errorf("create reconciliation line: %w", err)
			}
		}
		return audit.Record(ctx, queries, audit.Input{
			ActorUserID: principal.User.ID, CountryID: &countryID, Action: "RECON_BATCH_CREATED",
			TargetType: "recon_batch", TargetID: store.UUIDString(batchID),
			Metadata: map[string]any{"lineCount": len(earnings)},
		})
	})
	if err != nil {
		return Batch{}, err
	}
	return service.Get(ctx, principal, market, store.UUIDString(batchID))
}

func (service *Service) Get(ctx context.Context, principal auth.Context, market, rawBatchID string) (Batch, error) {
	countryRow, err := service.authorize(ctx, principal, market)
	if err != nil {
		return Batch{}, err
	}
	batchID, err := store.ParseUUID(rawBatchID)
	if err != nil {
		return Batch{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Reconciliation batch not found in this country.")
	}
	row, err := service.queries.GetReconciliationBatch(ctx, sqlcgen.GetReconciliationBatchParams{ID: batchID, CountryID: countryRow.ID})
	if errors.Is(err, pgx.ErrNoRows) {
		return Batch{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Reconciliation batch not found in this country.")
	}
	if err != nil {
		return Batch{}, fmt.Errorf("get reconciliation batch: %w", err)
	}
	lines, err := service.queries.ListReconciliationLines(ctx, batchID)
	if err != nil {
		return Batch{}, fmt.Errorf("list reconciliation lines: %w", err)
	}
	result := Batch{
		ID: store.UUIDString(row.ID), Period: row.Period, Status: string(row.Status),
		LockedAt: wireTime(row.LockedAt), LineCount: row.LineCount,
		TotalNetMinor: row.TotalNetMinor, Currency: currencyPointer(row.Currency),
		Lines: make([]Line, 0, len(lines)),
	}
	for _, line := range lines {
		title := line.CampaignTitle
		result.Lines = append(result.Lines, Line{
			ID: store.UUIDString(line.ID), EarningID: store.UUIDString(line.EarningID),
			CreatorName: line.CreatorName, CampaignTitle: &title, NetMinor: line.NetMinor,
			Currency: line.Currency, Anomaly: store.NullText(line.Anomaly),
		})
	}
	return result, nil
}

func (service *Service) Lock(ctx context.Context, principal auth.Context, market, rawBatchID string) (Batch, error) {
	countryRow, err := service.authorize(ctx, principal, market)
	if err != nil {
		return Batch{}, err
	}
	batchID, err := store.ParseUUID(rawBatchID)
	if err != nil {
		return Batch{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Reconciliation batch not found in this country.")
	}
	actorID, err := store.ParseUUID(principal.User.ID)
	if err != nil {
		return Batch{}, fmt.Errorf("parse reconciliation actor: %w", err)
	}
	countryID := store.UUIDString(countryRow.ID)
	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		if _, err := queries.GetReconciliationBatch(ctx, sqlcgen.GetReconciliationBatchParams{ID: batchID, CountryID: countryRow.ID}); errors.Is(err, pgx.ErrNoRows) {
			return apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Reconciliation batch not found in this country.")
		} else if err != nil {
			return fmt.Errorf("get reconciliation batch before lock: %w", err)
		}
		if _, err := queries.ClaimReconciliationBatchLock(ctx, sqlcgen.ClaimReconciliationBatchLockParams{ID: batchID, LockedBy: actorID}); errors.Is(err, pgx.ErrNoRows) {
			return apierr.New(http.StatusConflict, "BATCH_ALREADY_LOCKED", "This reconciliation batch is already locked.")
		} else if err != nil {
			return fmt.Errorf("claim reconciliation lock: %w", err)
		}
		released, err := queries.ReleaseBatchEarnings(ctx, batchID)
		if err != nil {
			return fmt.Errorf("release reconciled earnings: %w", err)
		}
		return audit.Record(ctx, queries, audit.Input{
			ActorUserID: principal.User.ID, CountryID: &countryID, Action: "RECON_BATCH_LOCKED",
			TargetType: "recon_batch", TargetID: rawBatchID,
			Metadata: map[string]any{"earningsReleased": len(released)},
		})
	})
	if err != nil {
		return Batch{}, err
	}
	return service.Get(ctx, principal, market, rawBatchID)
}
