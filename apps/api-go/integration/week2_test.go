package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/audit"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/auth"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/campaign"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/config"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/content"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/country"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/database"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/earnings"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/httpapi"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/kyc"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/payout"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/reconciliation"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/store/sqlcgen"
	"github.com/jackc/pgx/v5/pgxpool"
)

type week2Harness struct {
	server *httptest.Server
	pool   *pgxpool.Pool
}

func newWeek2Harness(t *testing.T) *week2Harness {
	t.Helper()
	cfg, err := config.Load()
	if err != nil {
		t.Skipf("integration database not configured: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db, err := database.Open(ctx, cfg.DatabaseURL, 5)
	if err != nil {
		t.Fatalf("open integration database: %v", err)
	}
	queries := sqlcgen.New(db.Pool())
	txManager := store.NewTxManager(db.Pool())
	countries := country.NewService(queries)
	services := &httpapi.Services{
		Auth:           auth.NewService(queries),
		Countries:      countries,
		KYC:            kyc.NewService(queries, txManager, countries),
		Campaigns:      campaign.NewService(queries, txManager, countries),
		Content:        content.NewService(queries, txManager, countries),
		Earnings:       earnings.NewService(queries, countries),
		Audit:          audit.NewService(queries),
		Reconciliation: reconciliation.NewService(queries, txManager, countries),
		Payout:         payout.NewService(queries, txManager, countries),
	}
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	server := httptest.NewServer(httpapi.NewRouter(httpapi.RouterConfig{
		WebOrigin: "http://localhost:3000", Health: db, Logger: logger,
		HealthTimeout: 2 * time.Second, Services: services,
	}))
	t.Cleanup(func() {
		server.Close()
		db.Close()
	})
	return &week2Harness{server: server, pool: db.Pool()}
}

func (h *week2Harness) request(t *testing.T, method, path, token string, body any) (int, []byte) {
	t.Helper()
	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("encode request: %v", err)
		}
		reader = bytes.NewReader(encoded)
	}
	request, err := http.NewRequest(method, h.server.URL+path, reader)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("request %s %s: %v", method, path, err)
	}
	defer response.Body.Close()
	payload, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("read response: %v", err)
	}
	return response.StatusCode, payload
}

func decodeBody[T any](t *testing.T, payload []byte) T {
	t.Helper()
	var result T
	if err := json.Unmarshal(payload, &result); err != nil {
		t.Fatalf("decode response %s: %v", payload, err)
	}
	return result
}

func requireStatus(t *testing.T, got, want int, payload []byte) {
	t.Helper()
	if got != want {
		t.Fatalf("status = %d, want %d; body=%s", got, want, payload)
	}
}

func (h *week2Harness) login(t *testing.T, email string) string {
	t.Helper()
	status, payload := h.request(t, http.MethodPost, "/auth/mock-login", "", map[string]any{"email": email})
	requireStatus(t, status, http.StatusCreated, payload)
	result := decodeBody[struct {
		Token string `json:"token"`
	}](t, payload)
	if len(result.Token) != 64 {
		t.Fatalf("token length = %d, want 64", len(result.Token))
	}
	return result.Token
}

