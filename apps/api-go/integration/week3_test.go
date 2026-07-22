package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/campaign"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/country"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/kyc"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
)

func approvedWeek3Creator(t *testing.T, harness *week2Harness, opsToken, label string) string {
	t.Helper()
	token := harness.login(t, fmt.Sprintf("go-w3-%s-%d@example.com", label, time.Now().UnixNano()))
	status, payload := harness.request(t, http.MethodPost, "/me/country/vn/kyc", token, map[string]any{
		"values": map[string]any{
			"fullName": "Week Three", "idNumber": "W3-ID", "bankAccount": "W3-BANK", "taxId": "W3-TAX",
		},
	})
	requireStatus(t, status, http.StatusCreated, payload)
	kycCase := decodeBody[kyc.Case](t, payload)
	decisions := make([]map[string]any, 0, len(kycCase.Fields))
	for _, field := range kycCase.Fields {
		decisions = append(decisions, map[string]any{"key": field.Key, "decision": "ACCEPT"})
	}
	status, payload = harness.request(t, http.MethodPost, "/ops/vn/kyc/"+kycCase.CaseID+"/review", opsToken, map[string]any{"decisions": decisions})
	requireStatus(t, status, http.StatusCreated, payload)
	if reviewed := decodeBody[kyc.Case](t, payload); reviewed.State != "APPROVED" {
		t.Fatalf("KYC state = %s, want APPROVED", reviewed.State)
	}
	return token
}

func createWeek3Campaign(t *testing.T, harness *week2Harness, adminToken, label string, slots int) campaign.Detail {
	t.Helper()
	status, payload := harness.request(t, http.MethodPost, "/markets/vn/campaigns", adminToken, map[string]any{
		"title": fmt.Sprintf("Go W3 %s %d", label, time.Now().UnixNano()), "brand": "Week3",
		"platform": "TikTok", "requiredHashtag": "#GoWeek3", "brief": "transaction acceptance",
		"rewardMinor": 325000, "slotsTotal": slots,
	})
	requireStatus(t, status, http.StatusCreated, payload)
	return decodeBody[campaign.Detail](t, payload)
}

type concurrentResult struct {
	status int
	body   campaign.Participation
	err    error
}

func concurrentJoin(baseURL, token, campaignID string) concurrentResult {
	request, err := http.NewRequest(http.MethodPost, baseURL+"/markets/vn/campaigns/"+campaignID+"/join", nil)
	if err != nil {
		return concurrentResult{err: err}
	}
	request.Header.Set("Authorization", "Bearer "+token)
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return concurrentResult{err: err}
	}
	defer response.Body.Close()
	payload, err := io.ReadAll(response.Body)
	if err != nil {
		return concurrentResult{err: err}
	}
	var body campaign.Participation
	if err := json.NewDecoder(bytes.NewReader(payload)).Decode(&body); err != nil {
		return concurrentResult{status: response.StatusCode, err: fmt.Errorf("decode %s: %w", payload, err)}
	}
	return concurrentResult{status: response.StatusCode, body: body}
}

func participationByCampaign(t *testing.T, harness *week2Harness, token, campaignID string) *campaign.Participation {
	t.Helper()
	status, payload := harness.request(t, http.MethodGet, "/me/country/vn/participations", token, nil)
	requireStatus(t, status, http.StatusOK, payload)
	for _, item := range decodeBody[[]campaign.Participation](t, payload) {
		if item.CampaignID == campaignID {
			copy := item
			return &copy
		}
	}
	return nil
}

func assertSlotsTaken(t *testing.T, harness *week2Harness, campaignID string, want int32) {
	t.Helper()
	parsed, _ := store.ParseUUID(campaignID)
	var got int32
	if err := harness.pool.QueryRow(context.Background(), "SELECT slots_taken FROM campaign WHERE id=$1", parsed).Scan(&got); err != nil {
		t.Fatalf("read slots_taken: %v", err)
	}
	if got != want {
		t.Fatalf("slots_taken = %d, want %d", got, want)
	}
}

