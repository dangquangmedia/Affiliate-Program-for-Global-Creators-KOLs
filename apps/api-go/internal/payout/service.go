package payout

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math"
	"math/big"
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
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

const otpTTL = 10 * time.Minute

type Payout struct {
	ID          string `json:"id"`
	AmountMinor int64  `json:"amountMinor"`
	Currency    string `json:"currency"`
	State       string `json:"state"`
	RequestedAt string `json:"requestedAt"`
}

type QueueItem struct {
	Payout
	CreatorName string `json:"creatorName"`
}

type OTP struct {
	OTPID     string `json:"otpId"`
	Code      string `json:"code"`
	ExpiresAt string `json:"expiresAt"`
}

type Wallet struct {
	WithdrawableMinor int64    `json:"withdrawableMinor"`
	MinPayoutMinor    int64    `json:"minPayoutMinor"`
	Currency          string   `json:"currency"`
	Payouts           []Payout `json:"payouts"`
}

type CreateInput struct {
	AmountMinor    float64
	OTPID          string
	Code           string
	IdempotencyKey string
}

type Service struct {
	queries   *sqlcgen.Queries
	tx        *store.TxManager
	countries *country.Service
	now       func() time.Time
}

func NewService(queries *sqlcgen.Queries, tx *store.TxManager, countries *country.Service) *Service {
	return &Service{queries: queries, tx: tx, countries: countries, now: time.Now}
}

func payoutDTO(row sqlcgen.PayoutRequest) Payout {
	return Payout{
		ID: store.UUIDString(row.ID), AmountMinor: row.AmountMinor, Currency: row.Currency,
		State: string(row.State), RequestedAt: row.RequestedAt.Time.UTC().Format("2006-01-02T15:04:05.000Z"),
	}
}

func (service *Service) profile(ctx context.Context, userID, market string) (sqlcgen.Country, sqlcgen.CreatorCountryProfile, error) {
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return sqlcgen.Country{}, sqlcgen.CreatorCountryProfile{}, err
	}
	parsedUserID, err := store.ParseUUID(userID)
	if err != nil {
		return sqlcgen.Country{}, sqlcgen.CreatorCountryProfile{}, fmt.Errorf("parse payout user: %w", err)
	}
	profile, err := service.queries.UpsertCreatorCountryProfile(ctx, sqlcgen.UpsertCreatorCountryProfileParams{
		ID: store.NewUUID(), UserID: parsedUserID, CountryID: countryRow.ID,
	})
	if err != nil {
		return sqlcgen.Country{}, sqlcgen.CreatorCountryProfile{}, fmt.Errorf("ensure payout profile: %w", err)
	}
	return countryRow, profile, nil
}

func (service *Service) withdrawable(ctx context.Context, queries *sqlcgen.Queries, profileID, countryID pgtype.UUID) (int64, error) {
	available, err := queries.SumAvailableEarningNet(ctx, sqlcgen.SumAvailableEarningNetParams{ProfileID: profileID, CountryID: countryID})
	if err != nil {
		return 0, fmt.Errorf("sum available earnings: %w", err)
	}
	outstanding, err := queries.SumOutstandingPayouts(ctx, sqlcgen.SumOutstandingPayoutsParams{ProfileID: profileID, CountryID: countryID})
	if err != nil {
		return 0, fmt.Errorf("sum outstanding payouts: %w", err)
	}
	return available - outstanding, nil
}

func (service *Service) Wallet(ctx context.Context, userID, market string) (Wallet, error) {
	countryRow, profile, err := service.profile(ctx, userID, market)
	if err != nil {
		return Wallet{}, err
	}
	balance, err := service.withdrawable(ctx, service.queries, profile.ID, countryRow.ID)
	if err != nil {
		return Wallet{}, err
	}
	config, err := service.queries.GetCountryConfigByCountryID(ctx, countryRow.ID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return Wallet{}, fmt.Errorf("get payout config: %w", err)
	}
	rows, err := service.queries.ListProfilePayouts(ctx, sqlcgen.ListProfilePayoutsParams{ProfileID: profile.ID, CountryID: countryRow.ID})
	if err != nil {
		return Wallet{}, fmt.Errorf("list wallet payouts: %w", err)
	}
	result := Wallet{WithdrawableMinor: balance, Currency: countryRow.CurrencyCode, Payouts: make([]Payout, 0, len(rows))}
	if err == nil {
		result.MinPayoutMinor = config.MinPayoutMinor
	}
	for _, row := range rows {
		result.Payouts = append(result.Payouts, payoutDTO(row))
	}
	return result, nil
}