func TestWeek2AuthMarketAndCountryParity(t *testing.T) {
	harness := newWeek2Harness(t)

	status, payload := harness.request(t, http.MethodGet, "/markets/vn/context", "", nil)
	requireStatus(t, status, http.StatusOK, payload)
	market := decodeBody[country.MarketContext](t, payload)
	if market.Market != "VN" || market.Currency != "VND" || market.Locale != "vi-VN" || !market.Enabled {
		t.Fatalf("unexpected VN market context: %+v", market)
	}
	status, payload = harness.request(t, http.MethodGet, "/markets/xx/context", "", nil)
	requireStatus(t, status, http.StatusNotFound, payload)

	email := fmt.Sprintf("go-w2-auth-%d@example.com", time.Now().UnixNano())
	status, payload = harness.request(t, http.MethodPost, "/auth/mock-login", "", map[string]any{
		"email": "  " + stringsToUpper(email) + "  ", "displayName": "Go Week 2",
	})
	requireStatus(t, status, http.StatusCreated, payload)
	login := decodeBody[auth.LoginResult](t, payload)
	if login.User.Email != email || login.User.DisplayName != "Go Week 2" {
		t.Fatalf("unexpected login user: %+v", login.User)
	}
	status, payload = harness.request(t, http.MethodGet, "/auth/me", login.Token, nil)
	requireStatus(t, status, http.StatusOK, payload)
	me := decodeBody[auth.Context](t, payload)
	if me.User.Email != email || me.Roles == nil || len(me.Roles) != 0 {
		t.Fatalf("unexpected auth context: %+v", me)
	}

	status, payload = harness.request(t, http.MethodPost, "/me/country/vn", login.Token, nil)
	requireStatus(t, status, http.StatusCreated, payload)
	vn := decodeBody[country.Profile](t, payload)
	status, payload = harness.request(t, http.MethodPost, "/me/country/vn", login.Token, nil)
	requireStatus(t, status, http.StatusCreated, payload)
	vnAgain := decodeBody[country.Profile](t, payload)
	if vn.ProfileID != vnAgain.ProfileID {
		t.Fatalf("country select is not idempotent: %s != %s", vn.ProfileID, vnAgain.ProfileID)
	}
	status, payload = harness.request(t, http.MethodPost, "/me/country/ph", login.Token, nil)
	requireStatus(t, status, http.StatusCreated, payload)
	status, payload = harness.request(t, http.MethodGet, "/me/countries", login.Token, nil)
	requireStatus(t, status, http.StatusOK, payload)
	profiles := decodeBody[[]country.Profile](t, payload)
	if len(profiles) != 2 {
		t.Fatalf("profiles = %d, want 2", len(profiles))
	}
	status, payload = harness.request(t, http.MethodPost, "/me/country/vn", "", nil)
	requireStatus(t, status, http.StatusUnauthorized, payload)
	status, payload = harness.request(t, http.MethodPost, "/me/country/xx", login.Token, nil)
	requireStatus(t, status, http.StatusNotFound, payload)

	status, payload = harness.request(t, http.MethodPost, "/auth/logout", login.Token, nil)
	requireStatus(t, status, http.StatusCreated, payload)
	status, payload = harness.request(t, http.MethodGet, "/auth/me", login.Token, nil)
	requireStatus(t, status, http.StatusUnauthorized, payload)
	status, payload = harness.request(t, http.MethodPost, "/auth/mock-login", "", map[string]any{"email": "not-an-email"})
	requireStatus(t, status, http.StatusBadRequest, payload)
}

