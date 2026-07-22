package auth

import (
	"net/http"

	"github.com/dangquangmedia/affiliate-global/apps/api-go/internal/apierr"
)

func IsStaffForCountry(auth Context, countryID string, allowed ...string) bool {
	allowedSet := make(map[string]struct{}, len(allowed))
	for _, role := range allowed {
		allowedSet[role] = struct{}{}
	}
	for _, assignment := range auth.Roles {
		if assignment.Role == "GLOBAL_ADMIN" && assignment.CountryID == nil {
			return true
		}
		if assignment.CountryID != nil && *assignment.CountryID == countryID {
			if _, ok := allowedSet[assignment.Role]; ok {
				return true
			}
		}
	}
	return false
}

func AssertStaffForCountry(auth Context, countryID string, allowed ...string) error {
	if IsStaffForCountry(auth, countryID, allowed...) {
		return nil
	}
	return apierr.New(http.StatusForbidden, "FORBIDDEN", "You do not have a staff role for this country.")
}

func IsGlobalAdmin(auth Context) bool {
	for _, assignment := range auth.Roles {
		if assignment.Role == "GLOBAL_ADMIN" && assignment.CountryID == nil {
			return true
		}
	}
	return false
}

func AssertGlobalAdmin(auth Context) error {
	if IsGlobalAdmin(auth) {
		return nil
	}
	return apierr.New(http.StatusForbidden, "FORBIDDEN", "Only a global admin can access this resource.")
}
