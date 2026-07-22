package integration

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/auth"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/country"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/earnings"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/payout"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/reconciliation"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
)

func pendingWeek5Creator(t *testing.T, harness *week2Harness, adminToken, opsToken, market, label string, reward int64) (string, earnings.Earning) {
	t.Helper()
	creator, campaignRow := joinedWeek4Creator(t, harness, adminToken, opsToken, market, "w5-"+label, reward)
	status, payload := submitWeek4(t, harness, creator, market, campaignRow.ID, "https://www.tiktok.com/@w5/video/"+label, "#GoW4")
	requireStatus(t, status, http.StatusCreated, payload)
	content := decodeBody[struct {
		Submissions []struct {
			ID string `json:"id"`
		} `json:"submissions"`
	}](t, payload)
	status, payload = reviewWeek4(t, harness, opsToken, market, content.Submissions[0].ID, "APPROVE", "")
	requireStatus(t, status, http.StatusCreated, payload)
	status, payload = harness.request(t, http.MethodGet, "/me/country/"+market+"/earnings", creator, nil)
	requireStatus(t, status, http.StatusOK, payload)
	dashboard := decodeBody[earnings.Dashboard](t, payload)
	return creator, dashboard.Earnings[0]
}

func reconcileWeek5(t *testing.T, harness *week2Harness, financeToken, market string) reconciliation.Batch {
	t.Helper()
	status, payload := harness.request(t, http.MethodPost, "/ops/"+market+"/reconciliation", financeToken, map[string]any{})
	requireStatus(t, status, http.StatusCreated, payload)
	batch := decodeBody[reconciliation.Batch](t, payload)
	status, payload = harness.request(t, http.MethodPost, "/ops/"+market+"/reconciliation/"+batch.ID+"/lock", financeToken, nil)
	requireStatus(t, status, http.StatusCreated, payload)
	return decodeBody[reconciliation.Batch](t, payload)
}

func requestWeek5OTP(t *testing.T, harness *week2Harness, creator, market string) payout.OTP {
	t.Helper()
	status, payload := harness.request(t, http.MethodPost, "/me/country/"+market+"/payouts/otp", creator, nil)
	requireStatus(t, status, http.StatusCreated, payload)
	return decodeBody[payout.OTP](t, payload)
}

func createWeek5Payout(t *testing.T, harness *week2Harness, creator, market string, amount int64, otp payout.OTP, key string) payout.Payout {
	t.Helper()
	status, payload := harness.request(t, http.MethodPost, "/me/country/"+market+"/payouts", creator, map[string]any{
		"amountMinor": amount, "otpId": otp.OTPID, "code": otp.Code, "idempotencyKey": key,
	})
	requireStatus(t, status, http.StatusCreated, payload)
	return decodeBody[payout.Payout](t, payload)
}