func TestWeek2KycRBACIsolationAndAuditAtomicity(t *testing.T) {
	harness := newWeek2Harness(t)
	creator := harness.login(t, fmt.Sprintf("go-w2-kyc-%d@example.com", time.Now().UnixNano()))
	opsVN := harness.login(t, "ops.vn@demo.affiliate.gl")
	opsPH := harness.login(t, "ops.ph@demo.affiliate.gl")

	status, payload := harness.request(t, http.MethodGet, "/me/country/vn/kyc", creator, nil)
	requireStatus(t, status, http.StatusOK, payload)
	draft := decodeBody[kyc.Case](t, payload)
	if draft.State != "DRAFT" || len(draft.Fields) != 4 {
		t.Fatalf("unexpected KYC draft: %+v", draft)
	}
	status, payload = harness.request(t, http.MethodPost, "/me/country/vn/kyc", creator, map[string]any{"values": map[string]any{
		"fullName": "Nguyen Minh Anh", "idNumber": "0790123", "bankAccount": "1900bad", "taxId": "8123",
	}})
	requireStatus(t, status, http.StatusCreated, payload)
	submitted := decodeBody[kyc.Case](t, payload)
	if submitted.State != "SUBMITTED" {
		t.Fatalf("KYC state = %s, want SUBMITTED", submitted.State)
	}

	status, payload = harness.request(t, http.MethodGet, "/ops/vn/kyc/queue", creator, nil)
	requireStatus(t, status, http.StatusForbidden, payload)
	status, payload = harness.request(t, http.MethodGet, "/ops/vn/kyc/queue", opsVN, nil)
	requireStatus(t, status, http.StatusOK, payload)
	queue := decodeBody[[]kyc.QueueItem](t, payload)
	found := false
	for _, item := range queue {
		if item.CaseID == draft.CaseID {
			found = true
		}
	}
	if !found {
		t.Fatalf("KYC case %s missing from VN queue", draft.CaseID)
	}
	status, payload = harness.request(t, http.MethodPost, "/ops/ph/kyc/"+draft.CaseID+"/review", opsPH, map[string]any{
		"decisions": []map[string]any{{"key": "fullName", "decision": "ACCEPT"}},
	})
	requireStatus(t, status, http.StatusNotFound, payload)

	status, payload = harness.request(t, http.MethodPost, "/ops/vn/kyc/"+draft.CaseID+"/review", opsVN, map[string]any{
		"decisions": []map[string]any{{"key": "bankAccount", "decision": "NEEDS_CHANGES"}},
	})
	requireStatus(t, status, http.StatusBadRequest, payload)
	var auditCount int
	parsedCaseID, _ := store.ParseUUID(draft.CaseID)
	if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM audit_event WHERE target_id=$1", parsedCaseID).Scan(&auditCount); err != nil {
		t.Fatalf("count failed KYC audits: %v", err)
	}
	if auditCount != 0 {
		t.Fatalf("failed review wrote %d audit events, want 0", auditCount)
	}

	decisions := []map[string]any{
		{"key": "fullName", "decision": "ACCEPT"},
		{"key": "idNumber", "decision": "ACCEPT"},
		{"key": "taxId", "decision": "ACCEPT"},
		{"key": "bankAccount", "decision": "NEEDS_CHANGES", "reason": "Tên chủ TK không khớp giấy tờ."},
	}
	status, payload = harness.request(t, http.MethodPost, "/ops/vn/kyc/"+draft.CaseID+"/review", opsVN, map[string]any{"decisions": decisions})
	requireStatus(t, status, http.StatusCreated, payload)
	rejected := decodeBody[kyc.Case](t, payload)
	if rejected.State != "REJECTED" {
		t.Fatalf("KYC state = %s, want REJECTED", rejected.State)
	}
	status, payload = harness.request(t, http.MethodPost, "/me/country/vn/kyc", creator, map[string]any{"values": map[string]any{
		"bankAccount": "1900good", "fullName": "HACK ATTEMPT",
	}})
	requireStatus(t, status, http.StatusCreated, payload)
	resubmitted := decodeBody[kyc.Case](t, payload)
	if resubmitted.State != "RESUBMITTED" || fieldValue(resubmitted.Fields, "fullName") == "HACK ATTEMPT" {
		t.Fatalf("accepted field was overwritten: %+v", resubmitted)
	}
	status, payload = harness.request(t, http.MethodPost, "/ops/vn/kyc/"+draft.CaseID+"/review", opsVN, map[string]any{
		"decisions": []map[string]any{{"key": "bankAccount", "decision": "ACCEPT"}},
	})
	requireStatus(t, status, http.StatusCreated, payload)
	approved := decodeBody[kyc.Case](t, payload)
	if approved.State != "APPROVED" {
		t.Fatalf("KYC state = %s, want APPROVED", approved.State)
	}
	if err := harness.pool.QueryRow(context.Background(), "SELECT count(*) FROM audit_event WHERE target_id=$1 AND action='KYC_REVIEWED'", parsedCaseID).Scan(&auditCount); err != nil {
		t.Fatalf("count KYC audits: %v", err)
	}
	if auditCount != 2 {
		t.Fatalf("KYC audits = %d, want 2 successful reviews", auditCount)
	}
}

