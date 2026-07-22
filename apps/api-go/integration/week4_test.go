package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/campaign"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/content"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/earnings"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/kyc"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
)

func approvedWeek4Creator(t *testing.T, harness *week2Harness, opsToken, market, label string) string {
	t.Helper()
	token := harness.login(t, fmt.Sprintf("go-w4-%s-%s-%d@example.com", market, label, time.Now().UnixNano()))
	status, payload := harness.request(t, http.MethodPost, "/me/country/"+market+"/kyc", token, map[string]any{
		"values": map[string]any{
			"fullName": "Week Four", "idNumber": "W4-ID", "bankAccount": "W4-BANK", "taxId": "W4-TAX",
		},
	})
	requireStatus(t, status, http.StatusCreated, payload)
	kycCase := decodeBody[kyc.Case](t, payload)
	decisions := make([]map[string]any, 0, len(kycCase.Fields))
	for _, field := range kycCase.Fields {
		decisions = append(decisions, map[string]any{"key": field.Key, "decision": "ACCEPT"})
	}
	status, payload = harness.request(t, http.MethodPost, "/ops/"+market+"/kyc/"+kycCase.CaseID+"/review", opsToken, map[string]any{"decisions": decisions})
	requireStatus(t, status, http.StatusCreated, payload)
	return token
}

func createWeek4Campaign(t *testing.T, harness *week2Harness, adminToken, market, label string, reward int64) campaign.Detail {
	t.Helper()
	status, payload := harness.request(t, http.MethodPost, "/markets/"+market+"/campaigns", adminToken, map[string]any{
		"title": fmt.Sprintf("Go W4 %s %d", label, time.Now().UnixNano()), "brand": "Week4",
		"platform": "TikTok", "requiredHashtag": "#GoW4", "brief": "content and ledger acceptance",
		"rewardMinor": reward, "slotsTotal": 5,
	})
	requireStatus(t, status, http.StatusCreated, payload)
	return decodeBody[campaign.Detail](t, payload)
}

func joinedWeek4Creator(t *testing.T, harness *week2Harness, adminToken, opsToken, market, label string, reward int64) (string, campaign.Detail) {
	t.Helper()
	token := approvedWeek4Creator(t, harness, opsToken, market, label)
	campaignRow := createWeek4Campaign(t, harness, adminToken, market, label, reward)
	status, payload := harness.request(t, http.MethodPost, "/markets/"+market+"/campaigns/"+campaignRow.ID+"/join", token, nil)
	requireStatus(t, status, http.StatusCreated, payload)
	return token, campaignRow
}

func submitWeek4(t *testing.T, harness *week2Harness, token, market, campaignID, postURL, caption string) (int, []byte) {
	t.Helper()
	return harness.request(t, http.MethodPost, "/me/country/"+market+"/campaigns/"+campaignID+"/content", token, map[string]any{
		"url": postURL, "caption": caption,
	})
}

func reviewWeek4(t *testing.T, harness *week2Harness, token, market, submissionID, decision, reason string) (int, []byte) {
	t.Helper()
	body := map[string]any{"decision": decision}
	if reason != "" {
		body["reason"] = reason
	}
	return harness.request(t, http.MethodPost, "/ops/"+market+"/content/"+submissionID+"/review", token, body)
}

type rawHTTPResult struct {
	status  int
	payload []byte
	err     error
}

func rawJSONRequest(method, endpoint, token string, body any) rawHTTPResult {
	encoded, err := json.Marshal(body)
	if err != nil {
		return rawHTTPResult{err: err}
	}
	request, err := http.NewRequest(method, endpoint, bytes.NewReader(encoded))
	if err != nil {
		return rawHTTPResult{err: err}
	}
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Content-Type", "application/json")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return rawHTTPResult{err: err}
	}
	defer response.Body.Close()
	payload, err := io.ReadAll(response.Body)
	return rawHTTPResult{status: response.StatusCode, payload: payload, err: err}
}