func otpCode() (string, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", fmt.Errorf("generate payout OTP: %w", err)
	}
	return fmt.Sprintf("%06d", value.Int64()+100000), nil
}

func (service *Service) RequestOTP(ctx context.Context, userID, market string) (OTP, error) {
	_, _, err := service.profile(ctx, userID, market)
	if err != nil {
		return OTP{}, err
	}
	parsedUserID, _ := store.ParseUUID(userID)
	code, err := otpCode()
	if err != nil {
		return OTP{}, err
	}
	expiresAt := service.now().UTC().Add(otpTTL).Truncate(time.Millisecond)
	row, err := service.queries.CreatePayoutOTP(ctx, sqlcgen.CreatePayoutOTPParams{
		ID: store.NewUUID(), UserID: parsedUserID, Code: code, ExpiresAt: store.Timestamptz(expiresAt),
	})
	if err != nil {
		return OTP{}, fmt.Errorf("create payout OTP: %w", err)
	}
	return OTP{OTPID: store.UUIDString(row.ID), Code: row.Code, ExpiresAt: expiresAt.Format("2006-01-02T15:04:05.000Z")}, nil
}

func validateAmount(value float64) (int64, error) {
	if math.IsNaN(value) || math.IsInf(value, 0) || value <= 0 || math.Trunc(value) != value || value > math.MaxInt64 {
		return 0, apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", "amountMinor must be a positive integer.")
	}
	return int64(value), nil
}

func (service *Service) Create(ctx context.Context, userID, market string, input CreateInput) (Payout, error) {
	countryRow, profile, err := service.profile(ctx, userID, market)
	if err != nil {
		return Payout{}, err
	}
	key := strings.TrimSpace(input.IdempotencyKey)
	if key == "" {
		return Payout{}, apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", "idempotencyKey is required.")
	}
	if existing, err := service.queries.GetPayoutByIdempotencyKey(ctx, sqlcgen.GetPayoutByIdempotencyKeyParams{IdempotencyKey: key, ProfileID: profile.ID}); err == nil {
		return payoutDTO(existing), nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return Payout{}, fmt.Errorf("find idempotent payout: %w", err)
	}
	amount, err := validateAmount(input.AmountMinor)
	if err != nil {
		return Payout{}, err
	}
	config, err := service.queries.GetCountryConfigByCountryID(ctx, countryRow.ID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return Payout{}, fmt.Errorf("get payout config: %w", err)
	}
	minimum := int64(0)
	if err == nil {
		minimum = config.MinPayoutMinor
	}
	if amount < minimum {
		return Payout{}, apierr.New(http.StatusConflict, "BELOW_MIN_PAYOUT", fmt.Sprintf("Minimum payout is %d (minor units).", minimum))
	}
	otpID, err := store.ParseUUID(input.OTPID)
	if err != nil {
		return Payout{}, apierr.New(http.StatusConflict, "OTP_INVALID", "OTP code is invalid.")
	}
	parsedUserID, _ := store.ParseUUID(userID)
	var result Payout
	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		if _, err := queries.LockCreatorProfileForPayout(ctx, sqlcgen.LockCreatorProfileForPayoutParams{ID: profile.ID, CountryID: countryRow.ID}); err != nil {
			return fmt.Errorf("lock payout profile: %w", err)
		}
		if existing, err := queries.GetPayoutByIdempotencyKey(ctx, sqlcgen.GetPayoutByIdempotencyKeyParams{IdempotencyKey: key, ProfileID: profile.ID}); err == nil {
			result = payoutDTO(existing)
			return nil
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("recheck idempotent payout: %w", err)
		}
		otp, err := queries.GetPayoutOTPForUpdate(ctx, sqlcgen.GetPayoutOTPForUpdateParams{ID: otpID, UserID: parsedUserID})
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && otp.Code != input.Code) {
			return apierr.New(http.StatusConflict, "OTP_INVALID", "OTP code is invalid.")
		}
		if err != nil {
			return fmt.Errorf("lock payout OTP: %w", err)
		}
		if otp.ConsumedAt.Valid {
			return apierr.New(http.StatusConflict, "OTP_USED", "OTP has already been used.")
		}
		if otp.ExpiresAt.Time.Before(service.now()) {
			return apierr.New(http.StatusConflict, "OTP_EXPIRED", "OTP has expired.")
		}
		balance, err := service.withdrawable(ctx, queries, profile.ID, countryRow.ID)
		if err != nil {
			return err
		}
		if amount > balance {
			return apierr.New(http.StatusConflict, "INSUFFICIENT_BALANCE", "Amount exceeds withdrawable balance.")
		}
		if _, err := queries.ConsumePayoutOTP(ctx, otpID); errors.Is(err, pgx.ErrNoRows) {
			return apierr.New(http.StatusConflict, "OTP_USED", "OTP has already been used.")
		} else if err != nil {
			return fmt.Errorf("consume payout OTP: %w", err)
		}
		payoutID := store.NewUUID()
		row, err := queries.CreatePayoutRequest(ctx, sqlcgen.CreatePayoutRequestParams{
			ID: payoutID, CountryID: countryRow.ID, ProfileID: profile.ID, AmountMinor: amount,
			Currency: countryRow.CurrencyCode, OtpID: otpID, IdempotencyKey: key,
		})
		if err != nil {
			return fmt.Errorf("create payout request: %w", err)
		}
		if _, err := queries.CreateLedgerEntry(ctx, sqlcgen.CreateLedgerEntryParams{
			ID: store.NewUUID(), CountryID: countryRow.ID, ProfileID: profile.ID,
			EntryType: sqlcgen.LedgerEntryTypePAYOUTRESERVE, AmountMinor: -amount,
			Currency: countryRow.CurrencyCode, RefType: "payout", RefID: payoutID,
		}); err != nil {
			return fmt.Errorf("post payout reserve: %w", err)
		}
		result = payoutDTO(row)
		return nil
	})
	if err == nil {
		return result, nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		if existing, lookupErr := service.queries.GetPayoutByIdempotencyKey(ctx, sqlcgen.GetPayoutByIdempotencyKeyParams{IdempotencyKey: key, ProfileID: profile.ID}); lookupErr == nil {
			return payoutDTO(existing), nil
		}
	}
	return Payout{}, err
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

