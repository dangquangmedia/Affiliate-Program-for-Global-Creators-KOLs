"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Badge, Empty, ContextBanner } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { loadSession } from "../../../../lib/auth-client";
import { listCampaigns, type CampaignSummary } from "../../../../lib/campaign-client";
import { t, formatMoney } from "../../../../lib/i18n";

type Status = "loading" | "needLogin" | "ready";

export default function DiscoverScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<Status>("loading");
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const { lang } = usePrefs();
  const locale = MARKETS[market].locale;

  const load = useCallback(async () => {
    const res = await listCampaigns(market);
    if ("unauthorized" in res) {
      setStatus("needLogin");
      return;
    }
    setCampaigns(res);
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

  return (
    <Frame screen="V04 Discover" title={t(lang, "discover.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "discover.noteQ")}</strong> {t(lang, "discover.noteBody")}{" "}
        <em>{t(lang, "discover.noteHard")}</em>
      </Note>

      {status === "needLogin" && (
        <Card title={t(lang, "discover.needLoginTitle")}>
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              {t(lang, "nav.login")}
            </Link>
          </p>
        </Card>
      )}

      {status === "loading" && <p style={{ color: "#8b96a3" }}>{t(lang, "discover.loading")}</p>}

      {status === "ready" && (
        <>
          <ContextBanner market={market} />
          <p style={{ fontSize: 13, margin: "0 0 12px" }}>
            <Link href="/mockup/creator/my-campaigns" style={{ color: "#6aa6ff" }}>
              {t(lang, "discover.myCampaigns")}
            </Link>
          </p>
          {campaigns.length === 0 ? (
            <Card>
              <Empty icon="🔍">{t(lang, "discover.empty", { market })}</Empty>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
              {campaigns.map((c) => {
                const joinable = c.status === "ACTIVE" && !c.full;
                return (
                  <Card key={c.id} title={c.title} sub={`${c.brand} · ${c.platform}`}>
                    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                      {formatMoney(c.rewardMinor, c.currency, locale)}
                      <span style={{ fontSize: 12, color: "#8b96a3", fontWeight: 400 }}>{t(lang, "discover.perContent")}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {c.status === "PAUSED" && <Badge kind="warn">{t(lang, "discover.paused")}</Badge>}
                      {c.status === "ENDED" && <Badge kind="neutral">{t(lang, "discover.ended")}</Badge>}
                      {c.full && c.status === "ACTIVE" && <Badge kind="danger">{t(lang, "discover.full")}</Badge>}
                      {joinable && <Badge kind="success">{t(lang, "discover.open")}</Badge>}
                      <Badge kind="neutral">{t(lang, "discover.slotsLeft", { left: c.slotsLeft, total: c.slotsTotal })}</Badge>
                    </div>
                    <Link
                      href={`/mockup/creator/campaign?id=${c.id}&m=${market}`}
                      style={{ color: "#6aa6ff", fontSize: 14, textDecoration: "none" }}
                    >
                      {t(lang, "discover.viewDetail")}
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </Frame>
  );
}
