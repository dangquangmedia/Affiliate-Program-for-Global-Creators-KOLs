package campaign

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/apierr"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	SubmitSLA  = 48 * time.Hour
	FixSLA     = 24 * time.Hour
	MaxStrikes = int32(2)
)

var holdingStates = map[sqlcgen.ParticipationState]bool{
	sqlcgen.ParticipationStateJOINED:           true,
	sqlcgen.ParticipationStateCONTENTSUBMITTED: true,
	sqlcgen.ParticipationStateAPPROVED:         true,
	sqlcgen.ParticipationStateREJECTED:         true,
	sqlcgen.ParticipationStateWAITLISTED:       true,
}

var slotHoldingStates = map[sqlcgen.ParticipationState]bool{
	sqlcgen.ParticipationStateJOINED:           true,
	sqlcgen.ParticipationStateCONTENTSUBMITTED: true,
	sqlcgen.ParticipationStateAPPROVED:         true,
	sqlcgen.ParticipationStateREJECTED:         true,
}

type Participation struct {
	CampaignID          string  `json:"campaignId"`
	CampaignTitle       *string `json:"campaignTitle,omitempty"`
	State               string  `json:"state"`
	SnapshotRewardMinor *int64  `json:"snapshotRewardMinor"`
	Currency            *string `json:"currency"`
	SubmitDeadlineAt    *string `json:"submitDeadlineAt"`
	WaitlistedAt        *string `json:"waitlistedAt"`
	WaitlistPosition    *int64  `json:"waitlistPosition"`
	JoinedAt            *string `json:"joinedAt"`
	StrikeCount         int32   `json:"strikeCount"`
}

type ReclaimResult struct {
	Reclaimed int `json:"reclaimed"`
	Promoted  int `json:"promoted"`
}

type lockedCampaign struct {
	ID          pgtype.UUID
	RewardMinor int64
	Currency    string
	SlotsTotal  int32
	SlotsTaken  int32
	Status      sqlcgen.CampaignStatus
	EndsAt      pgtype.Timestamptz
	TriggerType sqlcgen.TriggerType
	PricingType sqlcgen.PricingType
}

func wireTime(value pgtype.Timestamptz) *string {
	if !value.Valid {
		return nil
	}
	formatted := value.Time.UTC().Format("2006-01-02T15:04:05.000Z")
	return &formatted
}

func participationDTO(row sqlcgen.Participation, title *string, position *int64) Participation {
	var reward *int64
	if row.SnapshotRewardMinor.Valid {
		value := row.SnapshotRewardMinor.Int64
		reward = &value
	}
	return Participation{
		CampaignID: store.UUIDString(row.CampaignID), CampaignTitle: title,
		State: string(row.State), SnapshotRewardMinor: reward,
		Currency: store.NullText(row.SnapshotCurrency), SubmitDeadlineAt: wireTime(row.SubmitDeadlineAt),
		WaitlistedAt: wireTime(row.WaitlistedAt), WaitlistPosition: position,
		JoinedAt: wireTime(row.JoinedAt), StrikeCount: row.StrikeCount,
	}
}

func campaignFromJoin(row sqlcgen.LockCampaignForJoinRow) lockedCampaign {
	return lockedCampaign{
		ID: row.ID, RewardMinor: row.RewardMinor, Currency: row.Currency,
		SlotsTotal: row.SlotsTotal, SlotsTaken: row.SlotsTaken, Status: row.Status,
		EndsAt: row.EndsAt, TriggerType: row.TriggerType, PricingType: row.PricingType,
	}
}

func campaignFromReclaim(row sqlcgen.LockCampaignForReclaimRow) lockedCampaign {
	return lockedCampaign{
		ID: row.ID, RewardMinor: row.RewardMinor, Currency: row.Currency,
		SlotsTotal: row.SlotsTotal, SlotsTaken: row.SlotsTaken, Status: row.Status,
		EndsAt: row.EndsAt, TriggerType: row.TriggerType, PricingType: row.PricingType,
	}
}

func isJoinable(row lockedCampaign, now time.Time) bool {
	return row.Status == sqlcgen.CampaignStatusACTIVE && (!row.EndsAt.Valid || row.EndsAt.Time.After(now))
}