func TestWeek4ContentEarningLedgerAcceptance(t *testing.T) {
	harness := newWeek2Harness(t)
	adminVN := harness.login(t, "admin.vn@demo.affiliate.gl")
	opsVN := harness.login(t, "ops.vn@demo.affiliate.gl")
	adminPH := harness.login(t, "admin.ph@demo.affiliate.gl")
	opsPH := harness.login(t, "ops.ph@demo.affiliate.gl")

	t.Run("submit validation, advisory hashtag, queue isolation and concurrent submit", func(t *testing.T) {
		campaignRow := createWeek4Campaign(t, harness, adminVN, "vn", "not-joined", 500000)
		notJoined := approvedWeek4Creator(t, harness, opsVN, "vn", "not-joined")
		status, payload := submitWeek4(t, harness, notJoined, "vn", campaignRow.ID, "https://www.tiktok.com/@w4/video/1", "#GoW4")
		requireStatus(t, status, http.StatusNotFound, payload)

		creator, joined := joinedWeek4Creator(t, harness, adminVN, opsVN, "vn", "validation", 500000)
		status, payload = submitWeek4(t, harness, creator, "vn", joined.ID, "https://www.facebook.com/post/1", "#GoW4")
		requireStatus(t, status, http.StatusBadRequest, payload)
		status, payload = submitWeek4(t, harness, creator, "vn", joined.ID, "https://www.tiktok.com/@w4/video/2", "caption without campaign tag")
		requireStatus(t, status, http.StatusCreated, payload)
		mine := decodeBody[content.MyContent](t, payload)
		if mine.ParticipationState != "CONTENT_SUBMITTED" || len(mine.Submissions) != 1 || mine.Submissions[0].HashtagOK || !mine.Submissions[0].PlatformOK {
			t.Fatalf("unexpected content submission: %+v", mine)
		}
		status, payload = submitWeek4(t, harness, creator, "vn", joined.ID, "https://www.tiktok.com/@w4/video/3", "#GoW4")
		requireStatus(t, status, http.StatusConflict, payload)

		status, payload = harness.request(t, http.MethodGet, "/ops/vn/content/queue", opsVN, nil)
		requireStatus(t, status, http.StatusOK, payload)
		queueVN := decodeBody[[]content.QueueItem](t, payload)
		if len(queueVN) == 0 {
			t.Fatal("VN content queue is empty")
		}
		status, payload = harness.request(t, http.MethodGet, "/ops/ph/content/queue", opsPH, nil)
		requireStatus(t, status, http.StatusOK, payload)
		queuePH := decodeBody[[]content.QueueItem](t, payload)
		for _, item := range queuePH {
			if item.SubmissionID == mine.Submissions[0].ID {
				t.Fatal("VN submission leaked into PH queue")
			}
		}
		status, payload = harness.request(t, http.MethodGet, "/ops/vn/content/queue", creator, nil)
		requireStatus(t, status, http.StatusForbidden, payload)
		status, payload = reviewWeek4(t, harness, opsPH, "ph", mine.Submissions[0].ID, "APPROVE", "")
		requireStatus(t, status, http.StatusNotFound, payload)

		concurrentCreator, concurrentCampaign := joinedWeek4Creator(t, harness, adminVN, opsVN, "vn", "submit-race", 500000)
		endpoint := harness.server.URL + "/me/country/vn/campaigns/" + concurrentCampaign.ID + "/content"
		results := make([]rawHTTPResult, 2)
		start := make(chan struct{})
		var wait sync.WaitGroup
		for index := range results {
			wait.Add(1)
			go func(index int) {
				defer wait.Done()
				<-start
				results[index] = rawJSONRequest(http.MethodPost, endpoint, concurrentCreator, map[string]any{
					"url": fmt.Sprintf("https://www.tiktok.com/@w4/video/race-%d", index), "caption": "#GoW4",
				})
			}(index)
		}
		close(start)
		wait.Wait()
		statuses := []int{results[0].status, results[1].status}
		sort.Ints(statuses)
		if results[0].err != nil || results[1].err != nil || statuses[0] != http.StatusCreated || statuses[1] != http.StatusConflict {
			t.Fatalf("concurrent submit results=%+v statuses=%v", results, statuses)
		}
		parsedCampaign, _ := store.ParseUUID(concurrentCampaign.ID)
		var attempts int
		if err := harness.pool.QueryRow(context.Background(), `SELECT count(*) FROM content_submission s JOIN participation p ON p.id=s.participation_id WHERE p.campaign_id=$1`, parsedCampaign).Scan(&attempts); err != nil {
			t.Fatalf("count concurrent attempts: %v", err)
		}
		if attempts != 1 {
			t.Fatalf("concurrent submit attempts = %d, want 1", attempts)
		}
	})

	t.Run("reject and resubmit preserve the attempt chain and audit", func(t *testing.T) {
		creator, campaignRow := joinedWeek4Creator(t, harness, adminVN, opsVN, "vn", "resubmit", 500000)
		status, payload := submitWeek4(t, harness, creator, "vn", campaignRow.ID, "https://www.tiktok.com/@w4/video/reject", "#GoW4")
		requireStatus(t, status, http.StatusCreated, payload)
		first := decodeBody[content.MyContent](t, payload).Submissions[0]
		status, payload = reviewWeek4(t, harness, opsVN, "vn", first.ID, "REJECT", "")
		requireStatus(t, status, http.StatusBadRequest, payload)
		status, payload = reviewWeek4(t, harness, opsVN, "vn", first.ID, "REJECT", "Needs a clearer product shot")
		requireStatus(t, status, http.StatusCreated, payload)
		rejected := decodeBody[content.Submission](t, payload)
		if rejected.State != "REJECTED" || rejected.RejectReason == nil {
			t.Fatalf("unexpected rejected submission: %+v", rejected)
		}
		status, payload = submitWeek4(t, harness, creator, "vn", campaignRow.ID, "https://www.tiktok.com/@w4/video/fixed", "fixed #GoW4")
		requireStatus(t, status, http.StatusCreated, payload)
		resubmitted := decodeBody[content.MyContent](t, payload)
		if resubmitted.ParticipationState != "CONTENT_SUBMITTED" || len(resubmitted.Submissions) != 2 || resubmitted.Submissions[0].AttemptNo != 2 {
			t.Fatalf("unexpected resubmit chain: %+v", resubmitted)
		}
		firstID, _ := store.ParseUUID(first.ID)
		secondID, _ := store.ParseUUID(resubmitted.Submissions[0].ID)
		var supersedes string
		if err := harness.pool.QueryRow(context.Background(), "SELECT supersedes_id::text FROM content_submission WHERE id=$1", secondID).Scan(&supersedes); err != nil {
			t.Fatalf("read supersedes chain: %v", err)
		}
		if supersedes != store.UUIDString(firstID) {
			t.Fatalf("supersedes = %s, want %s", supersedes, first.ID)
		}
		var auditCount int
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM audit_event WHERE target_id=$1 AND action='CONTENT_REJECTED'", firstID).Scan(&auditCount); err != nil {
			t.Fatalf("count reject audits: %v", err)
		}
		if auditCount != 1 {
			t.Fatalf("reject audits = %d, want 1", auditCount)
		}
	})

	t.Run("double approve creates one earning, one ledger pair and one audit", func(t *testing.T) {
		creator, campaignRow := joinedWeek4Creator(t, harness, adminVN, opsVN, "vn", "approve-race", 500000)
		status, payload := submitWeek4(t, harness, creator, "vn", campaignRow.ID, "https://www.tiktok.com/@w4/video/approve", "#GoW4")
		requireStatus(t, status, http.StatusCreated, payload)
		submission := decodeBody[content.MyContent](t, payload).Submissions[0]
		endpoint := harness.server.URL + "/ops/vn/content/" + submission.ID + "/review"
		results := make([]rawHTTPResult, 2)
		start := make(chan struct{})
		var wait sync.WaitGroup
		for index := range results {
			wait.Add(1)
			go func(index int) {
				defer wait.Done()
				<-start
				results[index] = rawJSONRequest(http.MethodPost, endpoint, opsVN, map[string]any{"decision": "APPROVE"})
			}(index)
		}
		close(start)
		wait.Wait()
		statuses := []int{results[0].status, results[1].status}
		sort.Ints(statuses)
		if results[0].err != nil || results[1].err != nil || statuses[0] != http.StatusCreated || statuses[1] != http.StatusConflict {
			t.Fatalf("approve race results=%+v statuses=%v", results, statuses)
		}

		submissionID, _ := store.ParseUUID(submission.ID)
		var earningID string
		var earningCount, ledgerCount, auditCount int
		var gross, tax int64
		if err := harness.pool.QueryRow(context.Background(), "SELECT id::text, gross_minor, tax_minor FROM earning WHERE submission_id=$1", submissionID).Scan(&earningID, &gross, &tax); err != nil {
			t.Fatalf("read approved earning: %v", err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM earning WHERE submission_id=$1", submissionID).Scan(&earningCount); err != nil {
			t.Fatal(err)
		}
		parsedEarningID, _ := store.ParseUUID(earningID)
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM ledger_entry WHERE ref_type='earning' AND ref_id=$1", parsedEarningID).Scan(&ledgerCount); err != nil {
			t.Fatal(err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM audit_event WHERE target_id=$1 AND action='CONTENT_APPROVED'", submissionID).Scan(&auditCount); err != nil {
			t.Fatal(err)
		}
		if earningCount != 1 || ledgerCount != 2 || auditCount != 1 || gross != 500000 || tax != 50000 {
			t.Fatalf("approve atomic counts earning=%d ledger=%d audit=%d gross=%d tax=%d", earningCount, ledgerCount, auditCount, gross, tax)
		}

		status, payload = harness.request(t, http.MethodGet, "/me/country/vn/earnings", creator, nil)
		requireStatus(t, status, http.StatusOK, payload)
		dashboard := decodeBody[earnings.Dashboard](t, payload)
		if len(dashboard.Earnings) != 1 || dashboard.Summary.TotalGrossMinor != 500000 || dashboard.Summary.TotalTaxMinor != 50000 || dashboard.Summary.TotalNetMinor != 450000 || dashboard.Summary.PendingNetMinor != 450000 {
			t.Fatalf("unexpected VN earnings dashboard: %+v", dashboard)
		}
		if len(dashboard.Ledger.Entries) != 2 || dashboard.Ledger.BalanceMinor != 450000 || dashboard.Ledger.Entries[0].EntryType != "TAX" || dashboard.Ledger.Entries[0].BalanceAfterMinor != 450000 || dashboard.Ledger.Entries[1].EntryType != "EARNING_ACCRUE" || dashboard.Ledger.Entries[1].BalanceAfterMinor != 500000 {
			t.Fatalf("unexpected running ledger: %+v", dashboard.Ledger)
		}
	})

	t.Run("failed approval rolls back claim, money and audit atomically", func(t *testing.T) {
		creator, campaignRow := joinedWeek4Creator(t, harness, adminVN, opsVN, "vn", "rollback", 500000)
		status, payload := submitWeek4(t, harness, creator, "vn", campaignRow.ID, "https://www.tiktok.com/@w4/video/rollback", "#GoW4")
		requireStatus(t, status, http.StatusCreated, payload)
		submission := decodeBody[content.MyContent](t, payload).Submissions[0]
		if _, err := harness.pool.Exec(context.Background(), "UPDATE country_config SET tax_percent=101 WHERE country_id=(SELECT id FROM country WHERE code='VN')"); err != nil {
			t.Fatalf("set invalid tax fixture: %v", err)
		}
		defer func() {
			if _, err := harness.pool.Exec(context.Background(), "UPDATE country_config SET tax_percent=10 WHERE country_id=(SELECT id FROM country WHERE code='VN')"); err != nil {
				t.Errorf("restore VN tax fixture: %v", err)
			}
		}()
		status, payload = reviewWeek4(t, harness, opsVN, "vn", submission.ID, "APPROVE", "")
		requireStatus(t, status, http.StatusInternalServerError, payload)
		submissionID, _ := store.ParseUUID(submission.ID)
		var state string
		var earningsCount, ledgerCount, auditCount int
		if err := harness.pool.QueryRow(context.Background(), "SELECT state::text FROM content_submission WHERE id=$1", submissionID).Scan(&state); err != nil {
			t.Fatal(err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM earning WHERE submission_id=$1", submissionID).Scan(&earningsCount); err != nil {
			t.Fatal(err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM ledger_entry l JOIN earning e ON e.id=l.earning_id WHERE e.submission_id=$1", submissionID).Scan(&ledgerCount); err != nil {
			t.Fatal(err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM audit_event WHERE target_id=$1", submissionID).Scan(&auditCount); err != nil {
			t.Fatal(err)
		}
		if state != "SUBMITTED" || earningsCount != 0 || ledgerCount != 0 || auditCount != 0 {
			t.Fatalf("approval rollback state=%s earnings=%d ledger=%d audit=%d", state, earningsCount, ledgerCount, auditCount)
		}
	})

	t.Run("PH tax uses integer minor units and remains country isolated", func(t *testing.T) {
		creator, campaignRow := joinedWeek4Creator(t, harness, adminPH, opsPH, "ph", "ph-tax", 100001)
		status, payload := submitWeek4(t, harness, creator, "ph", campaignRow.ID, "https://www.tiktok.com/@w4/video/ph", "#GoW4")
		requireStatus(t, status, http.StatusCreated, payload)
		submission := decodeBody[content.MyContent](t, payload).Submissions[0]
		status, payload = reviewWeek4(t, harness, opsPH, "ph", submission.ID, "APPROVE", "")
		requireStatus(t, status, http.StatusCreated, payload)
		status, payload = harness.request(t, http.MethodGet, "/me/country/ph/earnings", creator, nil)
		requireStatus(t, status, http.StatusOK, payload)
		ph := decodeBody[earnings.Dashboard](t, payload)
		if ph.Summary.Currency == nil || *ph.Summary.Currency != "PHP" || ph.Summary.TotalGrossMinor != 100001 || ph.Summary.TotalTaxMinor != 8000 || ph.Summary.TotalNetMinor != 92001 || ph.Ledger.BalanceMinor != 92001 {
			t.Fatalf("unexpected PH integer tax dashboard: %+v", ph)
		}
		status, payload = harness.request(t, http.MethodGet, "/me/country/vn/earnings", creator, nil)
		requireStatus(t, status, http.StatusOK, payload)
		vn := decodeBody[earnings.Dashboard](t, payload)
		if len(vn.Earnings) != 0 || vn.Ledger.BalanceMinor != 0 {
			t.Fatalf("PH earnings leaked into VN: %+v", vn)
		}
	})
}
