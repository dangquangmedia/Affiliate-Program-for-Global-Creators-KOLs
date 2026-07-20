"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, ContextBanner } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { loadSession } from "../../../../lib/auth-client";
import { listMyCountries, selectCountry, type MyCountryProfile } from "../../../../lib/country-client";
import { t, formatMoney } from "../../../../lib/i18n";

type Status = "loading" | "needLogin" | "ready";

export default function CountryScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<Status>("loading");
  const [profiles, setProfiles] = useState<MyCountryProfile[]>([]);
  const [busy, setBusy] = useState<Market | null>(null);
  const { lang } = usePrefs();
  const has = (m: Market): boolean => profiles.some((p) => p.context.market === m);
  const active = profiles.find((p) => p.context.market === market);

  const refresh = useCallback(async () => {
    setProfiles(await listMyCountries());
  }, []);

  useEffect(() => {
    if (!loadSession()) {
      setStatus("needLogin");
      return;
    }
    refresh().then(() => setStatus("ready"));
  }, [refresh]);

  async function create(m: Market) {
    setBusy(m);
    try {
      await selectCountry(m); // tạo creator_country_profile THẬT, gắn user của phiên
      setMarket(m);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Frame screen="V02 Country" title={t(lang, "country.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "country.noteQ")}</strong> {t(lang, "country.noteBody")}{" "}
        <em>{t(lang, "country.noteHard")}</em>
      </Note>

      {status === "needLogin" && (
        <Card title={t(lang, "country.needLogin")}>
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              {t(lang, "nav.login")}
            </Link>
          </p>
        </Card>
      )}

      {status === "loading" && <p style={{ color: "#8b96a3" }}>{t(lang, "country.loadingProfiles")}</p>}

      {status === "ready" && (
        <>
          <ContextBanner market={market} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            {(Object.keys(MARKETS) as Market[]).map((m) => (
              <Card
                key={m}
                title={`${MARKETS[m].flag} ${MARKETS[m].name}`}
                sub={`${MARKETS[m].locale} · ${MARKETS[m].currency}`}
              >
                {has(m) ? (
                  m === market ? (
                    <Badge kind="success">{t(lang, "country.using")}</Badge>
                  ) : (
                    <BtnRow>
                      <Btn onClick={() => setMarket(m)}>{t(lang, "country.switchTo")}</Btn>
                    </BtnRow>
                  )
                ) : (
                  <BtnRow>
                    <Btn variant="primary" disabled={busy !== null} onClick={() => create(m)}>
                      {busy === m ? t(lang, "country.creating") : t(lang, "country.create")}
                    </Btn>
                  </BtnRow>
                )}
              </Card>
            ))}
          </div>

          {active ? (
            <Card title={t(lang, "country.yourProfiles")} sub={t(lang, "country.profileOf", { name: active.context.countryName })}>
              <p style={{ color: "#a9b6c4", fontSize: 14, margin: "4px 0" }}>
                {t(lang, "country.dbContext")} <strong>{active.context.currency}</strong> ·{" "}
                {t(lang, "country.localeLine", { locale: active.context.locale, fallback: active.context.fallbackLocale })}
              </p>
              <p style={{ color: "#a9b6c4", fontSize: 14, margin: "4px 0" }}>
                {t(lang, "country.formatExample")}{" "}
                <strong>
                  {formatMoney(active.context.currency === "VND" ? 500000 : 120000, active.context.currency, active.context.locale)}
                </strong>
              </p>
              <p style={{ fontSize: 13, color: "#8b96a3", marginTop: 10 }}>
                {t(lang, "country.nextKyc")} →{" "}
                <Link href="/mockup/creator/kyc" style={{ color: "#6aa6ff" }}>
                  KYC {market}
                </Link>
              </p>
            </Card>
          ) : (
            <p style={{ color: "#8b96a3", fontSize: 13 }}>{t(lang, "country.noProfiles")}</p>
          )}
        </>
      )}
    </Frame>
  );
}