func joinedParams(id pgtype.UUID, campaign lockedCampaign, now time.Time) sqlcgen.UpdateJoinedParticipationParams {
	now = now.UTC().Truncate(time.Millisecond)
	return sqlcgen.UpdateJoinedParticipationParams{
		ID: id, JoinedAt: store.Timestamptz(now),
		SnapshotRewardMinor: pgtype.Int8{Int64: campaign.RewardMinor, Valid: true},
		SnapshotCurrency:    store.Text(campaign.Currency),
		SnapshotTriggerType: sqlcgen.NullTriggerType{TriggerType: campaign.TriggerType, Valid: true},
		SnapshotPricingType: sqlcgen.NullPricingType{PricingType: campaign.PricingType, Valid: true},
		SubmitDeadlineAt:    store.Timestamptz(now.Add(SubmitSLA)),
	}
}

func (service *Service) profileForJoin(ctx context.Context, userID, market string) (pgtype.UUID, pgtype.UUID, error) {
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return pgtype.UUID{}, pgtype.UUID{}, err
	}
	user, err := store.ParseUUID(userID)
	if err != nil {
		return pgtype.UUID{}, pgtype.UUID{}, fmt.Errorf("parse creator user: %w", err)
	}
	profile, err := service.queries.UpsertCreatorCountryProfile(ctx, sqlcgen.UpsertCreatorCountryProfileParams{
		ID: store.NewUUID(), UserID: user, CountryID: countryRow.ID,
	})
	if err != nil {
		return pgtype.UUID{}, pgtype.UUID{}, fmt.Errorf("ensure creator profile: %w", err)
	}
	return profile.ID, countryRow.ID, nil
}

func waitlistPosition(ctx context.Context, queries *sqlcgen.Queries, row sqlcgen.Participation) (*int64, error) {
	if row.State != sqlcgen.ParticipationStateWAITLISTED || !row.WaitlistedAt.Valid {
		return nil, nil
	}
	position, err := queries.CountWaitlistAhead(ctx, sqlcgen.CountWaitlistAheadParams{
		CampaignID: row.CampaignID, WaitlistedAt: row.WaitlistedAt,
	})
	if err != nil {
		return nil, fmt.Errorf("count waitlist position: %w", err)
	}
	position++
	return &position, nil
}

// Join locks the country-scoped campaign row before checking capacity, making the slot counter
// authoritative under concurrent requests. A full campaign creates a strictly ordered waitlist.
func (service *Service) Join(ctx context.Context, userID, market, campaignID string) (Participation, error) {
	profileID, countryID, err := service.profileForJoin(ctx, userID, market)
	if err != nil {
		return Participation{}, err
	}
	parsedCampaignID, err := store.ParseUUID(campaignID)
	if err != nil {
		return Participation{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Campaign not found in this country.")
	}

	var result Participation
	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		locked, err := queries.LockCampaignForJoin(ctx, sqlcgen.LockCampaignForJoinParams{ID: parsedCampaignID, CountryID: countryID})
		if errors.Is(err, pgx.ErrNoRows) {
			return apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Campaign not found in this country.")
		}
		if err != nil {
			return fmt.Errorf("lock campaign for join: %w", err)
		}
		campaign := campaignFromJoin(locked)
		now := time.Now().UTC()
		if !isJoinable(campaign, now) {
			return apierr.New(http.StatusConflict, "CAMPAIGN_NOT_JOINABLE", "Campaign is paused, ended, or past its deadline.")
		}

		existing, err := queries.GetParticipationForJoin(ctx, sqlcgen.GetParticipationForJoinParams{
			ProfileID: profileID, CampaignID: parsedCampaignID,
		})
		hasExisting := err == nil
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("get existing participation: %w", err)
		}
		if hasExisting && holdingStates[existing.State] {
			position, err := waitlistPosition(ctx, queries, existing)
			if err != nil {
				return err
			}
			result = participationDTO(existing, nil, position)
			return nil
		}

		kycState, err := queries.GetKycStateForProfile(ctx, profileID)
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && kycState != sqlcgen.KycCaseStateAPPROVED) {
			return apierr.New(http.StatusConflict, "KYC_REQUIRED", "KYC must be approved before joining (QĐ-2).")
		}
		if err != nil {
			return fmt.Errorf("check join KYC: %w", err)
		}
		if hasExisting && existing.StrikeCount >= MaxStrikes {
			return apierr.New(http.StatusConflict, "JOIN_BLOCKED_STRIKE", fmt.Sprintf("Blocked after %d reclaimed slots on this campaign.", MaxStrikes))
		}

		if campaign.SlotsTaken >= campaign.SlotsTotal {
			waitlistedAt, err := queries.NextWaitlistedAt(ctx, parsedCampaignID)
			if err != nil {
				return fmt.Errorf("allocate waitlist timestamp: %w", err)
			}
			var saved sqlcgen.Participation
			if hasExisting {
				saved, err = queries.UpdateWaitlistedParticipation(ctx, sqlcgen.UpdateWaitlistedParticipationParams{ID: existing.ID, WaitlistedAt: waitlistedAt})
			} else {
				saved, err = queries.CreateWaitlistedParticipation(ctx, sqlcgen.CreateWaitlistedParticipationParams{
					ID: store.NewUUID(), ProfileID: profileID, CampaignID: parsedCampaignID,
					CountryID: countryID, WaitlistedAt: waitlistedAt,
				})
			}
			if err != nil {
				return fmt.Errorf("save waitlisted participation: %w", err)
			}
			position, err := waitlistPosition(ctx, queries, saved)
			if err != nil {
				return err
			}
			result = participationDTO(saved, nil, position)
			return nil
		}

		params := joinedParams(existing.ID, campaign, now)
		var saved sqlcgen.Participation
		if hasExisting {
			saved, err = queries.UpdateJoinedParticipation(ctx, params)
		} else {
			saved, err = queries.CreateJoinedParticipation(ctx, sqlcgen.CreateJoinedParticipationParams{
				ID: store.NewUUID(), ProfileID: profileID, CampaignID: parsedCampaignID, CountryID: countryID,
				JoinedAt: params.JoinedAt, SnapshotRewardMinor: params.SnapshotRewardMinor,
				SnapshotCurrency: params.SnapshotCurrency, SnapshotTriggerType: params.SnapshotTriggerType,
				SnapshotPricingType: params.SnapshotPricingType, SubmitDeadlineAt: params.SubmitDeadlineAt,
			})
		}
		if err != nil {
			return fmt.Errorf("save joined participation: %w", err)
		}
		if err := queries.IncrementCampaignSlots(ctx, parsedCampaignID); err != nil {
			return fmt.Errorf("increment campaign slots: %w", err)
		}
		result = participationDTO(saved, nil, nil)
		return nil
	})
	return result, err
}

