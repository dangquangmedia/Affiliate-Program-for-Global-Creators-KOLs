"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, Empty, ContextBanner } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { loadSession } from "../../../../lib/auth-client";
import { myParticipations, leaveCampaign, type Participation } from "../../../../lib/campaign-client";
import { t, formatMoney } from "../../../../lib/i18n";

type Status = "loading" | "needLogin" | "ready";

// Chỉ giữ "kind" (màu); nhãn theo i18n key mycamp.st.*.
const STATE_KIND: Record<string, "success" | "info" | "warn" | "danger" | "neutral"> = {
  JOINED: "success",
  CONTENT_SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "warn",
  WAITLISTED: "info",
  EXPIRED: "danger",
};
const HOLDING = new Set(["JOINED", "CONTENT_SUBMITTED", "REJECTED"]);

export default function MyCampaignsScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<Participation[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const { lang } = usePrefs();
  const locale = MARKETS[market].locale;

  const load = useCallback(async () => {
    setRows(await myParticipations(market));
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

  async function leave(campaignId: string) {
    setBusy(campaignId);
    try {
      await leaveCampaign(market, campaignId);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Frame screen="My Campaigns" title={t(lang, "mycamp.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "mycamp.noteQ")}</strong> {t(lang, "mycamp.noteBody")}{" "}
        <em>{t(lang, "mycamp.noteHard")}</em>
      </Note>

      {status === "needLogin" && (
        <Card title={t(lang, "mycamp.needLoginTitle")}>
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              {t(lang, "nav.login")}
            </Link>
          </p>
        </Card>
      )}
      {status === "loading" && <p style={{ color: "#8b96a3" }}>{t(lang, "mycamp.loading")}</p>}

      {status === "ready" && (
        <>
          <ContextBanner market={market} />
          {rows.length === 0 ? (
            <Card>
              <Empty icon="📭">
                {t(lang, "mycamp.empty", { market })}{" "}
                <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
                  {t(lang, "mycamp.discover")}
                </Link>
              </Empty>
            </Card>
          ) : (
            rows.map((p) => {
              const kind = STATE_KIND[p.state] ?? "neutral";
              const label = STATE_KIND[p.state] ? t(lang, `mycamp.st.${p.state}`) : p.state;
              return (
                <Card key={p.campaignId} title={p.campaignTitle ?? p.campaignId}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge kind={kind}>{label}</Badge>
                    {p.snapshotRewardMinor != null && p.currency && (
                      <span style={{ color: "#a9b6c4", fontSize: 14 }}>
                        {t(lang, "mycamp.snapshot")} {formatMoney(p.snapshotRewardMinor, p.currency, locale)}
                      </span>
                    )}
                  </div>
                  {p.submitDeadlineAt && p.state === "JOINED" && (
                    <p style={{ color: "#f0c674", fontSize: 13, marginTop: 8 }}>
                      ⏳ {t(lang, "mycamp.deadline", { date: new Date(p.submitDeadlineAt).toLocaleString(locale) })}
                    </p>
                  )}
                  {p.state === "WAITLISTED" && (
                    <p style={{ color: "#7fb2ff", fontSize: 13, marginTop: 8 }}>
                      ⏳ {t(lang, "mycamp.waitlistLine", { pos: p.waitlistPosition != null ? t(lang, "campaign.position", { pos: p.waitlistPosition }) : "" })}
                    </p>
                  )}
                  {p.state === "EXPIRED" && (
                    <p style={{ color: "#e8a0a0", fontSize: 13, marginTop: 8 }}>{t(lang, "mycamp.expiredLine")}</p>
                  )}
                  <BtnRow>
                    {(p.state === "JOINED" || p.state === "REJECTED") && (
                      <Btn variant="primary">
                        <Link
                          href={`/mockup/creator/submit?id=${p.campaignId}&m=${market}`}
                          style={{ color: "#fff", textDecoration: "none" }}
                        >
                          {p.state === "REJECTED" ? t(lang, "mycamp.resubmit") : t(lang, "mycamp.submitContent")}
                        </Link>
                      </Btn>
                    )}
                    {p.state === "CONTENT_SUBMITTED" && (
                      <Btn variant="ghost">
                        <Link
                          href={`/mockup/creator/submit?id=${p.campaignId}&m=${market}`}
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {t(lang, "mycamp.viewSubmitted")}
                        </Link>
                      </Btn>
                    )}
                    {HOLDING.has(p.state) && (
                      <Btn variant="ghost" disabled={busy === p.campaignId} onClick={() => leave(p.campaignId)}>
                        {busy === p.campaignId ? "…" : t(lang, "mycamp.leaveSlot")}
                      </Btn>
                    )}
                    {p.state === "WAITLISTED" && (
                      <Btn variant="ghost" disabled={busy === p.campaignId} onClick={() => leave(p.campaignId)}>
                        {busy === p.campaignId ? "…" : t(lang, "mycamp.leaveWaitlist")}
                      </Btn>
                    )}
                  </BtnRow>
                </Card>
              );
            })
          )}
        </>
      )}
    </Frame>
  );
}