func TestWeek2CampaignAndGlobalAuditParity(t *testing.T) {
	harness := newWeek2Harness(t)
	creator := harness.login(t, fmt.Sprintf("go-w2-campaign-%d@example.com", time.Now().UnixNano()))
	adminVN := harness.login(t, "admin.vn@demo.affiliate.gl")
	opsVN := harness.login(t, "ops.vn@demo.affiliate.gl")
	globalAdmin := harness.login(t, "global.admin@demo.affiliate.gl")

	status, payload := harness.request(t, http.MethodGet, "/markets/vn/campaigns", "", nil)
	requireStatus(t, status, http.StatusUnauthorized, payload)
	status, payload = harness.request(t, http.MethodGet, "/markets/vn/campaigns", creator, nil)
	requireStatus(t, status, http.StatusOK, payload)
	list := decodeBody[[]campaign.Summary](t, payload)
	if len(list) < 3 {
		t.Fatalf("VN campaign count = %d, want at least 3", len(list))
	}
	for _, item := range list {
		if item.Currency != "VND" {
			t.Fatalf("cross-market campaign leaked: %+v", item)
		}
	}

	const seedCampaign = "40000000-0000-4000-8000-000000000001"
	status, payload = harness.request(t, http.MethodGet, "/markets/vn/campaigns/"+seedCampaign, creator, nil)
	requireStatus(t, status, http.StatusOK, payload)
	detail := decodeBody[campaign.Detail](t, payload)
	if detail.Reward == nil || detail.Reward.BudgetCapMinor == nil || *detail.Reward.BudgetCapMinor != 25_000_000 {
		t.Fatalf("unexpected reward rule: %+v", detail.Reward)
	}
	status, payload = harness.request(t, http.MethodGet, "/markets/ph/campaigns/"+seedCampaign, creator, nil)
	requireStatus(t, status, http.StatusNotFound, payload)

	input := map[string]any{
		"title": fmt.Sprintf("Go W2 campaign %d", time.Now().UnixNano()), "brand": "TestBrand",
		"platform": "TikTok", "requiredHashtag": "#GoW2", "brief": "brief",
		"rewardMinor": 400000, "slotsTotal": 10,
	}
	status, payload = harness.request(t, http.MethodPost, "/markets/vn/campaigns", adminVN, input)
	requireStatus(t, status, http.StatusCreated, payload)
	created := decodeBody[campaign.Detail](t, payload)
	if created.Currency != "VND" || created.Reward == nil || created.Reward.BudgetCapMinor == nil || *created.Reward.BudgetCapMinor != 4_000_000 {
		t.Fatalf("unexpected created campaign: %+v", created)
	}
	status, payload = harness.request(t, http.MethodPost, "/markets/vn/campaigns", creator, input)
	requireStatus(t, status, http.StatusForbidden, payload)
	status, payload = harness.request(t, http.MethodPost, "/markets/vn/campaigns", opsVN, input)
	requireStatus(t, status, http.StatusForbidden, payload)
	status, payload = harness.request(t, http.MethodPost, "/markets/ph/campaigns", adminVN, input)
	requireStatus(t, status, http.StatusForbidden, payload)
	bad := cloneMap(input)
	bad["slotsTotal"] = 0
	status, payload = harness.request(t, http.MethodPost, "/markets/vn/campaigns", adminVN, bad)
	requireStatus(t, status, http.StatusBadRequest, payload)
	status, payload = harness.request(t, http.MethodGet, "/markets/vn/campaigns/"+created.ID+"/similar", creator, nil)
	requireStatus(t, status, http.StatusOK, payload)
	similar := decodeBody[[]campaign.Summary](t, payload)
	if len(similar) > 3 {
		t.Fatalf("similar campaign count = %d, want <= 3", len(similar))
	}

	status, payload = harness.request(t, http.MethodGet, "/admin/audit", adminVN, nil)
	requireStatus(t, status, http.StatusForbidden, payload)
	status, payload = harness.request(t, http.MethodGet, "/admin/audit?market=vn", globalAdmin, nil)
	requireStatus(t, status, http.StatusOK, payload)
	events := decodeBody[[]audit.Event](t, payload)
	found := false
	for _, event := range events {
		if event.TargetID != nil && *event.TargetID == created.ID {
			found = event.Action == "CAMPAIGN_CREATED"
		}
		if event.CountryCode == nil || *event.CountryCode != "VN" {
			t.Fatalf("audit market filter leaked event: %+v", event)
		}
	}
	if !found {
		t.Fatalf("campaign audit %s missing from global audit", created.ID)
	}
}

func fieldValue(fields []kyc.Field, key string) string {
	for _, field := range fields {
		if field.Key == key && field.Value != nil {
			return *field.Value
		}
	}
	return ""
}

func cloneMap(input map[string]any) map[string]any {
	result := make(map[string]any, len(input))
	for key, value := range input {
		result[key] = value
	}
	return result
}

func stringsToUpper(value string) string {
	buffer := []byte(value)
	for index, char := range buffer {
		if char >= 'a' && char <= 'z' {
			buffer[index] = char - ('a' - 'A')
		}
	}
	return string(buffer)
}
