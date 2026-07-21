"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS } from "../../../../mockup/data";
import { Frame, Note, Card, Badge, KV, Empty, ContextBanner, UsdRef } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { loadSession } from "../../../../lib/auth-client";
import { getEarnings, type EarningsDashboard, type Earning } from "../../../../lib/earnings-client";
import { t, formatMoney, usdReference } from "../../../../lib/i18n";

type Status = "loading" | "needLogin" | "ready";

// Chỉ giữ "kind" (màu) ở code; nhãn lấy từ i18n theo key earnings.st.* / ledger.*.
const STATUS_KIND: Record<Earning["status"], "warn" | "success" | "info" | "danger"> = {
  PENDING: "warn",
  AVAILABLE: "success",
  PAID: "info",
  REVERSED: "danger",
};

export default function EarningsScreen() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<EarningsDashboard | null>(null);
  const { lang, showUsd, market, setMarket } = usePrefs();
  const locale = MARKETS[market].locale;

  const load = useCallback(async () => {
    const res = await getEarnings(market);
    if ("unauthorized" in res) {
      setStatus("needLogin");
      return;
    }
    setData(res);
    setStatus("ready");
  }, [market]);

  useEffect(() => {
    if (!loadSession()) {
      setStatus("needLogin");
      return;
    }
    setStatus("loading");
    load();
  }, [load]);

  const cur = data?.summary.currency ?? MARKETS[market].currency;

  return (
    <Frame screen="V07 Earnings" title={t(lang, "earnings.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "earnings.noteQ")}</strong> {t(lang, "earnings.noteBody")}{" "}
        <em>{t(lang, "earnings.noteHard")}</em>
      </Note>

      {status === "needLogin" && (
        <Card title={t(lang, "common.needLoginTitle")}>
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              {t(lang, "nav.login")}
            </Link>
          </p>
        </Card>
      )}
      {status === "loading" && <p style={{ color: "#8b96a3" }}>{t(lang, "common.loading")}</p>}

      {status === "ready" && data && (
        <>
          <ContextBanner market={market} />

          {/* Tổng quan Gross–Thuế–Net + số dư sổ cái */}
          <Card title={t(lang, "earnings.overview")} sub={t(lang, "earnings.overviewSub")}>
            <KV k={t(lang, "earnings.totalGross")}>{formatMoney(data.summary.totalGrossMinor, cur, locale)}</KV>
            <KV k={t(lang, "earnings.totalTax")}>− {formatMoney(data.summary.totalTaxMinor, cur, locale)}</KV>
            <KV k={t(lang, "earnings.totalNet")} strong>
              {formatMoney(data.summary.totalNetMinor, cur, locale)}
            </KV>
            {showUsd && <UsdRef>{usdReference(data.summary.totalNetMinor, cur)}</UsdRef>}
            <div style={{ height: 10 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge kind="warn">{t(lang, "earnings.badgePending", { v: formatMoney(data.summary.pendingNetMinor, cur, locale) })}</Badge>
              <Badge kind="success">{t(lang, "earnings.badgeAvailable", { v: formatMoney(data.summary.availableNetMinor, cur, locale) })}</Badge>
              <Badge kind="info">{t(lang, "earnings.badgePaid", { v: formatMoney(data.summary.paidNetMinor, cur, locale) })}</Badge>
            </div>
            <p style={{ fontSize: 12, color: "#6b7684", marginTop: 10 }}>
              {t(lang, "earnings.ledgerBalance")} <b style={{ color: "#cfe0ff" }}>{formatMoney(data.ledger.balanceMinor, cur, locale)}</b>
            </p>
          </Card>

          {data.earnings.length === 0 ? (
            <Card>
              <Empty icon="💸">
                {t(lang, "earnings.empty")}{" "}
                <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
                  {t(lang, "earnings.emptyJoin")}
                </Link>{" "}
                {t(lang, "earnings.emptyTail")}
              </Empty>
            </Card>
          ) : (
            data.earnings.map((e) => (
              <Card key={e.id} title={e.campaignTitle ?? "—"} sub={t(lang, "earnings.recordedAt", { date: new Date(e.createdAt).toLocaleString(locale) })}>
                <div style={{ marginBottom: 10 }}>
                  <Badge kind={STATUS_KIND[e.status]}>{t(lang, `earnings.st.${e.status}`)}</Badge>
                </div>
                <KV k={t(lang, "earnings.gross")}>{formatMoney(e.grossMinor, e.currency, locale)}</KV>
                <KV k={t(lang, "earnings.tax")}>− {formatMoney(e.taxMinor, e.currency, locale)}</KV>
                <KV k={t(lang, "earnings.net")} strong>
                  {formatMoney(e.netMinor, e.currency, locale)}
                </KV>
                {showUsd && <UsdRef>{usdReference(e.netMinor, e.currency)}</UsdRef>}
              </Card>
            ))
          )}

          {/* Sổ cái append-only — bằng chứng bài toán khó #6 */}
          <Card title={t(lang, "earnings.ledgerTitle")} sub={t(lang, "earnings.ledgerSub")}>
            {data.ledger.entries.length === 0 ? (
              <p style={{ color: "#8b96a3", fontSize: 13 }}>{t(lang, "earnings.noEntries")}</p>
            ) : (
              data.ledger.entries.map((en) => {
                const neg = en.amountMinor < 0;
                return (
                  <div
                    key={en.id}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: "1px solid #1b2430", gap: 10, flexWrap: "wrap" }}
                  >
                    <div>
                      <span style={{ fontSize: 13, color: "#e6edf3" }}>{t(lang, `ledger.${en.entryType}`)}</span>
                      <span style={{ fontSize: 11, color: "#6b7684" }}> · {new Date(en.createdAt).toLocaleString(locale)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: neg ? "#ff9ba3" : "#6ee787" }}>
                        {neg ? "−" : "+"} {formatMoney(Math.abs(en.amountMinor), en.currency, locale)}
                      </span>
                      <span style={{ fontSize: 12, color: "#8b96a3", minWidth: 90, textAlign: "right" }}>
                        {t(lang, "earnings.balanceShort", { v: formatMoney(en.balanceAfterMinor, en.currency, locale) })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          <p style={{ fontSize: 13, color: "#8b96a3" }}>
            {t(lang, "earnings.toWallet")}{" "}
            <Link href="/mockup/creator/wallet" style={{ color: "#6aa6ff" }}>
              {t(lang, "earnings.walletLink")}
            </Link>{" "}
            {t(lang, "earnings.toWalletTail")}
          </p>
        </>
      )}
    </Frame>
  );
}
