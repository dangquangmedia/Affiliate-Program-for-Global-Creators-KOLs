import { mockLogin, saveSession } from "../../lib/auth-client";

// SP-1 T1: cổng vào /portal — chọn vai ở landing phải mockLogin THẬT (account seed theo
// vai+nước) trước khi vào dashboard, không phải link tĩnh. Một trách nhiệm: role -> phiên.

export type PortalRole = "creator" | "ops" | "admin" | "finance" | "global";
export type PortalMarket = "VN" | "PH";

// Map vai + nước -> account seed (apps/api/prisma/seed.sql). Creator = user demo tạo mới theo nước.
export function roleEmail(role: PortalRole, market: PortalMarket): string {
  const m = market.toLowerCase();
  if (role === "global") return "global.admin@demo.affiliate.gl";
  if (role === "creator") return `creator.${m}@demo.affiliate.gl`;
  return `${role}.${m}@demo.affiliate.gl`; // ops/admin/finance
}

const LABEL: Record<PortalRole, string> = {
  creator: "Creator", ops: "Local Ops", admin: "Local Admin",
  finance: "Local Finance", global: "Global Admin",
};

export async function enterAs(role: PortalRole, market: PortalMarket): Promise<void> {
  const email = roleEmail(role, market);
  saveSession(await mockLogin(email, `${LABEL[role]} ${role === "global" ? "" : market}`.trim()));
  // nhớ nước đang chọn để dashboard đọc lại
  window.localStorage.setItem("ag_pref_market", market);
  window.location.assign(`/portal/${role}`);
}
