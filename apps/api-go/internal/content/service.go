package content

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/apierr"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/audit"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/auth"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/campaign"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/country"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

var platformDomains = map[string][]string{
	"tiktok":    {"tiktok.com"},
	"instagram": {"instagram.com"},
	"youtube":   {"youtube.com", "youtu.be"},
	"facebook":  {"facebook.com", "fb.com", "fb.watch"},
}

type Submission struct {
	ID           string  `json:"id"`
	AttemptNo    int32   `json:"attemptNo"`
	URL          string  `json:"url"`
	State        string  `json:"state"`
	RejectReason *string `json:"rejectReason"`
	HashtagOK    bool    `json:"hashtagOk"`
	PlatformOK   bool    `json:"platformOk"`
	CreatedAt    string  `json:"createdAt"`
}

type MyContent struct {
	ParticipationState string       `json:"participationState"`
	CampaignTitle      *string      `json:"campaignTitle"`
	RequiredHashtag    *string      `json:"requiredHashtag"`
	Platform           *string      `json:"platform"`
	FixDeadlineAt      *string      `json:"fixDeadlineAt"`
	Submissions        []Submission `json:"submissions"`
}

type QueueItem struct {
	SubmissionID  string `json:"submissionId"`
	CreatorName   string `json:"creatorName"`
	CampaignTitle string `json:"campaignTitle"`
	URL           string `json:"url"`
	AttemptNo     int32  `json:"attemptNo"`
	HashtagOK     bool   `json:"hashtagOk"`
	PlatformOK    bool   `json:"platformOk"`
	SubmittedAt   string `json:"submittedAt"`
}

type Service struct {
	queries   *sqlcgen.Queries
	tx        *store.TxManager
	countries *country.Service
}

func NewService(queries *sqlcgen.Queries, tx *store.TxManager, countries *country.Service) *Service {
	return &Service{queries: queries, tx: tx, countries: countries}
}

func formatTime(value pgtype.Timestamptz) string {
	return value.Time.UTC().Format("2006-01-02T15:04:05.000Z")
}

func nullableTime(value pgtype.Timestamptz) *string {
	if !value.Valid {
		return nil
	}
	formatted := formatTime(value)
	return &formatted
}

func toSubmission(row sqlcgen.ContentSubmission) Submission {
	return Submission{
		ID: store.UUIDString(row.ID), AttemptNo: row.AttemptNo, URL: row.Url,
		State: string(row.State), RejectReason: store.NullText(row.RejectReason),
		HashtagOK: row.HashtagOk, PlatformOK: row.PlatformOk, CreatedAt: formatTime(row.CreatedAt),
	}
}

func (service *Service) profile(ctx context.Context, userID, market string) (pgtype.UUID, pgtype.UUID, error) {
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return pgtype.UUID{}, pgtype.UUID{}, err
	}
	user, err := store.ParseUUID(userID)
	if err != nil {
		return pgtype.UUID{}, pgtype.UUID{}, fmt.Errorf("parse content user: %w", err)
	}
	profile, err := service.queries.UpsertCreatorCountryProfile(ctx, sqlcgen.UpsertCreatorCountryProfileParams{
		ID: store.NewUUID(), UserID: user, CountryID: countryRow.ID,
	})
	if err != nil {
		return pgtype.UUID{}, pgtype.UUID{}, fmt.Errorf("ensure content profile: %w", err)
	}
	return profile.ID, countryRow.ID, nil
}

func parseCampaignID(raw string) (pgtype.UUID, error) {
	id, err := store.ParseUUID(raw)
	if err != nil {
		return pgtype.UUID{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "You have not joined this campaign.")
	}
	return id, nil
}

func validatePostURL(raw, platform string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return "", apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", "A valid http(s) post URL is required.")
	}
	domains := platformDomains[strings.ToLower(strings.TrimSpace(platform))]
	if len(domains) > 0 {
		host := strings.ToLower(parsed.Hostname())
		valid := false
		for _, domain := range domains {
			if host == domain || strings.HasSuffix(host, "."+domain) {
				valid = true
				break
			}
		}
		if !valid {
			return "", apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", fmt.Sprintf("URL must be a %s link.", platform))
		}
	}
	return parsed.String(), nil
}