func (service *Service) promoteNext(ctx context.Context, queries *sqlcgen.Queries, campaign lockedCampaign, now time.Time) (bool, error) {
	if !isJoinable(campaign, now) || campaign.SlotsTaken >= campaign.SlotsTotal {
		return false, nil
	}
	next, err := queries.GetNextWaitlistedParticipation(ctx, campaign.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("get next waitlisted participation: %w", err)
	}
	if _, err := queries.UpdateJoinedParticipation(ctx, joinedParams(next.ID, campaign, now)); err != nil {
		return false, fmt.Errorf("promote waitlisted participation: %w", err)
	}
	if err := queries.IncrementCampaignSlots(ctx, campaign.ID); err != nil {
		return false, fmt.Errorf("increment promoted campaign slot: %w", err)
	}
	return true, nil
}

func (service *Service) Leave(ctx context.Context, userID, market, campaignID string) (Participation, error) {
	profileID, countryID, err := service.profileForJoin(ctx, userID, market)
	if err != nil {
		return Participation{}, err
	}
	parsedCampaignID, err := store.ParseUUID(campaignID)
	if err != nil {
		return Participation{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "You have not joined this campaign.")
	}
	var result Participation
	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		locked, lockErr := queries.LockCampaignForJoin(ctx, sqlcgen.LockCampaignForJoinParams{ID: parsedCampaignID, CountryID: countryID})
		if lockErr != nil && !errors.Is(lockErr, pgx.ErrNoRows) {
			return fmt.Errorf("lock campaign for leave: %w", lockErr)
		}
		existing, err := queries.GetParticipationForJoin(ctx, sqlcgen.GetParticipationForJoinParams{ProfileID: profileID, CampaignID: parsedCampaignID})
		if errors.Is(err, pgx.ErrNoRows) {
			return apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "You have not joined this campaign.")
		}
		if err != nil {
			return fmt.Errorf("get participation for leave: %w", err)
		}
		if existing.State == sqlcgen.ParticipationStateAPPROVED {
			return apierr.New(http.StatusConflict, "ALREADY_DELIVERED", "Cannot leave a campaign you have already delivered.")
		}
		if !slotHoldingStates[existing.State] {
			if existing.State == sqlcgen.ParticipationStateWAITLISTED {
				existing, err = queries.LeaveParticipation(ctx, existing.ID)
				if err != nil {
					return fmt.Errorf("leave waitlist: %w", err)
				}
			}
			result = participationDTO(existing, nil, nil)
			return nil
		}
		if errors.Is(lockErr, pgx.ErrNoRows) {
			return apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Campaign not found in this country.")
		}
		saved, err := queries.LeaveParticipation(ctx, existing.ID)
		if err != nil {
			return fmt.Errorf("leave participation: %w", err)
		}
		if err := queries.DecrementCampaignSlots(ctx, parsedCampaignID); err != nil {
			return fmt.Errorf("decrement campaign slots: %w", err)
		}
		campaign := campaignFromJoin(locked)
		if campaign.SlotsTaken > 0 {
			campaign.SlotsTaken--
		}
		if _, err := service.promoteNext(ctx, queries, campaign, time.Now().UTC()); err != nil {
			return err
		}
		result = participationDTO(saved, nil, nil)
		return nil
	})
	return result, err
}

