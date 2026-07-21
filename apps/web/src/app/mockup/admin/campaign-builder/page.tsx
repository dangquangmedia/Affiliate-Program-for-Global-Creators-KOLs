"use client";

import { useState } from "react";
import Link from "next/link";
import { MARKETS, PRICING_OPTIONS, TRIGGER_OPTIONS } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, KV, mk } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { mockLogin, saveSession } from "../../../../lib/auth-client";
import { createCampaign, type CampaignDetail } from "../../../../lib/campaign-client";
import { t, formatMoney } from "../../../../lib/i18n";

export default function CampaignBuilderScreen() {
  const { lang, market, setMarket } = usePrefs();
  const currency = MARKETS[market].currency;
  const locale = MARKETS[market].locale;

  const [title, setTitle] = useState("Review son mùa hè");
  const [brand, setBrand] = useState("GlowUp Cosmetics");
  const [platform, setPlatform] = useState("TikTok");
  const [hashtag, setHashtag] = useState("#GlowUpHe2026");
  const [price, setPrice] = useState(currency === "VND" ? "500000" : "120000");
  const [slots, setSlots] = useState("30");

  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CampaignDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const priceMinor = Number(price) || 0;
  const slotsN = Number(slots) || 0;
  const budgetCap = priceMinor * slotsN; // ③ trần = suất × đơn giá (tự suy ra)

  async function loginAsAdmin() {
    saveSession(await mockLogin(`admin.${market.toLowerCase()}@demo.affiliate.gl`, `Admin ${market}`));
    setErr(null);
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    setCreated(null);
    try {
      const res = await createCampaign(market, {
        title,
        brand,
        platform,
        requiredHashtag: hashtag,
        brief: "",
        rewardMinor: priceMinor,
        slotsTotal: slotsN,
      });
      if (res.ok) {
        setCreated(res.campaign);
      } else if (res.status === 403) {
        setErr("forbidden");
      } else if (res.status === 401) {
        setErr("unauthorized");
      } else {
        setErr(t(lang, "builder.invalid"));
      }
    } finally {
      setBusy(false);
    }
  }

  const field = (label: string, value: string, set: (v: string) => void, type = "text") => (
    <div className={mk.field}>
      <label className={mk.fieldLabel}>{label}</label>
      <input className={mk.input} value={value} type={type} onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <Frame screen="V11 Campaign builder" title={t(lang, "builder.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "builder.noteQ")}</strong> {t(lang, "builder.noteBody")} <em>{t(lang, "builder.noteHard")}</em>
      </Note>

      <div style={{ marginBottom: 12 }}>
        <Btn variant="ghost" onClick={loginAsAdmin}>
          {t(lang, "builder.loginBtn", { market })}
        </Btn>
      </div>

      {created ? (
        <Card title={t(lang, "builder.createdTitle")}>
          <Badge kind="success">ACTIVE</Badge>
          <p style={{ fontSize: 14, color: "#a9b6c4", margin: "10px 0" }}>
            <strong>{created.title}</strong> ({created.currency}) — {t(lang, "builder.createdBudget")}{" "}
            {created.reward?.budgetCapMinor != null
              ? formatMoney(created.reward.budgetCapMinor, created.currency, locale)
              : "—"}
            {t(lang, "builder.createdTail", { market })}
          </p>
          <BtnRow>
            <Btn variant="primary">
              <Link href="/mockup/creator/discover" style={{ color: "#fff", textDecoration: "none" }}>
                {t(lang, "builder.viewInDiscover")}
              </Link>
            </Btn>
            <Btn variant="ghost" onClick={() => setCreated(null)}>
              {t(lang, "builder.createAnother")}
            </Btn>
          </BtnRow>
        </Card>
      ) : (
        <>
          {err === "forbidden" && (
            <div style={{ marginBottom: 12 }}>
              <Badge kind="danger">{t(lang, "builder.needAdminBadge", { market })}</Badge>
              <p style={{ color: "#ff9ba3", fontSize: 13, marginTop: 6 }}>{t(lang, "builder.needAdminBody", { market })}</p>
            </div>
          )}
          {err === "unauthorized" && (
            <div style={{ marginBottom: 12 }}>
              <Badge kind="danger">{t(lang, "builder.unauthorized")}</Badge>
            </div>
          )}
          {err && err !== "forbidden" && err !== "unauthorized" && (
            <div style={{ marginBottom: 12 }}>
              <Badge kind="danger">{err}</Badge>
            </div>
          )}

          <Card title={t(lang, "builder.infoTitle")}>
            {field(t(lang, "builder.name"), title, setTitle)}
            {field(t(lang, "builder.brand"), brand, setBrand)}
            {field(t(lang, "builder.platform"), platform, setPlatform)}
            {field(t(lang, "builder.hashtag"), hashtag, setHashtag)}
          </Card>

          <Card title={t(lang, "builder.ruleTitle")} sub={t(lang, "builder.ruleSub")}>
            <div style={{ fontSize: 12, color: "#7d8896", marginBottom: 6 }}>{t(lang, "builder.axis1")}</div>
            <div className={mk.optRow}>
              {TRIGGER_OPTIONS.map((o) => (
                <div key={o.key} className={`${mk.opt} ${o.enabled ? mk.optOn : mk.optDisabled}`}>
                  <span className={mk.optLabel}>
                    {o.label} {o.enabled ? <Badge kind="success">{t(lang, "builder.optOn")}</Badge> : <Badge kind="neutral">{t(lang, "builder.optLocked")}</Badge>}
                  </span>
                  <span className={mk.optNote}>{o.note}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#7d8896", margin: "12px 0 6px" }}>{t(lang, "builder.axis2")}</div>
            <div className={mk.optRow}>
              {PRICING_OPTIONS.map((o) => (
                <div key={o.key} className={`${mk.opt} ${o.enabled ? mk.optOn : mk.optDisabled}`}>
                  <span className={mk.optLabel}>
                    {o.label} {o.enabled ? <Badge kind="success">{t(lang, "builder.optOn")}</Badge> : <Badge kind="neutral">{t(lang, "builder.optLocked")}</Badge>}
                  </span>
                  <span className={mk.optNote}>{o.note}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title={t(lang, "builder.budgetTitle")} sub={t(lang, "builder.budgetSub")}>
            {field(t(lang, "builder.priceLabel", { currency }), price, setPrice, "number")}
            {field(t(lang, "builder.slots"), slots, setSlots, "number")}
            <KV k={t(lang, "builder.budgetCap")} strong>
              {formatMoney(budgetCap, currency, locale)}
            </KV>
            <div style={{ fontSize: 12, color: "#6b7684", marginTop: 6 }}>
              {t(lang, "builder.budgetFormula", { price: formatMoney(priceMinor, currency, locale), slots: slotsN })}
            </div>
          </Card>

          <BtnRow>
            <Btn variant="primary" disabled={busy} onClick={submit}>
              {busy ? t(lang, "builder.creating") : t(lang, "builder.create")}
            </Btn>
          </BtnRow>
        </>
      )}
    </Frame>
  );
}