// Submit serializes attempts by locking the participation. This keeps attempt_no and the
// supersedes chain correct even when a creator double-clicks submit concurrently.
func (service *Service) Submit(ctx context.Context, userID, market, campaignID, rawURL, caption string) (MyContent, error) {
	profileID, countryID, err := service.profile(ctx, userID, market)
	if err != nil {
		return MyContent{}, err
	}
	parsedCampaignID, err := parseCampaignID(campaignID)
	if err != nil {
		return MyContent{}, err
	}

	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		participation, err := queries.LockParticipationForContent(ctx, sqlcgen.LockParticipationForContentParams{
			ProfileID: profileID, CampaignID: parsedCampaignID, CountryID: countryID,
		})
		if errors.Is(err, pgx.ErrNoRows) {
			return apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "You have not joined this campaign.")
		}
		if err != nil {
			return fmt.Errorf("lock participation for content: %w", err)
		}
		switch participation.State {
		case sqlcgen.ParticipationStateAPPROVED:
			return apierr.New(http.StatusConflict, "ALREADY_DELIVERED", "Content already approved for this campaign.")
		case sqlcgen.ParticipationStateCONTENTSUBMITTED:
			return apierr.New(http.StatusConflict, "SUBMISSION_PENDING", "Your submission is waiting for review.")
		case sqlcgen.ParticipationStateJOINED, sqlcgen.ParticipationStateREJECTED:
		default:
			return apierr.New(http.StatusConflict, "NOT_HOLDING_SLOT", "You must hold a slot (JOINED) to submit content.")
		}

		normalizedURL, err := validatePostURL(rawURL, participation.CampaignPlatform)
		if err != nil {
			return err
		}
		requiredTag := strings.ToLower(strings.TrimSpace(participation.RequiredHashtag))
		hashtagOK := requiredTag == "" || strings.Contains(strings.ToLower(caption), requiredTag)
		attemptNo, err := queries.NextSubmissionAttemptNo(ctx, participation.ID)
		if err != nil {
			return fmt.Errorf("next submission attempt: %w", err)
		}
		var supersedesID pgtype.UUID
		lastRejected, err := queries.GetLatestRejectedSubmission(ctx, participation.ID)
		if err == nil {
			supersedesID = lastRejected.ID
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("get rejected submission: %w", err)
		}
		if _, err := queries.CreateContentSubmission(ctx, sqlcgen.CreateContentSubmissionParams{
			ID: store.NewUUID(), ParticipationID: participation.ID, AttemptNo: attemptNo,
			SupersedesID: supersedesID, Url: normalizedURL, Platform: participation.CampaignPlatform,
			HashtagOk: hashtagOK, PlatformOk: true,
		}); err != nil {
			return fmt.Errorf("create content submission: %w", err)
		}
		if err := queries.MarkParticipationContentSubmitted(ctx, participation.ID); err != nil {
			return fmt.Errorf("mark content submitted: %w", err)
		}
		return nil
	})
	if err != nil {
		return MyContent{}, err
	}
	return service.MyContent(ctx, userID, market, campaignID)
}