func (service *Service) listState(ctx context.Context, principal auth.Context, market string, state sqlcgen.PayoutState) ([]QueueItem, error) {
	countryRow, err := service.authorize(ctx, principal, market)
	if err != nil {
		return nil, err
	}
	rows, err := service.queries.ListPayoutQueueByState(ctx, sqlcgen.ListPayoutQueueByStateParams{CountryID: countryRow.ID, State: state})
	if err != nil {
		return nil, fmt.Errorf("list payout queue: %w", err)
	}
	result := make([]QueueItem, 0, len(rows))
	for _, row := range rows {
		result = append(result, QueueItem{Payout: Payout{
			ID: store.UUIDString(row.ID), AmountMinor: row.AmountMinor, Currency: row.Currency,
			State: string(row.State), RequestedAt: row.RequestedAt.Time.UTC().Format("2006-01-02T15:04:05.000Z"),
		}, CreatorName: row.CreatorName})
	}
	return result, nil
}

func (service *Service) Queue(ctx context.Context, principal auth.Context, market string) ([]QueueItem, error) {
	return service.listState(ctx, principal, market, sqlcgen.PayoutStatePROCESSING)
}

func (service *Service) Holds(ctx context.Context, principal auth.Context, market string) ([]QueueItem, error) {
	return service.listState(ctx, principal, market, sqlcgen.PayoutStateUNKNOWNHOLD)
}

func validateResult(result string, resolve bool) error {
	valid := result == "SUCCESS" || result == "FAIL" || (!resolve && result == "UNKNOWN")
	if valid {
		return nil
	}
	message := `result must be "SUCCESS" | "FAIL" | "UNKNOWN".`
	if resolve {
		message = `result must be "SUCCESS" | "FAIL".`
	}
	return apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", message)
}

func (service *Service) Settle(ctx context.Context, principal auth.Context, market, payoutID, result string) (Payout, error) {
	return service.applyOutcome(ctx, principal, market, payoutID, result, false)
}

