"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, KV, ContextBanner } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { loadSession } from "../../../../lib/auth-client";
import {
  getCampaign,
  joinCampaign,
  leaveCampaign,
  myParticipations,
  suggestSimilar,
  type CampaignDetail,
  type CampaignSummary,
  type Participation,
} from "../../../../lib/campaign-client";
import { t, formatMoney } from "../../../../lib/i18n";

// Mã lỗi join có kiểu (QĐ-5); thông báo lấy từ i18n campaign.err.*.
const KNOWN_JOIN_ERR = new Set(["SLOT_FULL", "KYC_REQUIRED", "CAMPAIGN_NOT_JOINABLE", "JOIN_BLOCKED_STRIKE"]);
const HOLDING = new Set(["JOINED", "CONTENT_SUBMITTED", "APPROVED", "REJECTED"]);

function isMarket(v: string | null): v is Market {
  return v === "VN" || v === "PH";
}

function CampaignDetailInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const queryMarket = isMarket(params.get("m")) ? (params.get("m") as Market) : null;

  const { lang, market, setMarket } = usePrefs();
  // Mở link campaign của nước nào → chọn nước đó (kéo theo ngôn ngữ + tiền tệ).
  useEffect(() => {
    if (queryMarket && queryMarket !== market) setMarket(queryMarket);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryMarket]);

  const [status, setStatus] = useState<"loading" | "needLogin" | "missing" | "notFound" | "ready">("loading");
  const [c, setC] = useState<CampaignDetail | null>(null);
  const [joined, setJoined] = useState<Participation | null>(null);
  const [waitlisted, setWaitlisted] = useState<Participation | null>(null);
  const [suggestions, setSuggestions] = useState<CampaignSummary[]>([]);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null); // lưu MÃ lỗi, render qua t()
  const locale = MARKETS[market].locale;

  const load = useCallback(async () => {
    if (!id) {
      setStatus("missing");
      return;
    }
    const d = await getCampaign(market, id);
    if (!d) {
      setStatus("notFound");
      return;
    }
    setC(d);
    const mine = await myParticipations(market);
    const wl = mine.find((p) => p.campaignId === id && p.state === "WAITLISTED") ?? null;
    setJoined(mine.find((p) => p.campaignId === id && HOLDING.has(p.state)) ?? null);
    setWaitlisted(wl);
    // Gợi ý campaign khác khi hết suất hoặc đang chờ (QĐ-5).
    setSuggestions(d.full || wl ? await suggestSimilar(market, id) : []);
    setStatus("ready");
  }, [id, market]);

  async function doJoin() {
    if (!id) return;
    setJoinBusy(true);
    setJoinError(null);
    try {
      const res = await joinCampaign(market, id);
      if (res.ok) {
        if (res.participation.state === "WAITLISTED") setWaitlisted(res.participation);
        else setJoined(res.participation);
        await load();
      } else {
        setJoinError(res.code);
      }
    } finally {
      setJoinBusy(false);
    }
  }

  async function doLeave() {
    if (!id) return;
    setJoinBusy(true);
    try {
      await leaveCampaign(market, id);
      setJoined(null);
      setWaitlisted(null);
      await load();
    } finally {
      setJoinBusy(false);
    }
  }

  useEffect(() => {
    if (!loadSession()) {
      setStatus("needLogin");
      return;
    }
    setStatus("loading");
    load();
  }, [load]);

  return (
    <Frame screen="V05 Campaign detail + Join" title={c?.title ?? t(lang, "campaign.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "campaign.noteQ")}</strong> {t(lang, "campaign.noteBody")}{" "}
        <em>{t(lang, "campaign.noteHard")}</em>
      </Note>

      {status === "needLogin" && (
        <Card title={t(lang, "campaign.needLoginTitle")}>
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              {t(lang, "nav.login")}
            </Link>
          </p>
        </Card>
      )}
      {status === "loading" && <p style={{ color: "#8b96a3" }}>{t(lang, "campaign.loading")}</p>}
      {status === "missing" && (
        <Card title={t(lang, "campaign.missingTitle")}>
          <p style={{ fontSize: 13 }}>
            {t(lang, "campaign.missingBody")}{" "}
            <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
              {t(lang, "campaign.discoverScreen")}
            </Link>{" "}
            {t(lang, "campaign.missingTail")}
          </p>
        </Card>
      )}
      {status === "notFound" && (
        <Card>
          <Badge kind="danger">{t(lang, "campaign.notFoundBadge", { market })}</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>
            {t(lang, "campaign.notFoundBody", { market })}{" "}
            <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
              {t(lang, "campaign.discoverLink")}
            </Link>
            .
          </p>
        </Card>
      )}

      {status === "ready" && c && (
        <>
          <ContextBanner market={market} />
          <Card title={`${c.brand} · ${c.platform}`} sub={c.brief}>
            <KV k={t(lang, "campaign.reward")} strong>
              {formatMoney(c.rewardMinor, c.currency, locale)}
            </KV>
            <div style={{ height: 8 }} />
            <KV k={t(lang, "campaign.hashtag")}>{c.requiredHashtag}</KV>
            <KV k={t(lang, "campaign.slots")}>
              {t(lang, "campaign.slotsLeft", { left: c.slotsLeft, total: c.slotsTotal })}
            </KV>
            {c.reward && (
              <KV k={t(lang, "campaign.rewardRule")}>
                {c.reward.triggerType} · {c.reward.pricingType} · {t(lang, "campaign.cap")}{" "}
                {c.reward.budgetCapMinor != null ? formatMoney(c.reward.budgetCapMinor, c.currency, locale) : "—"}
              </KV>
            )}
            <KV k={t(lang, "campaign.statusLabel")}>
              {c.status === "ACTIVE" && !c.full ? (
                <Badge kind="success">{t(lang, "campaign.open")}</Badge>
              ) : c.full ? (
                <Badge kind="danger">{t(lang, "campaign.full")}</Badge>
              ) : (
                <Badge kind="warn">{t(lang, "campaign.paused")}</Badge>
              )}
            </KV>
          </Card>

          {joined ? (
            <Card title={t(lang, "campaign.joinedTitle")} sub={t(lang, "campaign.joinedSub")}>
              <Badge kind="success">✓ {t(lang, "campaign.holdingBadge", { state: joined.state })}</Badge>
              <p style={{ color: "#a9b6c4", fontSize: 14, margin: "10px 0" }}>
                {t(lang, "campaign.snapshotOnJoin")} {joined.snapshotRewardMinor != null && joined.currency
                  ? formatMoney(joined.snapshotRewardMinor, joined.currency, locale)
                  : "—"}
                {joined.submitDeadlineAt && (
                  <> · {t(lang, "campaign.deadlineInline", { date: new Date(joined.submitDeadlineAt).toLocaleString(locale) })}</>
                )}
                . {t(lang, "campaign.idempotentNote")}
              </p>
              <BtnRow>
                <Btn variant="primary">
                  <Link
                    href={`/mockup/creator/submit?id=${id}&m=${market}`}
                    style={{ color: "#fff", textDecoration: "none" }}
                  >
                    {t(lang, "campaign.submitContent")}
                  </Link>
                </Btn>
                <Btn variant="ghost" disabled={joinBusy} onClick={doLeave}>
                  {joinBusy ? "…" : t(lang, "campaign.leaveSlot")}
                </Btn>
              </BtnRow>
            </Card>
          ) : waitlisted ? (
            <Card title={t(lang, "campaign.waitlistTitle")} sub={t(lang, "campaign.waitlistSub")}>
              <Badge kind="info">
                ⏳ {t(lang, "campaign.waitlistQueue")}{waitlisted.waitlistPosition != null ? t(lang, "campaign.position", { pos: waitlisted.waitlistPosition }) : ""}
              </Badge>
              <p style={{ color: "#a9b6c4", fontSize: 14, margin: "10px 0" }}>
                {t(lang, "campaign.waitlistBody1")}{" "}
                <Link href="/mockup/creator/my-campaigns" style={{ color: "#6aa6ff" }}>
                  {t(lang, "campaign.myCampaigns")}
                </Link>
                {t(lang, "campaign.waitlistBody2")}
              </p>
              <BtnRow>
                <Btn variant="ghost" disabled={joinBusy} onClick={doLeave}>
                  {joinBusy ? "…" : t(lang, "campaign.leaveWaitlist")}
                </Btn>
              </BtnRow>
            </Card>
          ) : (
            <Card title={t(lang, "campaign.joinTitle")} sub={t(lang, "campaign.joinSub")}>
              {joinError && (
                <div style={{ marginBottom: 10 }}>
                  <Badge kind="danger">{t(lang, KNOWN_JOIN_ERR.has(joinError) ? `campaign.err.${joinError}` : "campaign.err.UNKNOWN")}</Badge>
                  {joinError === "KYC_REQUIRED" && (
                    <p style={{ fontSize: 13, marginTop: 6 }}>
                      →{" "}
                      <Link href="/mockup/creator/kyc" style={{ color: "#6aa6ff" }}>
                        {t(lang, "campaign.completeKyc")}
                      </Link>
                    </p>
                  )}
                </div>
              )}
              <p style={{ color: "#a9b6c4", fontSize: 14, marginBottom: 10 }}>{t(lang, "campaign.joinBody")}</p>
              <BtnRow>
                <Btn variant="primary" disabled={joinBusy || c.status !== "ACTIVE"} onClick={doJoin}>
                  {joinBusy ? t(lang, "campaign.processing") : c.full ? t(lang, "campaign.joinWaitlist") : t(lang, "campaign.join")}
                </Btn>
                <Btn variant="ghost">
                  <Link href="/mockup/creator/kyc" style={{ color: "inherit", textDecoration: "none" }}>
                    {t(lang, "campaign.checkKyc")}
                  </Link>
                </Btn>
              </BtnRow>
            </Card>
          )}

          {suggestions.length > 0 && (
            <Card title={t(lang, "campaign.suggestTitle")} sub={t(lang, "campaign.suggestSub")}>
              <div style={{ display: "grid", gap: 10 }}>
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.title}</div>
                      <div style={{ fontSize: 13, color: "#8b96a3" }}>
                        {s.brand} · {s.platform} · {formatMoney(s.rewardMinor, s.currency, locale)} · {s.slotsLeft}/
                        {s.slotsTotal} suất
                      </div>
                    </div>
                    <Link
                      href={`/mockup/creator/campaign?id=${s.id}&m=${market}`}
                      style={{ color: "#6aa6ff", fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      {t(lang, "campaign.view")}
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </Frame>
  );
}

export default function CampaignScreen() {
  return (
    <Suspense fallback={<p style={{ padding: 32, color: "#8b96a3" }}>Đang tải…</p>}>
      <CampaignDetailInner />
    </Suspense>
  );
}