func TestWeek5ReconciliationPayoutMoneySpine(t *testing.T) {
	harness := newWeek2Harness(t)
	adminVN, opsVN := harness.login(t, "admin.vn@demo.affiliate.gl"), harness.login(t, "ops.vn@demo.affiliate.gl")
	adminPH, opsPH := harness.login(t, "admin.ph@demo.affiliate.gl"), harness.login(t, "ops.ph@demo.affiliate.gl")
	financeVN, financePH := harness.login(t, "finance.vn@demo.affiliate.gl"), harness.login(t, "finance.ph@demo.affiliate.gl")

	t.Run("reconciliation create race, isolation and one-time lock", func(t *testing.T) {
		creator, earning := pendingWeek5Creator(t, harness, adminVN, opsVN, "vn", "recon-race", 1000000)
		endpoint := harness.server.URL + "/ops/vn/reconciliation"
		results := make([]rawHTTPResult, 2)
		start := make(chan struct{})
		var wait sync.WaitGroup
		for index := range results {
			wait.Add(1)
			go func(index int) {
				defer wait.Done()
				<-start
				results[index] = rawJSONRequest(http.MethodPost, endpoint, financeVN, map[string]any{"period": "2026-07"})
			}(index)
		}
		close(start)
		wait.Wait()
		statuses := []int{results[0].status, results[1].status}
		sort.Ints(statuses)
		if results[0].err != nil || results[1].err != nil || statuses[0] != http.StatusCreated || statuses[1] != http.StatusConflict {
			t.Fatalf("reconciliation race results=%+v statuses=%v", results, statuses)
		}
		winner := results[0]
		if winner.status != http.StatusCreated {
			winner = results[1]
		}
		batch := decodeBody[reconciliation.Batch](t, winner.payload)
		if batch.Status != "OPEN" || batch.Period != "2026-07" || len(batch.Lines) == 0 {
			t.Fatalf("unexpected reconciliation batch: %+v", batch)
		}
		status, payload := harness.request(t, http.MethodGet, "/ops/ph/reconciliation/"+batch.ID, financePH, nil)
		requireStatus(t, status, http.StatusNotFound, payload)
		status, payload = harness.request(t, http.MethodGet, "/ops/vn/reconciliation", creator, nil)
		requireStatus(t, status, http.StatusForbidden, payload)
		status, payload = harness.request(t, http.MethodPost, "/ops/vn/reconciliation/"+batch.ID+"/lock", financeVN, nil)
		requireStatus(t, status, http.StatusCreated, payload)
		locked := decodeBody[reconciliation.Batch](t, payload)
		if locked.Status != "LOCKED" || locked.LockedAt == nil {
			t.Fatalf("batch not locked: %+v", locked)
		}
		status, payload = harness.request(t, http.MethodPost, "/ops/vn/reconciliation/"+batch.ID+"/lock", financeVN, nil)
		requireStatus(t, status, http.StatusConflict, payload)
		earningID, _ := store.ParseUUID(earning.ID)
		var state string
		var lineCount int
		if err := harness.pool.QueryRow(context.Background(), "SELECT status::text FROM earning WHERE id=$1", earningID).Scan(&state); err != nil {
			t.Fatal(err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM reconciliation_line WHERE earning_id=$1", earningID).Scan(&lineCount); err != nil {
			t.Fatal(err)
		}
		if state != "AVAILABLE" || lineCount != 1 {
			t.Fatalf("earning state=%s lines=%d", state, lineCount)
		}
	})

	t.Run("VN success and PH failed payout complete the money spine", func(t *testing.T) {
		cases := []struct {
			market              string
			admin, ops, finance string
			reward, amount      int64
			result, wantState   string
		}{
			{"vn", adminVN, opsVN, financeVN, 1000000, 300000, "SUCCESS", "PAID"},
			{"ph", adminPH, opsPH, financePH, 100000, 60000, "FAIL", "FAILED_RELEASED"},
		}
		for _, test := range cases {
			t.Run(test.market, func(t *testing.T) {
				creator, _ := pendingWeek5Creator(t, harness, test.admin, test.ops, test.market, "spine", test.reward)
				reconcileWeek5(t, harness, test.finance, test.market)
				status, payload := harness.request(t, http.MethodGet, "/me/country/"+test.market+"/wallet", creator, nil)
				requireStatus(t, status, http.StatusOK, payload)
				before := decodeBody[payout.Wallet](t, payload)
				otp := requestWeek5OTP(t, harness, creator, test.market)
				created := createWeek5Payout(t, harness, creator, test.market, test.amount, otp, fmt.Sprintf("w5-spine-%s-%d", test.market, time.Now().UnixNano()))
				if created.State != "PROCESSING" {
					t.Fatalf("created payout: %+v", created)
				}
				status, payload = harness.request(t, http.MethodPost, "/ops/"+test.market+"/payouts/"+created.ID+"/settle", test.finance, map[string]any{"result": test.result})
				requireStatus(t, status, http.StatusCreated, payload)
				settled := decodeBody[payout.Payout](t, payload)
				if settled.State != test.wantState {
					t.Fatalf("settled payout: %+v", settled)
				}
				status, payload = harness.request(t, http.MethodGet, "/me/country/"+test.market+"/wallet", creator, nil)
				requireStatus(t, status, http.StatusOK, payload)
				after := decodeBody[payout.Wallet](t, payload)
				want := before.WithdrawableMinor - test.amount
				if test.result == "FAIL" {
					want = before.WithdrawableMinor
				}
				if after.WithdrawableMinor != want {
					t.Fatalf("wallet after %s=%d want=%d", test.result, after.WithdrawableMinor, want)
				}
			})
		}
	})

	t.Run("idempotency, OTP atomicity and concurrent payouts prevent overspend", func(t *testing.T) {
		creator, _ := pendingWeek5Creator(t, harness, adminVN, opsVN, "vn", "overspend", 1000000)
		reconcileWeek5(t, harness, financeVN, "vn")
		otp1, otp2 := requestWeek5OTP(t, harness, creator, "vn"), requestWeek5OTP(t, harness, creator, "vn")
		endpoint := harness.server.URL + "/me/country/vn/payouts"
		results := make([]rawHTTPResult, 2)
		keys := []string{fmt.Sprintf("w5-race-0-%d", time.Now().UnixNano()), fmt.Sprintf("w5-race-1-%d", time.Now().UnixNano())}
		start := make(chan struct{})
		var wait sync.WaitGroup
		for index, otp := range []payout.OTP{otp1, otp2} {
			wait.Add(1)
			go func(index int, otp payout.OTP) {
				defer wait.Done()
				<-start
				results[index] = rawJSONRequest(http.MethodPost, endpoint, creator, map[string]any{
					"amountMinor": 600000, "otpId": otp.OTPID, "code": otp.Code, "idempotencyKey": keys[index],
				})
			}(index, otp)
		}
		close(start)
		wait.Wait()
		statuses := []int{results[0].status, results[1].status}
		sort.Ints(statuses)
		if statuses[0] != http.StatusCreated || statuses[1] != http.StatusConflict {
			t.Fatalf("overspend statuses=%v results=%+v", statuses, results)
		}
		winner := results[0]
		if winner.status != http.StatusCreated {
			winner = results[1]
		}
		created := decodeBody[payout.Payout](t, winner.payload)
		winnerIndex := 0
		if results[1].status == http.StatusCreated {
			winnerIndex = 1
		}
		loserIndex := 1 - winnerIndex
		winnerOTPID, _ := store.ParseUUID([]payout.OTP{otp1, otp2}[winnerIndex].OTPID)
		loserOTPID, _ := store.ParseUUID([]payout.OTP{otp1, otp2}[loserIndex].OTPID)
		var winnerConsumed, loserConsumed bool
		if err := harness.pool.QueryRow(context.Background(), "SELECT consumed_at IS NOT NULL FROM otp_code WHERE id=$1", winnerOTPID).Scan(&winnerConsumed); err != nil {
			t.Fatal(err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT consumed_at IS NOT NULL FROM otp_code WHERE id=$1", loserOTPID).Scan(&loserConsumed); err != nil {
			t.Fatal(err)
		}
		if !winnerConsumed || loserConsumed {
			t.Fatalf("OTP transaction winnerConsumed=%t loserConsumed=%t", winnerConsumed, loserConsumed)
		}
		status, payload := harness.request(t, http.MethodPost, "/me/country/vn/payouts", creator, map[string]any{
			"amountMinor": 1, "otpId": "bad", "code": "bad", "idempotencyKey": keys[winnerIndex],
		})
		requireStatus(t, status, http.StatusCreated, payload)
		if duplicate := decodeBody[payout.Payout](t, payload); duplicate.ID != created.ID {
			t.Fatalf("idempotent payout=%+v want id=%s", duplicate, created.ID)
		}
		payoutID, _ := store.ParseUUID(created.ID)
		var payoutCount, reserveCount int
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM payout_request WHERE profile_id=(SELECT profile_id FROM payout_request WHERE id=$1)", payoutID).Scan(&payoutCount); err != nil {
			t.Fatal(err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM ledger_entry WHERE ref_type='payout' AND ref_id=$1 AND entry_type='PAYOUT_RESERVE'", payoutID).Scan(&reserveCount); err != nil {
			t.Fatal(err)
		}
		if payoutCount != 1 || reserveCount != 1 {
			t.Fatalf("payouts=%d reserves=%d", payoutCount, reserveCount)
		}
		status, payload = harness.request(t, http.MethodGet, "/me/country/vn/wallet", creator, nil)
		requireStatus(t, status, http.StatusOK, payload)
		if wallet := decodeBody[payout.Wallet](t, payload); wallet.WithdrawableMinor != 300000 {
			t.Fatalf("overspend wallet=%+v", wallet)
		}
	})

	t.Run("unknown hold, manual resolution and double settlement release exactly once", func(t *testing.T) {
		creator, _ := pendingWeek5Creator(t, harness, adminVN, opsVN, "vn", "unknown", 1000000)
		reconcileWeek5(t, harness, financeVN, "vn")
		unknown := createWeek5Payout(t, harness, creator, "vn", 300000, requestWeek5OTP(t, harness, creator, "vn"), fmt.Sprintf("w5-unknown-%d", time.Now().UnixNano()))
		status, payload := harness.request(t, http.MethodPost, "/ops/vn/payouts/"+unknown.ID+"/settle", financeVN, map[string]any{"result": "UNKNOWN"})
		requireStatus(t, status, http.StatusCreated, payload)
		if got := decodeBody[payout.Payout](t, payload); got.State != "UNKNOWN_HOLD" {
			t.Fatalf("unknown result=%+v", got)
		}
		unknownID, _ := store.ParseUUID(unknown.ID)
		var releases int
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM ledger_entry WHERE ref_id=$1 AND entry_type='PAYOUT_RELEASE'", unknownID).Scan(&releases); err != nil {
			t.Fatal(err)
		}
		if releases != 0 {
			t.Fatalf("UNKNOWN released %d entries", releases)
		}
		status, payload = harness.request(t, http.MethodPost, "/ops/vn/payouts/"+unknown.ID+"/resolve", financeVN, map[string]any{"result": "FAIL"})
		requireStatus(t, status, http.StatusCreated, payload)

		double := createWeek5Payout(t, harness, creator, "vn", 300000, requestWeek5OTP(t, harness, creator, "vn"), fmt.Sprintf("w5-double-%d", time.Now().UnixNano()))
		endpoint := harness.server.URL + "/ops/vn/payouts/" + double.ID + "/settle"
		results := make([]rawHTTPResult, 2)
		start := make(chan struct{})
		var wait sync.WaitGroup
		for i := range results {
			wait.Add(1)
			go func(i int) {
				defer wait.Done()
				<-start
				results[i] = rawJSONRequest(http.MethodPost, endpoint, financeVN, map[string]any{"result": "FAIL"})
			}(i)
		}
		close(start)
		wait.Wait()
		statuses := []int{results[0].status, results[1].status}
		sort.Ints(statuses)
		if statuses[0] != http.StatusCreated || statuses[1] != http.StatusConflict {
			t.Fatalf("double settle statuses=%v", statuses)
		}
		doubleID, _ := store.ParseUUID(double.ID)
		var attempts int
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM payout_attempt WHERE payout_request_id=$1", doubleID).Scan(&attempts); err != nil {
			t.Fatal(err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM ledger_entry WHERE ref_id=$1 AND entry_type='PAYOUT_RELEASE'", doubleID).Scan(&releases); err != nil {
			t.Fatal(err)
		}
		if attempts != 1 || releases != 1 {
			t.Fatalf("attempts=%d releases=%d", attempts, releases)
		}
	})

	t.Run("failed staff audit rolls back settlement changes", func(t *testing.T) {
		creator, _ := pendingWeek5Creator(t, harness, adminPH, opsPH, "ph", "rollback", 100000)
		reconcileWeek5(t, harness, financePH, "ph")
		created := createWeek5Payout(t, harness, creator, "ph", 50000, requestWeek5OTP(t, harness, creator, "ph"), fmt.Sprintf("w5-rollback-%d", time.Now().UnixNano()))
		queries := sqlcgen.New(harness.pool)
		countries := country.NewService(queries)
		service := payout.NewService(queries, store.NewTxManager(harness.pool), countries)
		ph, err := countries.RequireAvailable(context.Background(), "ph")
		if err != nil {
			t.Fatal(err)
		}
		countryID := store.UUIDString(ph.ID)
		_, err = service.Settle(context.Background(), auth.Context{
			User:  auth.User{ID: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"},
			Roles: []auth.Role{{CountryID: &countryID, Role: "LOCAL_FINANCE"}},
		}, "ph", created.ID, "FAIL")
		if err == nil {
			t.Fatal("settlement unexpectedly committed without a valid audit actor")
		}
		payoutID, _ := store.ParseUUID(created.ID)
		var state string
		var attempts, releases, audits int
		if err := harness.pool.QueryRow(context.Background(), "SELECT state::text FROM payout_request WHERE id=$1", payoutID).Scan(&state); err != nil {
			t.Fatal(err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM payout_attempt WHERE payout_request_id=$1", payoutID).Scan(&attempts); err != nil {
			t.Fatal(err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM ledger_entry WHERE ref_id=$1 AND entry_type='PAYOUT_RELEASE'", payoutID).Scan(&releases); err != nil {
			t.Fatal(err)
		}
		if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM audit_event WHERE target_id=$1", payoutID).Scan(&audits); err != nil {
			t.Fatal(err)
		}
		if state != "PROCESSING" || attempts != 0 || releases != 0 || audits != 0 {
			t.Fatalf("rollback state=%s attempts=%d releases=%d audits=%d", state, attempts, releases, audits)
		}
	})
}