func TestWeek3JoinWaitlistReclaimAcceptance(t *testing.T) {
	harness := newWeek2Harness(t)
	admin := harness.login(t, "admin.vn@demo.affiliate.gl")
	ops := harness.login(t, "ops.vn@demo.affiliate.gl")

	t.Run("KYC gate", func(t *testing.T) {
		campaignRow := createWeek3Campaign(t, harness, admin, "kyc-gate", 1)
		unverified := harness.login(t, fmt.Sprintf("go-w3-no-kyc-%d@example.com", time.Now().UnixNano()))
		status, payload := harness.request(t, http.MethodPost, "/markets/vn/campaigns/"+campaignRow.ID+"/join", unverified, nil)
		requireStatus(t, status, http.StatusConflict, payload)
		errorBody := decodeBody[struct {
			Error struct {
				Code string `json:"code"`
			} `json:"error"`
		}](t, payload)
		if errorBody.Error.Code != "KYC_REQUIRED" {
			t.Fatalf("error code = %s, want KYC_REQUIRED", errorBody.Error.Code)
		}
		assertSlotsTaken(t, harness, campaignRow.ID, 0)
	})

	t.Run("three creators race for the final slot and leave promotes strict FCFS", func(t *testing.T) {
		campaignRow := createWeek3Campaign(t, harness, admin, "race", 1)
		tokens := []string{
			approvedWeek3Creator(t, harness, ops, "race-a"),
			approvedWeek3Creator(t, harness, ops, "race-b"),
			approvedWeek3Creator(t, harness, ops, "race-c"),
		}

		results := make([]concurrentResult, len(tokens))
		var wait sync.WaitGroup
		start := make(chan struct{})
		for index, token := range tokens {
			wait.Add(1)
			go func(index int, token string) {
				defer wait.Done()
				<-start
				results[index] = concurrentJoin(harness.server.URL, token, campaignRow.ID)
			}(index, token)
		}
		close(start)
		wait.Wait()

		joinedIndex := -1
		positionToIndex := map[int64]int{}
		for index, result := range results {
			if result.err != nil {
				t.Fatalf("concurrent join %d: %v", index, result.err)
			}
			if result.status != http.StatusCreated {
				t.Fatalf("concurrent join %d status=%d body=%+v", index, result.status, result.body)
			}
			switch result.body.State {
			case "JOINED":
				if joinedIndex != -1 {
					t.Fatal("more than one creator joined the final slot")
				}
				joinedIndex = index
				if result.body.SnapshotRewardMinor == nil || *result.body.SnapshotRewardMinor != 325000 || result.body.Currency == nil || *result.body.Currency != "VND" || result.body.SubmitDeadlineAt == nil {
					t.Fatalf("joined snapshot is incomplete: %+v", result.body)
				}
			case "WAITLISTED":
				if result.body.WaitlistPosition == nil || result.body.SnapshotRewardMinor != nil || result.body.SubmitDeadlineAt != nil {
					t.Fatalf("waitlist contract is incomplete: %+v", result.body)
				}
				positionToIndex[*result.body.WaitlistPosition] = index
			default:
				t.Fatalf("unexpected race state: %+v", result.body)
			}
		}
		if joinedIndex < 0 || len(positionToIndex) != 2 || positionToIndex[1] == positionToIndex[2] {
			t.Fatalf("race result joined=%d waitlist=%v", joinedIndex, positionToIndex)
		}
		assertSlotsTaken(t, harness, campaignRow.ID, 1)
		parsedCampaign, _ := store.ParseUUID(campaignRow.ID)
		var trigger, pricing string
		if err := harness.pool.QueryRow(context.Background(), "SELECT snapshot_trigger_type::text, snapshot_pricing_type::text FROM participation WHERE campaign_id=$1 AND state='JOINED'", parsedCampaign).Scan(&trigger, &pricing); err != nil {
			t.Fatalf("read snapshot rule: %v", err)
		}
		if trigger != "CONTENT_APPROVED" || pricing != "FLAT" {
			t.Fatalf("snapshot trigger/pricing = %s/%s", trigger, pricing)
		}

		// Join is idempotent for both the slot holder and a waitlisted creator.
		for _, index := range []int{joinedIndex, positionToIndex[1]} {
			status, payload := harness.request(t, http.MethodPost, "/markets/vn/campaigns/"+campaignRow.ID+"/join", tokens[index], nil)
			requireStatus(t, status, http.StatusCreated, payload)
		}
		assertSlotsTaken(t, harness, campaignRow.ID, 1)

		status, payload := harness.request(t, http.MethodPost, "/markets/vn/campaigns/"+campaignRow.ID+"/leave", tokens[joinedIndex], nil)
		requireStatus(t, status, http.StatusCreated, payload)
		first := participationByCampaign(t, harness, tokens[positionToIndex[1]], campaignRow.ID)
		second := participationByCampaign(t, harness, tokens[positionToIndex[2]], campaignRow.ID)
		if first == nil || first.State != "JOINED" || second == nil || second.State != "WAITLISTED" || second.WaitlistPosition == nil || *second.WaitlistPosition != 1 {
			t.Fatalf("first promotion failed: first=%+v second=%+v", first, second)
		}
		assertSlotsTaken(t, harness, campaignRow.ID, 1)

		status, payload = harness.request(t, http.MethodPost, "/markets/vn/campaigns/"+campaignRow.ID+"/leave", tokens[positionToIndex[1]], nil)
		requireStatus(t, status, http.StatusCreated, payload)
		last := participationByCampaign(t, harness, tokens[positionToIndex[2]], campaignRow.ID)
		if last == nil || last.State != "JOINED" {
			t.Fatalf("second FCFS promotion failed: %+v", last)
		}
		assertSlotsTaken(t, harness, campaignRow.ID, 1)
	})

	t.Run("submit and fix deadlines reclaim once and promote", func(t *testing.T) {
		queries := sqlcgen.New(harness.pool)
		service := campaign.NewService(queries, store.NewTxManager(harness.pool), country.NewService(queries))

		campaignRow := createWeek3Campaign(t, harness, admin, "reclaim-submit", 1)
		holder := approvedWeek3Creator(t, harness, ops, "reclaim-holder")
		waiting := approvedWeek3Creator(t, harness, ops, "reclaim-waiting")
		harness.request(t, http.MethodPost, "/markets/vn/campaigns/"+campaignRow.ID+"/join", holder, nil)
		harness.request(t, http.MethodPost, "/markets/vn/campaigns/"+campaignRow.ID+"/join", waiting, nil)
		parsedCampaign, _ := store.ParseUUID(campaignRow.ID)
		if _, err := harness.pool.Exec(context.Background(), "UPDATE participation SET submit_deadline_at=now()-interval '1 hour' WHERE campaign_id=$1 AND state='JOINED'", parsedCampaign); err != nil {
			t.Fatalf("make submit overdue: %v", err)
		}
		first, err := service.ReclaimExpired(context.Background(), time.Now())
		if err != nil || first.Reclaimed < 1 || first.Promoted < 1 {
			t.Fatalf("first reclaim = %+v error=%v", first, err)
		}
		if got := participationByCampaign(t, harness, holder, campaignRow.ID); got == nil || got.State != "EXPIRED" || got.StrikeCount != 1 {
			t.Fatalf("submit deadline holder was not expired: %+v", got)
		}
		if got := participationByCampaign(t, harness, waiting, campaignRow.ID); got == nil || got.State != "JOINED" {
			t.Fatalf("waitlist was not promoted after reclaim: %+v", got)
		}
		second, err := service.ReclaimExpired(context.Background(), time.Now())
		if err != nil || second.Reclaimed != 0 || second.Promoted != 0 {
			t.Fatalf("second sweep must be side-effect free: %+v error=%v", second, err)
		}
		assertSlotsTaken(t, harness, campaignRow.ID, 1)

		fixCampaign := createWeek3Campaign(t, harness, admin, "reclaim-fix", 1)
		fixHolder := approvedWeek3Creator(t, harness, ops, "fix-holder")
		status, payload := harness.request(t, http.MethodPost, "/markets/vn/campaigns/"+fixCampaign.ID+"/join", fixHolder, nil)
		requireStatus(t, status, http.StatusCreated, payload)
		parsedFixCampaign, _ := store.ParseUUID(fixCampaign.ID)
		if _, err := harness.pool.Exec(context.Background(), "UPDATE participation SET state='REJECTED', submit_deadline_at=NULL, fix_deadline_at=now()-interval '1 hour' WHERE campaign_id=$1", parsedFixCampaign); err != nil {
			t.Fatalf("make fix overdue: %v", err)
		}
		fixSweep, err := service.ReclaimExpired(context.Background(), time.Now())
		if err != nil || fixSweep.Reclaimed < 1 {
			t.Fatalf("fix deadline reclaim = %+v error=%v", fixSweep, err)
		}
		if got := participationByCampaign(t, harness, fixHolder, fixCampaign.ID); got == nil || got.State != "EXPIRED" || got.StrikeCount != 1 {
			t.Fatalf("fix deadline holder was not expired: %+v", got)
		}
		assertSlotsTaken(t, harness, fixCampaign.ID, 0)

		// Rejoin once, get reclaimed a second time, then the third join is blocked by strike policy.
		status, payload = harness.request(t, http.MethodPost, "/markets/vn/campaigns/"+fixCampaign.ID+"/join", fixHolder, nil)
		requireStatus(t, status, http.StatusCreated, payload)
		if _, err := harness.pool.Exec(context.Background(), "UPDATE participation SET submit_deadline_at=now()-interval '1 hour' WHERE campaign_id=$1 AND state='JOINED'", parsedFixCampaign); err != nil {
			t.Fatalf("make second join overdue: %v", err)
		}
		if sweep, err := service.ReclaimExpired(context.Background(), time.Now()); err != nil || sweep.Reclaimed < 1 {
			t.Fatalf("second strike sweep = %+v error=%v", sweep, err)
		}
		status, payload = harness.request(t, http.MethodPost, "/markets/vn/campaigns/"+fixCampaign.ID+"/join", fixHolder, nil)
		requireStatus(t, status, http.StatusConflict, payload)
		strikeError := decodeBody[struct {
			Error struct {
				Code string `json:"code"`
			} `json:"error"`
		}](t, payload)
		if strikeError.Error.Code != "JOIN_BLOCKED_STRIKE" {
			t.Fatalf("strike error code = %s, want JOIN_BLOCKED_STRIKE", strikeError.Error.Code)
		}
		assertSlotsTaken(t, harness, fixCampaign.ID, 0)
	})
}
