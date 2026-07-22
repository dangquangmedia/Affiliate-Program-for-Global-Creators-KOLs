package kyc

import (
	"context"
	"errors"
	"fmt"
	"net/http"
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

var checklist = []struct {
	Key   string
	Label string
}{
	{Key: "fullName", Label: "Họ và tên"},
	{Key: "idNumber", Label: "Số CCCD/ID"},
	{Key: "bankAccount", Label: "Tài khoản ngân hàng"},
	{Key: "taxId", Label: "Mã số thuế"},
}

var fieldKeys = map[string]struct{}{
	"fullName": {}, "idNumber": {}, "bankAccount": {}, "taxId": {},
}

type Field struct {
	Key    string  `json:"key"`
	Label  string  `json:"label"`
	Value  *string `json:"value"`
	State  string  `json:"state"`
	Reason *string `json:"reason"`
}

type Case struct {
	CaseID string  `json:"caseId"`
	State  string  `json:"state"`
	Fields []Field `json:"fields"`
}

type QueueItem struct {
	CaseID        string  `json:"caseId"`
	CreatorName   string  `json:"creatorName"`
	State         string  `json:"state"`
	PendingFields int     `json:"pendingFields"`
	Fields        []Field `json:"fields"`
}

type Decision struct {
	Key      string
	Decision string
	Reason   string
}

type Service struct {
	queries   *sqlcgen.Queries
	tx        *store.TxManager
	countries *country.Service
}

func NewService(queries *sqlcgen.Queries, tx *store.TxManager, countries *country.Service) *Service {
	return &Service{queries: queries, tx: tx, countries: countries}
}

func (service *Service) ensureCase(ctx context.Context, profileID string) (sqlcgen.KycCase, []sqlcgen.KycField, error) {
	parsedProfileID, err := store.ParseUUID(profileID)
	if err != nil {
		return sqlcgen.KycCase{}, nil, fmt.Errorf("parse KYC profile: %w", err)
	}
	var kycCase sqlcgen.KycCase
	var fields []sqlcgen.KycField
	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		created, err := queries.UpsertKycCase(ctx, sqlcgen.UpsertKycCaseParams{ID: store.NewUUID(), ProfileID: parsedProfileID})
		if err != nil {
			return fmt.Errorf("upsert KYC case: %w", err)
		}
		for _, definition := range checklist {
			if err := queries.CreateKycField(ctx, sqlcgen.CreateKycFieldParams{
				ID: store.NewUUID(), CaseID: created.ID, Key: definition.Key, Label: definition.Label,
			}); err != nil {
				return fmt.Errorf("create KYC field: %w", err)
			}
		}
		loaded, err := queries.ListKycFields(ctx, created.ID)
		if err != nil {
			return fmt.Errorf("load KYC fields: %w", err)
		}
		kycCase, fields = created, loaded
		return nil
	})
	return kycCase, fields, err
}

func toCase(row sqlcgen.KycCase, rows []sqlcgen.KycField) Case {
	byKey := make(map[string]sqlcgen.KycField, len(rows))
	for _, row := range rows {
		byKey[row.Key] = row
	}
	fields := make([]Field, 0, len(checklist))
	for _, definition := range checklist {
		row, ok := byKey[definition.Key]
		if !ok {
			fields = append(fields, Field{Key: definition.Key, Label: definition.Label, State: "EMPTY"})
			continue
		}
		fields = append(fields, Field{
			Key: definition.Key, Label: definition.Label, Value: store.NullText(row.Value),
			State: string(row.State), Reason: store.NullText(row.Reason),
		})
	}
	return Case{CaseID: store.UUIDString(row.ID), State: string(row.State), Fields: fields}
}

func (service *Service) GetMyCase(ctx context.Context, userID, market string) (Case, error) {
	profile, err := service.countries.Select(ctx, userID, market)
	if err != nil {
		return Case{}, err
	}
	row, fields, err := service.ensureCase(ctx, profile.ProfileID)
	if err != nil {
		return Case{}, err
	}
	return toCase(row, fields), nil
}

func (service *Service) Submit(ctx context.Context, userID, market string, values map[string]string) (Case, error) {
	profile, err := service.countries.Select(ctx, userID, market)
	if err != nil {
		return Case{}, err
	}
	current, _, err := service.ensureCase(ctx, profile.ProfileID)
	if err != nil {
		return Case{}, err
	}
	var updated sqlcgen.KycCase
	var fields []sqlcgen.KycField
	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		for key, raw := range values {
			if _, allowed := fieldKeys[key]; !allowed {
				continue
			}
			value := strings.TrimSpace(raw)
			if value == "" {
				continue
			}
			if err := queries.UpdateEditableKycField(ctx, sqlcgen.UpdateEditableKycFieldParams{
				CaseID: current.ID, Key: key, Value: store.Text(value),
			}); err != nil {
				return fmt.Errorf("update KYC field: %w", err)
			}
		}
		reloaded, err := queries.SubmitKycCase(ctx, current.ID)
		if err != nil {
			return fmt.Errorf("submit KYC case: %w", err)
		}
		loaded, err := queries.ListKycFields(ctx, current.ID)
		if err != nil {
			return fmt.Errorf("reload KYC fields: %w", err)
		}
		updated, fields = reloaded, loaded
		return nil
	})
	if err != nil {
		return Case{}, err
	}
	return toCase(updated, fields), nil
}

