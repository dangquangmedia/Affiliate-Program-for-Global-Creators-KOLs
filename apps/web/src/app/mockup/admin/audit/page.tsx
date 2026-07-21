"use client";

import { useCallback, useEffect, useState } from "react";
import type { Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, Empty, mk } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { mockLogin, saveSession } from "../../../../lib/auth-client";
import { t } from "../../../../lib/i18n";
import { listAudit, type AuditEvent } from "../../../../lib/audit-client";

type Status = "loading" | "needAdmin" | "ready";

// Màu badge theo nhóm hành động (chỉ để đọc nhanh — không mang ngữ nghĩa nghiệp vụ).
const ACTION_KIND: Record<string, "success" | "danger" | "info" | "warn" | "neutral"> = {
  CONTENT_APPROVED: "success",
  CONTENT_REJECTED: "danger",
  KYC_REVIEWED: "info",
  RECON_BATCH_CREATED: "neutral",
  RECON_BATCH_LOCKED: "info",
  PAYOUT_SETTLED: "success",
  PAYOUT_RESOLVED: "warn",
  CAMPAIGN_CREATED: "neutral",
};

export default function AuditScreen() {
  const [allCountries, setAllCountries] = useState(true); // mặc định xem toàn cục
  const [status, setStatus] = useState<Status>("loading");
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const { lang, market, setMarket } = usePrefs();

  const load = useCallback(async () => {
    const res = await listAudit(allCountries ? undefined : market);
    if ("forbidden" in res) {
      setStatus("needAdmin");
      setEvents([]);
      return;
    }
    setEvents(res);
    setStatus("ready");
  }, [allCountries, market]);

  useEffect(() => {
    setStatus("loading");
    load();
  }, [load]);

  async function loginAsGlobalAdmin() {
    saveSession(await mockLogin("global.admin@demo.affiliate.gl", "Global Admin"));
    await load();
  }

  // Chọn VN/PH ở topbar = lọc theo nước đó (thoát chế độ toàn cục).
  function pickMarket(m: Market) {
    setMarket(m);
    setAllCountries(false);
  }

  return (
    <Frame screen="V13 Audit log" title={t(lang, "audit.title")} market={market} setMarket={pickMarket}>
      <Note>
        <strong>{t(lang, "audit.noteQ")}</strong> {t(lang, "audit.noteBody")} <em>{t(lang, "audit.noteHard")}</em>
      </Note>

      {status === "loading" && <p style={{ color: "#8b96a3" }}>{t(lang, "audit.loading")}</p>}

      {status === "needAdmin" && (
        <Card title={t(lang, "audit.needAdminTitle")} sub={t(lang, "audit.needAdminSub")}>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginBottom: 10 }}>{t(lang, "audit.needAdminBody")}</p>
          <BtnRow>
            <Btn variant="primary" onClick={loginAsGlobalAdmin}>
              {t(lang, "audit.loginBtn")}
            </Btn>
          </BtnRow>
        </Card>
      )}

      {status === "ready" && (
        <Card>
          <BtnRow>
            <Btn variant={allCountries ? "primary" : "default"} onClick={() => setAllCountries(true)}>
              {t(lang, "audit.filterAll")}
            </Btn>
          </BtnRow>
          {events.length === 0 ? (
            <div style={{ marginTop: 12 }}>
              <Empty icon="🧾">{t(lang, "audit.empty")}</Empty>
            </div>
          ) : (
            <table className={mk.table} style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>{t(lang, "audit.colTime")}</th>
                  <th>{t(lang, "audit.colActor")}</th>
                  <th>{t(lang, "audit.colAction")}</th>
                  <th>{t(lang, "audit.colCountry")}</th>
                  <th>{t(lang, "audit.colTarget")}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} data-action={e.action}>
                    <td style={{ whiteSpace: "nowrap", color: "#8b96a3" }}>{new Date(e.createdAt).toLocaleString()}</td>
                    <td>{e.actorName}</td>
                    <td><Badge kind={ACTION_KIND[e.action] ?? "neutral"}>{e.action}</Badge></td>
                    <td>{e.countryCode ?? t(lang, "audit.global")}</td>
                    <td style={{ color: "#8b96a3", fontSize: 12 }}>{e.targetType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </Frame>
  );
}
