import { ForbiddenException } from "@nestjs/common";
import { AuthContext } from "./auth.service";

// RBAC + cách ly theo nước (bài toán khó #1) tại tầng service: một staff chỉ thao tác được
// dữ liệu của ĐÚNG nước mình có vai. GLOBAL_ADMIN là vai duy nhất vượt biên giới.
export function isStaffForCountry(auth: AuthContext, countryId: string, allowed: string[]): boolean {
  return auth.roles.some(
    (r) =>
      (r.role === "GLOBAL_ADMIN" && r.countryId === null) ||
      (allowed.includes(r.role) && r.countryId === countryId),
  );
}

export function assertStaffForCountry(auth: AuthContext, countryId: string, allowed: string[]): void {
  if (!isStaffForCountry(auth, countryId, allowed)) {
    throw new ForbiddenException({
      code: "FORBIDDEN",
      message: "You do not have a staff role for this country.",
    });
  }
}