func (service *Service) Queue(ctx context.Context, principal auth.Context, market string) ([]QueueItem, error) {
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return nil, err
	}
	if err := auth.AssertStaffForCountry(principal, store.UUIDString(countryRow.ID), "LOCAL_OPS", "LOCAL_ADMIN"); err != nil {
		return nil, err
	}
	rows, err := service.queries.ListKycQueueCases(ctx, countryRow.ID)
	if err != nil {
		return nil, fmt.Errorf("list KYC queue: %w", err)
	}
	result := make([]QueueItem, 0, len(rows))
	for _, row := range rows {
		fieldRows, err := service.queries.ListKycFields(ctx, row.ID)
		if err != nil {
			return nil, fmt.Errorf("load KYC queue fields: %w", err)
		}
		converted := toCase(sqlcgen.KycCase{ID: row.ID, State: row.State}, fieldRows)
		pending := 0
		for _, field := range converted.Fields {
			if field.State != "ACCEPTED" {
				pending++
			}
		}
		result = append(result, QueueItem{
			CaseID: converted.CaseID, CreatorName: row.CreatorName, State: converted.State,
			PendingFields: pending, Fields: converted.Fields,
		})
	}
	return result, nil
}

func (service *Service) Review(ctx context.Context, principal auth.Context, market, caseID string, decisions []Decision) (Case, error) {
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return Case{}, err
	}
	countryID := store.UUIDString(countryRow.ID)
	if err := auth.AssertStaffForCountry(principal, countryID, "LOCAL_OPS", "LOCAL_ADMIN"); err != nil {
		return Case{}, err
	}
	parsedCaseID, err := store.ParseUUID(caseID)
	if err != nil {
		return Case{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "KYC case not found in this country.")
	}
	for _, decision := range decisions {
		if _, allowed := fieldKeys[decision.Key]; !allowed {
			continue
		}
		if decision.Decision == "NEEDS_CHANGES" && strings.TrimSpace(decision.Reason) == "" {
			return Case{}, apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", fmt.Sprintf("Reason required to reject %q.", decision.Key))
		}
	}

	var updated sqlcgen.KycCase
	var fields []sqlcgen.KycField
	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		found, err := queries.GetKycCaseForCountry(ctx, parsedCaseID)
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && found.CountryID != countryRow.ID) {
			return apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "KYC case not found in this country.")
		}
		if err != nil {
			return fmt.Errorf("load KYC review case: %w", err)
		}
		if found.State != sqlcgen.KycCaseStateSUBMITTED && found.State != sqlcgen.KycCaseStateRESUBMITTED {
			return apierr.New(http.StatusConflict, "ALREADY_REVIEWED", "This KYC case has already been reviewed.")
		}
		for _, decision := range decisions {
			if _, allowed := fieldKeys[decision.Key]; !allowed {
				continue
			}
			state := sqlcgen.KycFieldStateACCEPTED
			var reason pgtype.Text
			if decision.Decision == "NEEDS_CHANGES" {
				state = sqlcgen.KycFieldStateNEEDSCHANGES
				reason = store.Text(strings.TrimSpace(decision.Reason))
			}
			if err := queries.ReviewKycField(ctx, sqlcgen.ReviewKycFieldParams{
				CaseID: parsedCaseID, Key: decision.Key, State: state, Reason: reason,
			}); err != nil {
				return fmt.Errorf("review KYC field: %w", err)
			}
		}
		allAccepted, err := queries.AllKycFieldsAccepted(ctx, parsedCaseID)
		if err != nil {
			return fmt.Errorf("resolve KYC outcome: %w", err)
		}
		nextState := sqlcgen.KycCaseStateREJECTED
		if allAccepted {
			nextState = sqlcgen.KycCaseStateAPPROVED
		}
		reviewerID, err := store.ParseUUID(principal.User.ID)
		if err != nil {
			return fmt.Errorf("parse KYC reviewer: %w", err)
		}
		finished, err := queries.FinishKycReview(ctx, sqlcgen.FinishKycReviewParams{
			ID: parsedCaseID, State: nextState, ReviewedBy: reviewerID,
		})
		if err != nil {
			return fmt.Errorf("finish KYC review: %w", err)
		}
		if err := audit.Record(ctx, queries, audit.Input{
			ActorUserID: principal.User.ID, CountryID: &countryID, Action: "KYC_REVIEWED",
			TargetType: "kyc_case", TargetID: caseID, Metadata: map[string]any{"outcome": string(nextState)},
		}); err != nil {
			return err
		}
		loaded, err := queries.ListKycFields(ctx, parsedCaseID)
		if err != nil {
			return fmt.Errorf("reload reviewed KYC fields: %w", err)
		}
		updated, fields = finished, loaded
		return nil
	})
	if err != nil {
		return Case{}, err
	}
	return toCase(updated, fields), nil
}
