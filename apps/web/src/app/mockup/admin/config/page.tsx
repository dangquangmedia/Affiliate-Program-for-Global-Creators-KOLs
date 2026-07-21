"use client";

import { useState } from "react";
import { COUNTRY_CONFIG, MARKETS, formatMoney } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge, KV, Field } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { t } from "../../../../lib/i18n";

type View = "overview" | "edit";

export default function AdminConfigScreen() {
  const [view, setView] = useState<View>("overview");
  const { lang, market, setMarket } = usePrefs();
  const cfg = COUNTRY_CONFIG[market];
  const info = MARKETS[market];

  return (
    <Frame screen="V09 Admin config" title={t(lang, "cfg.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "cfg.noteQ")}</strong> {t(lang, "cfg.noteBody")} <em>{t(lang, "cfg.noteHard")}</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "overview", label: t(lang, "cfg.overview") },
          { key: "edit", label: t(lang, "cfg.edit") },
        ]}
      />

      <div style={{ fontSize: 12, color: "#8b96a3", marginBottom: 14 }}>
        {t(lang, "cfg.viewing")} <b style={{ color: "#cfe0ff" }}>{info.flag} {info.name}</b>{" "}
        {t(lang, "cfg.viewingTail")}
      </div>

      {view === "overview" ? (
        <Card title={t(lang, "cfg.cardTitle", { name: info.name })} sub={t(lang, "cfg.cardSub", { locale: info.locale, currency: info.currency })}>
          <KV k={t(lang, "cfg.tax")}>{cfg.taxPercent}%</KV>
          <KV k={t(lang, "cfg.minPayout")}>{formatMoney(cfg.minPayoutMinor, info.currency)}</KV>
          <div style={{ marginTop: 12, marginBottom: 6, fontSize: 13, color: "#9aa6b3" }}>{t(lang, "cfg.features")}</div>
          {cfg.features.map((f) => (
            <KV key={f.key} k={f.label}>
              {f.on ? <Badge kind="success">{t(lang, "cfg.on")}</Badge> : <Badge kind="neutral">{t(lang, "cfg.off")}</Badge>}
            </KV>
          ))}
          <BtnRow>
            <Btn variant="primary" onClick={() => setView("edit")}>{t(lang, "cfg.edit")}</Btn>
          </BtnRow>
        </Card>
      ) : (
        <Card title={t(lang, "cfg.editTitle", { name: info.name })} sub={t(lang, "cfg.editSub")}>
          <Field label={t(lang, "cfg.taxField")} value={String(cfg.taxPercent)} />
          <Field label={t(lang, "cfg.minPayoutField", { currency: info.currency })} value={String(cfg.minPayoutMinor)} />
          <div style={{ fontSize: 13, color: "#9aa6b3", margin: "6px 0 10px" }}>{t(lang, "cfg.featuresHint")}</div>
          {cfg.features.map((f) => (
            <KV key={f.key} k={f.label}>
              <Badge kind={f.on ? "success" : "neutral"}>{f.on ? t(lang, "cfg.on") : t(lang, "cfg.off")}</Badge>
            </KV>
          ))}
          <BtnRow>
            <Btn variant="primary" onClick={() => setView("overview")}>{t(lang, "cfg.save")}</Btn>
            <Btn variant="ghost" onClick={() => setView("overview")}>{t(lang, "cfg.cancel")}</Btn>
          </BtnRow>
        </Card>
      )}
    </Frame>
  );
}