func (service *Service) MyContent(ctx context.Context, userID, market, campaignID string) (MyContent, error) {
	profileID, countryID, err := service.profile(ctx, userID, market)
	if err != nil {
		return MyContent{}, err
	}
	parsedCampaignID, err := parseCampaignID(campaignID)
	if err != nil {
		return MyContent{}, err
	}
	participation, err := service.queries.GetParticipationForContent(ctx, sqlcgen.GetParticipationForContentParams{
		ProfileID: profileID, CampaignID: parsedCampaignID, CountryID: countryID,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return MyContent{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "You have not joined this campaign.")
	}
	if err != nil {
		return MyContent{}, fmt.Errorf("get creator content participation: %w", err)
	}
	rows, err := service.queries.ListContentSubmissions(ctx, participation.ID)
	if err != nil {
		return MyContent{}, fmt.Errorf("list content submissions: %w", err)
	}
	submissions := make([]Submission, 0, len(rows))
	for _, row := range rows {
		submissions = append(submissions, toSubmission(row))
	}
	title, platform, hashtag := participation.CampaignTitle, participation.CampaignPlatform, participation.RequiredHashtag
	return MyContent{
		ParticipationState: string(participation.State), CampaignTitle: &title,
		RequiredHashtag: &hashtag, Platform: &platform,
		FixDeadlineAt: nullableTime(participation.FixDeadlineAt), Submissions: submissions,
	}, nil
}

func (service *Service) Queue(ctx context.Context, principal auth.Context, market string) ([]QueueItem, error) {
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return nil, err
	}
	if err := auth.AssertStaffForCountry(principal, store.UUIDString(countryRow.ID), "LOCAL_OPS", "LOCAL_ADMIN"); err != nil {
		return nil, err
	}
	rows, err := service.queries.ListContentQueue(ctx, countryRow.ID)
	if err != nil {
		return nil, fmt.Errorf("list content queue: %w", err)
	}
	result := make([]QueueItem, 0, len(rows))
	for _, row := range rows {
		result = append(result, QueueItem{
			SubmissionID: store.UUIDString(row.SubmissionID), CreatorName: row.CreatorName,
			CampaignTitle: row.CampaignTitle, URL: row.Url, AttemptNo: row.AttemptNo,
			HashtagOK: row.HashtagOk, PlatformOK: row.PlatformOk, SubmittedAt: formatTime(row.SubmittedAt),
		})
	}
	return result, nil
}

func calculateTax(gross int64, percent int32) (int64, error) {
	if gross < 0 || percent < 0 || percent > 100 {
		return 0, fmt.Errorf("invalid tax inputs gross=%d percent=%d", gross, percent)
	}
	pct := int64(percent)
	return (gross/100)*pct + ((gross%100)*pct)/100, nil
}

func postLedger(ctx context.Context, queries *sqlcgen.Queries, earning sqlcgen.Earning) error {
	base := sqlcgen.CreateLedgerEntryParams{
		CountryID: earning.CountryID, ProfileID: earning.ProfileID, Currency: earning.Currency,
		RefType: "earning", RefID: earning.ID, EarningID: earning.ID,
	}
	base.ID, base.EntryType, base.AmountMinor = store.NewUUID(), sqlcgen.LedgerEntryTypeEARNINGACCRUE, earning.GrossMinor
	if _, err := queries.CreateLedgerEntry(ctx, base); err != nil {
		return fmt.Errorf("post earning accrual: %w", err)
	}
	if earning.TaxMinor > 0 {
		base.ID, base.EntryType, base.AmountMinor = store.NewUUID(), sqlcgen.LedgerEntryTypeTAX, -earning.TaxMinor
		if _, err := queries.CreateLedgerEntry(ctx, base); err != nil {
			return fmt.Errorf("post earning tax: %w", err)
		}
	}
	return nil
}