func (service *Service) Resolve(ctx context.Context, principal auth.Context, market, payoutID, result string) (Payout, error) {
	return service.applyOutcome(ctx, principal, market, payoutID, result, true)
}

func (service *Service) applyOutcome(ctx context.Context, principal auth.Context, market, rawPayoutID, result string, resolve bool) (Payout, error) {
	if err := validateResult(result, resolve); err != nil {
		return Payout{}, err
	}
	countryRow, err := service.authorize(ctx, principal, market)
	if err != nil {
		return Payout{}, err
	}
	payoutID, err := store.ParseUUID(rawPayoutID)
	if err != nil {
		return Payout{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Payout not found in this country.")
	}
	payoutRow, err := service.queries.GetPayoutInCountry(ctx, sqlcgen.GetPayoutInCountryParams{ID: payoutID, CountryID: countryRow.ID})
	if errors.Is(err, pgx.ErrNoRows) {
		return Payout{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Payout not found in this country.")
	}
	if err != nil {
		return Payout{}, fmt.Errorf("get payout in country: %w", err)
	}
	fromState, conflictCode, conflictMessage, action := sqlcgen.PayoutStatePROCESSING, "ALREADY_SETTLED", "This payout has already been settled", "PAYOUT_SETTLED"
	if resolve {
		fromState, conflictCode, conflictMessage, action = sqlcgen.PayoutStateUNKNOWNHOLD, "NOT_ON_HOLD", "This payout is not awaiting manual resolution", "PAYOUT_RESOLVED"
	}
	toState := sqlcgen.PayoutStateUNKNOWNHOLD
	if result == "SUCCESS" {
		toState = sqlcgen.PayoutStatePAID
	} else if result == "FAIL" {
		toState = sqlcgen.PayoutStateFAILEDRELEASED
	}
	countryID := store.UUIDString(countryRow.ID)
	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		if _, err := queries.LockCreatorProfileForPayout(ctx, sqlcgen.LockCreatorProfileForPayoutParams{ID: payoutRow.ProfileID, CountryID: countryRow.ID}); err != nil {
			return fmt.Errorf("lock settlement profile: %w", err)
		}
		claimed, err := queries.ClaimPayoutState(ctx, sqlcgen.ClaimPayoutStateParams{ToState: toState, ID: payoutID, FromState: fromState})
		if errors.Is(err, pgx.ErrNoRows) {
			return apierr.New(http.StatusConflict, conflictCode, conflictMessage)
		}
		if err != nil {
			return fmt.Errorf("claim payout outcome: %w", err)
		}
		attemptNo, err := queries.NextPayoutAttemptNo(ctx, payoutID)
		if err != nil {
			return fmt.Errorf("get payout attempt number: %w", err)
		}
		if _, err := queries.CreatePayoutAttempt(ctx, sqlcgen.CreatePayoutAttemptParams{
			ID: store.NewUUID(), PayoutRequestID: payoutID,
			ProviderRef: fmt.Sprintf("mock-%s-%d", rawPayoutID, attemptNo),
			Result:      sqlcgen.PayoutAttemptResult(result), Raw: store.Text("mock provider " + strings.ToLower(result)),
		}); err != nil {
			return fmt.Errorf("create payout attempt: %w", err)
		}
		if result == "FAIL" {
			if _, err := queries.CreateLedgerEntry(ctx, sqlcgen.CreateLedgerEntryParams{
				ID: store.NewUUID(), CountryID: claimed.CountryID, ProfileID: claimed.ProfileID,
				EntryType: sqlcgen.LedgerEntryTypePAYOUTRELEASE, AmountMinor: claimed.AmountMinor,
				Currency: claimed.Currency, RefType: "payout", RefID: payoutID,
			}); err != nil {
				return fmt.Errorf("post payout release: %w", err)
			}
		}
		return audit.Record(ctx, queries, audit.Input{
			ActorUserID: principal.User.ID, CountryID: &countryID, Action: action,
			TargetType: "payout", TargetID: rawPayoutID,
			Metadata: map[string]any{"result": result, "fromState": string(fromState), "toState": string(toState)},
		})
	})
	if err != nil {
		return Payout{}, err
	}
	payoutRow.State = toState
	return payoutDTO(payoutRow), nil
}