func (service *Service) ListMine(ctx context.Context, userID, market string) ([]Participation, error) {
	profileID, countryID, err := service.profileForJoin(ctx, userID, market)
	if err != nil {
		return nil, err
	}
	rows, err := service.queries.ListMyParticipations(ctx, sqlcgen.ListMyParticipationsParams{ProfileID: profileID, CountryID: countryID})
	if err != nil {
		return nil, fmt.Errorf("list creator participations: %w", err)
	}
	result := make([]Participation, 0, len(rows))
	for _, row := range rows {
		var position *int64
		if row.State == sqlcgen.ParticipationStateWAITLISTED {
			value := row.WaitlistPosition
			position = &value
		}
		base := sqlcgen.Participation{
			ID: row.ID, ProfileID: row.ProfileID, CampaignID: row.CampaignID, CountryID: row.CountryID,
			State: row.State, JoinedAt: row.JoinedAt, SnapshotRewardMinor: row.SnapshotRewardMinor,
			SnapshotCurrency: row.SnapshotCurrency, SnapshotTriggerType: row.SnapshotTriggerType,
			SnapshotPricingType: row.SnapshotPricingType, RowVersion: row.RowVersion,
			FixDeadlineAt: row.FixDeadlineAt, StrikeCount: row.StrikeCount,
			SubmitDeadlineAt: row.SubmitDeadlineAt, WaitlistedAt: row.WaitlistedAt,
		}
		title := row.CampaignTitle
		result = append(result, participationDTO(base, &title, position))
	}
	return result, nil
}

// ReclaimExpired performs one finite, idempotent sweep. Every candidate is rechecked while its
// campaign is locked, so a concurrent submit/leave cannot be reclaimed from stale scan results.
func (service *Service) ReclaimExpired(ctx context.Context, now time.Time) (ReclaimResult, error) {
	now = now.UTC()
	candidates, err := service.queries.ListExpiredParticipationCandidates(ctx, store.Timestamptz(now))
	if err != nil {
		return ReclaimResult{}, fmt.Errorf("list expired participations: %w", err)
	}
	result := ReclaimResult{}
	for _, candidate := range candidates {
		reclaimed, promoted, err := service.reclaimOne(ctx, candidate.ID, candidate.CampaignID, now)
		if err != nil {
			return result, err
		}
		if reclaimed {
			result.Reclaimed++
		}
		if promoted {
			result.Promoted++
		}
	}
	return result, nil
}

func (service *Service) reclaimOne(ctx context.Context, participationID, campaignID pgtype.UUID, now time.Time) (bool, bool, error) {
	var reclaimed, promoted bool
	err := service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		locked, err := queries.LockCampaignForReclaim(ctx, campaignID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return fmt.Errorf("lock campaign for reclaim: %w", err)
		}
		row, err := queries.GetParticipationByID(ctx, participationID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		if err != nil {
			return fmt.Errorf("get reclaim participation: %w", err)
		}
		overdue := (row.State == sqlcgen.ParticipationStateJOINED && row.SubmitDeadlineAt.Valid && row.SubmitDeadlineAt.Time.Before(now)) ||
			(row.State == sqlcgen.ParticipationStateREJECTED && row.FixDeadlineAt.Valid && row.FixDeadlineAt.Time.Before(now))
		if !overdue {
			return nil
		}
		if _, err := queries.ExpireParticipation(ctx, row.ID); err != nil {
			return fmt.Errorf("expire participation: %w", err)
		}
		if err := queries.DecrementCampaignSlots(ctx, campaignID); err != nil {
			return fmt.Errorf("decrement reclaimed campaign slot: %w", err)
		}
		reclaimed = true
		campaign := campaignFromReclaim(locked)
		if campaign.SlotsTaken > 0 {
			campaign.SlotsTaken--
		}
		promoted, err = service.promoteNext(ctx, queries, campaign, now)
		return err
	})
	return reclaimed, promoted, err
}
