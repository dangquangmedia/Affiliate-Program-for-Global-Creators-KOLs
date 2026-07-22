package httpapi

import (
	"math"
	"net/http"
	"regexp"
	"strings"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/audit"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/auth"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/campaign"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/content"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/country"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/earnings"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/kyc"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/payout"
	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/reconciliation"
	"github.com/go-chi/chi/v5"
)

var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

type Services struct {
	Auth           *auth.Service
	Countries      *country.Service
	KYC            *kyc.Service
	Campaigns      *campaign.Service
	Content        *content.Service
	Earnings       *earnings.Service
	Audit          *audit.Service
	Reconciliation *reconciliation.Service
	Payout         *payout.Service
}

func registerWeek2Routes(router chi.Router, services *Services) {
	if services == nil || services.Auth == nil || services.Countries == nil {
		return
	}

	router.Get("/markets/{market}/context", func(w http.ResponseWriter, r *http.Request) {
		result, err := services.Countries.GetMarketContext(r.Context(), chi.URLParam(r, "market"))
		if err != nil {
			WriteFailure(w, r, err)
			return
		}
		WriteJSON(w, http.StatusOK, result)
	})

	router.Post("/auth/mock-login", func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := decodeJSON(r, &body); err != nil {
			WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "A valid email is required.")
			return
		}
		email, _ := body["email"].(string)
		email = strings.TrimSpace(email)
		if !emailPattern.MatchString(email) {
			WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "A valid email is required.")
			return
		}
		displayName, _ := body["displayName"].(string)
		result, err := services.Auth.MockLogin(r.Context(), email, displayName)
		if err != nil {
			WriteFailure(w, r, err)
			return
		}
		WriteJSON(w, http.StatusCreated, result)
	})

	router.Group(func(protected chi.Router) {
		protected.Use(func(next http.Handler) http.Handler { return requireAuth(services.Auth, next) })

		protected.Get("/auth/me", func(w http.ResponseWriter, r *http.Request) {
			WriteJSON(w, http.StatusOK, currentAuth(r))
		})
		protected.Post("/auth/logout", func(w http.ResponseWriter, r *http.Request) {
			if err := services.Auth.Logout(r.Context(), extractBearer(r)); err != nil {
				WriteFailure(w, r, err)
				return
			}
			WriteJSON(w, http.StatusCreated, map[string]bool{"ok": true})
		})

		protected.Get("/me/countries", func(w http.ResponseWriter, r *http.Request) {
			result, err := services.Countries.List(r.Context(), currentAuth(r).User.ID)
			if err != nil {
				WriteFailure(w, r, err)
				return
			}
			WriteJSON(w, http.StatusOK, result)
		})
		protected.Post("/me/country/{market}", func(w http.ResponseWriter, r *http.Request) {
			result, err := services.Countries.Select(r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"))
			if err != nil {
				WriteFailure(w, r, err)
				return
			}
			WriteJSON(w, http.StatusCreated, result)
		})

		if services.KYC != nil {
			protected.Get("/me/country/{market}/kyc", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.KYC.GetMyCase(r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			protected.Post("/me/country/{market}/kyc", func(w http.ResponseWriter, r *http.Request) {
				var body struct {
					Values map[string]any `json:"values"`
				}
				if err := decodeJSON(r, &body); err != nil {
					WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body.")
					return
				}
				values := make(map[string]string)
				for key, raw := range body.Values {
					if value, ok := raw.(string); ok {
						values[key] = value
					}
				}
				result, err := services.KYC.Submit(r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"), values)
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusCreated, result)
			})
			protected.Get("/ops/{market}/kyc/queue", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.KYC.Queue(r.Context(), currentAuth(r), chi.URLParam(r, "market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			protected.Post("/ops/{market}/kyc/{caseId}/review", func(w http.ResponseWriter, r *http.Request) {
				var body struct {
					Decisions []map[string]any `json:"decisions"`
				}
				if err := decodeJSON(r, &body); err != nil {
					WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body.")
					return
				}
				decisions := make([]kyc.Decision, 0, len(body.Decisions))
				for _, raw := range body.Decisions {
					key, keyOK := raw["key"].(string)
					decision, decisionOK := raw["decision"].(string)
					if !keyOK || !decisionOK || (decision != "ACCEPT" && decision != "NEEDS_CHANGES") {
						continue
					}
					reason, _ := raw["reason"].(string)
					decisions = append(decisions, kyc.Decision{Key: key, Decision: decision, Reason: reason})
				}
				result, err := services.KYC.Review(
					r.Context(), currentAuth(r), chi.URLParam(r, "market"), chi.URLParam(r, "caseId"), decisions,
				)
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusCreated, result)
			})
		}

		if services.Campaigns != nil {
			protected.Get("/markets/{market}/campaigns", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Campaigns.List(r.Context(), chi.URLParam(r, "market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			protected.Get("/markets/{market}/campaigns/{id}", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Campaigns.Get(r.Context(), chi.URLParam(r, "market"), chi.URLParam(r, "id"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			protected.Get("/markets/{market}/campaigns/{id}/similar", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Campaigns.Similar(r.Context(), chi.URLParam(r, "market"), chi.URLParam(r, "id"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			protected.Post("/markets/{market}/campaigns", func(w http.ResponseWriter, r *http.Request) {
				var body map[string]any
				if err := decodeJSON(r, &body); err != nil {
					WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body.")
					return
				}
				stringValue := func(key string) string { value, _ := body[key].(string); return value }
				numberValue := func(key string) float64 {
					value, ok := body[key].(float64)
					if !ok {
						return math.NaN()
					}
					return value
				}
				result, err := services.Campaigns.Create(r.Context(), currentAuth(r), chi.URLParam(r, "market"), campaign.CreateInput{
					Title: stringValue("title"), Brand: stringValue("brand"), Platform: stringValue("platform"),
					RequiredHashtag: stringValue("requiredHashtag"), Brief: stringValue("brief"),
					RewardMinor: numberValue("rewardMinor"), SlotsTotal: numberValue("slotsTotal"),
				})
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusCreated, result)
			})
			protected.Post("/markets/{market}/campaigns/{id}/join", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Campaigns.Join(
					r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"), chi.URLParam(r, "id"),
				)
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusCreated, result)
			})
			protected.Post("/markets/{market}/campaigns/{id}/leave", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Campaigns.Leave(
					r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"), chi.URLParam(r, "id"),
				)
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusCreated, result)
			})
			protected.Get("/me/country/{market}/participations", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Campaigns.ListMine(r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
		}

		if services.Content != nil {
			protected.Get("/me/country/{market}/campaigns/{campaignId}/content", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Content.MyContent(
					r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"), chi.URLParam(r, "campaignId"),
				)
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			protected.Post("/me/country/{market}/campaigns/{campaignId}/content", func(w http.ResponseWriter, r *http.Request) {
				var body struct {
					URL     string `json:"url"`
					Caption string `json:"caption"`
				}
				if err := decodeJSON(r, &body); err != nil {
					WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body.")
					return
				}
				result, err := services.Content.Submit(
					r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"), chi.URLParam(r, "campaignId"),
					body.URL, body.Caption,
				)
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusCreated, result)
			})
			protected.Get("/ops/{market}/content/queue", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Content.Queue(r.Context(), currentAuth(r), chi.URLParam(r, "market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
			protected.Post("/ops/{market}/content/{submissionId}/review", func(w http.ResponseWriter, r *http.Request) {
				var body struct {
					Decision string `json:"decision"`
					Reason   string `json:"reason"`
				}
				if err := decodeJSON(r, &body); err != nil {
					WriteError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body.")
					return
				}
				result, err := services.Content.Review(
					r.Context(), currentAuth(r), chi.URLParam(r, "market"), chi.URLParam(r, "submissionId"),
					body.Decision, body.Reason,
				)
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusCreated, result)
			})
		}

		if services.Earnings != nil {
			protected.Get("/me/country/{market}/earnings", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Earnings.Dashboard(r.Context(), currentAuth(r).User.ID, chi.URLParam(r, "market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
		}

		if services.Audit != nil {
			protected.Get("/admin/audit", func(w http.ResponseWriter, r *http.Request) {
				result, err := services.Audit.List(r.Context(), currentAuth(r), r.URL.Query().Get("market"))
				if err != nil {
					WriteFailure(w, r, err)
					return
				}
				WriteJSON(w, http.StatusOK, result)
			})
		}

	})
}
