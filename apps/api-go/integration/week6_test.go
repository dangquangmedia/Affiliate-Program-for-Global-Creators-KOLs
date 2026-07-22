package integration

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/kyc"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
)

func TestWeek6ConcurrentKYCReviewClaimsOnce(t *testing.T) {
	harness := newWeek2Harness(t)
	opsVN := harness.login(t, "ops.vn@demo.affiliate.gl")
	creator := harness.login(t, fmt.Sprintf("go-w6-kyc-race-%d@example.com", time.Now().UnixNano()))

	status, payload := harness.request(t, http.MethodPost, "/me/country/vn/kyc", creator, map[string]any{
		"values": map[string]any{
			"fullName": "Week Six", "idNumber": "W6-ID", "bankAccount": "W6-BANK", "taxId": "W6-TAX",
		},
	})
	requireStatus(t, status, http.StatusCreated, payload)
	kycCase := decodeBody[kyc.Case](t, payload)
	decisions := make([]map[string]any, 0, len(kycCase.Fields))
	for _, field := range kycCase.Fields {
		decisions = append(decisions, map[string]any{"key": field.Key, "decision": "ACCEPT"})
	}

	endpoint := harness.server.URL + "/ops/vn/kyc/" + kycCase.CaseID + "/review"
	results := make([]rawHTTPResult, 2)
	start := make(chan struct{})
	var wait sync.WaitGroup
	for index := range results {
		wait.Add(1)
		go func(index int) {
			defer wait.Done()
			<-start
			results[index] = rawJSONRequest(http.MethodPost, endpoint, opsVN, map[string]any{"decisions": decisions})
		}(index)
	}
	close(start)
	wait.Wait()

	statuses := []int{results[0].status, results[1].status}
	sort.Ints(statuses)
	if results[0].err != nil || results[1].err != nil || statuses[0] != http.StatusCreated || statuses[1] != http.StatusConflict {
		t.Fatalf("concurrent KYC review results=%+v statuses=%v", results, statuses)
	}

	caseID, _ := store.ParseUUID(kycCase.CaseID)
	var state string
	var auditCount int
	if err := harness.pool.QueryRow(context.Background(), "SELECT state::text FROM kyc_case WHERE id=$1", caseID).Scan(&state); err != nil {
		t.Fatal(err)
	}
	if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM audit_event WHERE target_id=$1 AND action='KYC_REVIEWED'", caseID).Scan(&auditCount); err != nil {
		t.Fatal(err)
	}
	if state != "APPROVED" || auditCount != 1 {
		t.Fatalf("KYC review state=%s audit=%d, want APPROVED and one audit", state, auditCount)
	}
}
