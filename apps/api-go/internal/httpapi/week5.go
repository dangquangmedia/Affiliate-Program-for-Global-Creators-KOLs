package httpapi

import (
	"math"
	"net/http"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/payout"
	"github.com/go-chi/chi/v5"
)

func registerWeek5Routes(router chi.Router, services *Services) {
	if services == nil || services.Auth == nil {
		return
	}
	router.Group(func(protected chi.Router) {
		protected.Use(func(next http.Handler) http.Handler { return requireAuth(services.Auth, next) })

		if services.Reconciliation != nil {
			protected.Get("/ops/{market}/reconciliation", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Reconciliation.List(r.Context(), currentAuth(r), chi.URLParam(r, "market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			protected.Post("/ops/{market}/reconciliation", func(w http.ResponseWriter, r *http.Request) {
				var body struct {
					Period string `json:"period"`
				}
				if err := decodeJSON(r, &body); err != nil {
					WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body.")
					return
				}
				result, err := services.Reconciliation.Create(r.Context(), currentAuth(r), chi.URLParam(r, "market"), body.Period)
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusCreated, result)
			})
			protected.Get("/ops/{market}/reconciliation/{batchId}", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Reconciliation.Get(r.Context(), currentAuth(r), chi.URLParam(r, "market"), chi.URLParam(r, "batchId"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			protected.Post("/ops/{market}/reconciliation/{batchId}/lock", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Reconciliation.Lock(r.Context(), currentAuth(r), chi.URLParam(r, "market"), chi.URLParam(r, "batchId"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusCreated, result)
			})
		}

		if services.Payout != nil {
			protected.Get("/me/country/{market}/wallet", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Payout.Wallet(r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			protected.Post("/me/country/{market}/payouts/otp", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Payout.RequestOTP(r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusCreated, result)
			})
			protected.Post("/me/country/{market}/payouts", func(w http.ResponseWriter, r *http.Request) {
				var body map[string]any
				if err := decodeJSON(r, &body); err != nil {
					WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body.")
					return
				}
				amount, ok := body["amountMinor"].(float64)
				if !ok {
					amount = math.NaN()
				}
				str := func(key string) string { value, _ := body[key].(string); return value }
				result, err := services.Payout.Create(r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"), payout.CreateInput{
					AmountMinor: amount, OTPID: str("otpId"), Code: str("code"), IdempotencyKey: str("idempotencyKey"),
				})
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusCreated, result)
			})
			protected.Get("/ops/{market}/payouts", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Payout.Queue(r.Context(), currentAuth(r), chi.URLParam(r, "market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			protected.Get("/ops/{market}/payouts/holds", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Payout.Holds(r.Context(), currentAuth(r), chi.URLParam(r, "market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			outcome := func(resolve bool) http.HandlerFunc {
				return func(w http.ResponseWriter, r *http.Request) {
					var body struct {
						Result string `json:"result"`
					}
					if err := decodeJSON(r, &body); err != nil {
						WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body.")
						return
					}
					var result payout.Payout
					var err error
					if resolve {
						result, err = services.Payout.Resolve(r.Context(), currentAuth(r), chi.URLParam(r, "market"), chi.URLParam(r, "id"), body.Result)
					} else {
						result, err = services.Payout.Settle(r.Context(), currentAuth(r), chi.URLParam(r, "market"), chi.URLParam(r, "id"), body.Result)
					}
					if err != nil {
						WriteFailure(w, r, err)
						return
					}
					WriteJSON(w, http.StatusCreated, result)
				}
			}
			protected.Post("/ops/{market}/payouts/{id}/settle", outcome(false))
			protected.Post("/ops/{market}/payouts/{id}/resolve", outcome(true))
		}
	})
}
