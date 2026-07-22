package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/apierr"
	appmiddleware "github.com/dangquangmedia/affiliate-global/apps/api-go/internal/httpapi/middleware"
)

type ErrorEnvelope struct {
	Error ErrorBody `json:"error"`
}

type ErrorBody struct {
	Code          string `json:"code"`
	Message       string `json:"message"`
	Status        int    `json:"status"`
	CorrelationID string `json:"correlationId"`
	Retryable     bool   `json:"retryable"`
}

func WriteError(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	WriteJSON(w, status, ErrorEnvelope{Error: ErrorBody{
		Code:          code,
		Message:       message,
		Status:        status,
		CorrelationID: appmiddleware.RequestIDFromContext(r.Context()),
		Retryable:     status == http.StatusServiceUnavailable,
	}})
}

func WriteFailure(w http.ResponseWriter, r *http.Request, err error) {
	if applicationError, ok := apierr.As(err); ok {
		WriteError(w, r, applicationError.Status, applicationError.Code, applicationError.Message)
		return
	}
	WriteError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error.")
}

func WriteJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
