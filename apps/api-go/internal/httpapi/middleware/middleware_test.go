package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Gate Tuần 7: "Log không lộ token, OTP hoặc dữ liệu KYC". Access log cố ý chỉ ghi
// method/path/status/latency; test này khoá hành vi đó lại để một lần "thêm cho dễ debug" sau này
// không âm thầm đẩy Bearer token, mã OTP hay PII của KYC vào Cloud Logging.
func TestAccessLogDoesNotLeakSecrets(t *testing.T) {
	const (
		token   = "sess_9f2c4b7d1e6a8c3f5b0d2e4a6c8f1b3d"
		otpCode = "483920"
		idNo    = "079203004567"
	)

	var buffer bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buffer, nil))

	body := strings.NewReader(`{"otpId":"otp-1","code":"` + otpCode + `","values":{"idNumber":"` + idNo + `","bankAccount":"1903 6666 8888","taxId":"8765432109"}}`)
	request := httptest.NewRequest(http.MethodPost, "/me/country/vn/payouts", body)
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("X-Request-ID", "8f1d2a3b-4c5d-6e7f-8a9b-0c1d2e3f4a5b")

	handler := RequestID(AccessLog(logger)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusCreated)
	})))
	handler.ServeHTTP(httptest.NewRecorder(), request)

	logged := buffer.String()
	for _, secret := range []string{token, otpCode, idNo, "Bearer", "bankAccount", "taxId"} {
		if strings.Contains(logged, secret) {
			t.Fatalf("access log lộ %q: %s", secret, logged)
		}
	}
	for _, expected := range []string{`"method":"POST"`, `"path":"/me/country/vn/payouts"`, `"status":201`} {
		if !strings.Contains(logged, expected) {
			t.Fatalf("access log thiếu %s: %s", expected, logged)
		}
	}
}

// Panic phải trả error envelope chuẩn và KHÔNG kèm nội dung request vào response.
func TestRecoveryReturnsErrorEnvelopeWithoutRequestData(t *testing.T) {
	var buffer bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buffer, nil))

	request := httptest.NewRequest(http.MethodGet, "/ops/vn/payouts", nil)
	request.Header.Set("Authorization", "Bearer sess_secret_value")
	recorder := httptest.NewRecorder()

	handler := RequestID(Recovery(logger)(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	})))
	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", recorder.Code)
	}
	if strings.Contains(recorder.Body.String(), "sess_secret_value") {
		t.Fatalf("response lộ token: %s", recorder.Body.String())
	}
	if strings.Contains(buffer.String(), "sess_secret_value") {
		t.Fatalf("log lộ token: %s", buffer.String())
	}
	if !strings.Contains(recorder.Body.String(), `"code":"INTERNAL_ERROR"`) {
		t.Fatalf("thiếu error envelope: %s", recorder.Body.String())
	}
}