func (service *Service) Review(ctx context.Context, principal auth.Context, market, submissionID, decision, reason string) (Submission, error) {
	if decision != "APPROVE" && decision != "REJECT" {
		return Submission{}, apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", `decision must be "APPROVE" or "REJECT".`)
	}
	reason = strings.TrimSpace(reason)
	if decision == "REJECT" && reason == "" {
		return Submission{}, apierr.New(http.StatusBadRequest, "VALIDATION_ERROR", "Reason is required to reject a submission.")
	}
	countryRow, err := service.countries.RequireAvailable(ctx, market)
	if err != nil {
		return Submission{}, err
	}
	countryID := store.UUIDString(countryRow.ID)
	if err := auth.AssertStaffForCountry(principal, countryID, "LOCAL_OPS", "LOCAL_ADMIN"); err != nil {
		return Submission{}, err
	}
	parsedSubmissionID, err := store.ParseUUID(submissionID)
	if err != nil {
		return Submission{}, apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Submission not found in this country.")
	}
	reviewerID, err := store.ParseUUID(principal.User.ID)
	if err != nil {
		return Submission{}, fmt.Errorf("parse content reviewer: %w", err)
	}

	var result Submission
	err = service.tx.WithinTx(ctx, pgx.TxOptions{}, func(queries *sqlcgen.Queries) error {
		submission, err := queries.GetSubmissionForReviewCountry(ctx, sqlcgen.GetSubmissionForReviewCountryParams{
			ID: parsedSubmissionID, CountryID: countryRow.ID,
		})
		if errors.Is(err, pgx.ErrNoRows) {
			return apierr.New(http.StatusNotFound, "RESOURCE_NOT_FOUND", "Submission not found in this country.")
		}
		if err != nil {
			return fmt.Errorf("get submission for review: %w", err)
		}
		nextState := sqlcgen.SubmissionStateAPPROVED
		var rejectReason pgtype.Text
		if decision == "REJECT" {
			nextState = sqlcgen.SubmissionStateREJECTED
			rejectReason = store.Text(reason)
		}
		claimed, err := queries.ClaimContentReview(ctx, sqlcgen.ClaimContentReviewParams{
			NextState: nextState, RejectReason: rejectReason, ReviewedBy: reviewerID, ID: parsedSubmissionID,
		})
		if errors.Is(err, pgx.ErrNoRows) {
			return apierr.New(http.StatusConflict, "ALREADY_REVIEWED", "This submission has already been reviewed.")
		}
		if err != nil {
			return fmt.Errorf("claim content review: %w", err)
		}

		if decision == "APPROVE" {
			gross := int64(0)
			if submission.SnapshotRewardMinor.Valid {
				gross = submission.SnapshotRewardMinor.Int64
			}
			taxPercent := int32(0)
			config, err := queries.GetCountryConfigByCountryID(ctx, countryRow.ID)
			if err == nil {
				taxPercent = config.TaxPercent
			} else if !errors.Is(err, pgx.ErrNoRows) {
				return fmt.Errorf("get earning tax config: %w", err)
			}
			tax, err := calculateTax(gross, taxPercent)
			if err != nil {
				return err
			}
			currency := countryRow.CurrencyCode
			if submission.SnapshotCurrency.Valid {
				currency = submission.SnapshotCurrency.String
			}
			earning, err := queries.CreateEarning(ctx, sqlcgen.CreateEarningParams{
				ID: store.NewUUID(), ParticipationID: submission.ParticipationID,
				SubmissionID: submission.ID, CountryID: countryRow.ID, ProfileID: submission.ProfileID,
				GrossMinor: gross, TaxMinor: tax, Currency: currency,
			})
			if err != nil {
				return fmt.Errorf("create approved earning: %w", err)
			}
			if err := postLedger(ctx, queries, earning); err != nil {
				return err
			}
			if err := queries.MarkParticipationApproved(ctx, submission.ParticipationID); err != nil {
				return fmt.Errorf("mark participation approved: %w", err)
			}
		} else {
			if err := queries.MarkParticipationRejected(ctx, sqlcgen.MarkParticipationRejectedParams{
				ID: submission.ParticipationID, FixDeadlineAt: store.Timestamptz(time.Now().UTC().Add(campaign.FixSLA).Truncate(time.Millisecond)),
			}); err != nil {
				return fmt.Errorf("mark participation rejected: %w", err)
			}
		}

		metadata := map[string]any{}
		action := "CONTENT_APPROVED"
		if decision == "REJECT" {
			action = "CONTENT_REJECTED"
			metadata["reason"] = reason
		}
		if err := audit.Record(ctx, queries, audit.Input{
			ActorUserID: principal.User.ID, CountryID: &countryID, Action: action,
			TargetType: "submission", TargetID: submissionID, Metadata: metadata,
		}); err != nil {
			return err
		}
		result = toSubmission(claimed)
		return nil
	})
	return result, err
}
