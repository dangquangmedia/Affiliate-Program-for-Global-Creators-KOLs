"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, ContextBanner } from "../../../../mockup/ui";
import { loadSession } from "../../../../lib/auth-client";
import { listMyCountries, selectCountry, type MyCountryProfile } from "../../../../lib/country-client";
import { langFromLocale, t, formatMoney } from "../../../../lib/i18n";

type Status = "loading" | "needLogin" | "ready";

export default function CountryScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<Status>("loading");
  const [profiles, setProfiles] = useState<MyCountryProfile[]>([]);
  const [busy, setBusy] = useState<Market | null>(null);

  const lang = langFromLocale(MARKETS[market].locale);
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
        <strong>Màn này trả lời:</strong> 1 tài khoản toàn cầu nhưng hồ sơ (KYC, ngân hàng,
        thuế, thu nhập) phải RIÊNG từng nước vì luật mỗi nước khác nhau. → Creator chọn/tạo hồ
        sơ theo nước, và có thể chuyển qua lại. <em>Bài toán khó #1: dữ liệu 2 nước không được
        trộn. Nút bên dưới gọi API thật (`POST /me/country/:market`) — hồ sơ cột vào user của
        PHIÊN, không nhận userId từ client.</em>
      </Note>

      {status === "needLogin" && (
        <Card title={t(lang, "country.needLogin")}>
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              Đăng nhập
            </Link>
          </p>
        </Card>
      )}

      {status === "loading" && <p style={{ color: "#8b96a3" }}>Đang tải hồ sơ…</p>}

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
                      {busy === m ? "Đang tạo…" : t(lang, "country.create")}
                    </Btn>
                  </BtnRow>
                )}
              </Card>
            ))}
          </div>

          {active ? (
            <Card title={t(lang, "country.yourProfiles")} sub={`Hồ sơ ${active.context.countryName}`}>
              <p style={{ color: "#a9b6c4", fontSize: 14, margin: "4px 0" }}>
                Ngữ cảnh từ DB: <strong>{active.context.currency}</strong> · locale{" "}
                <strong>{active.context.locale}</strong> (fallback {active.context.fallbackLocale}).
              </p>
              <p style={{ color: "#a9b6c4", fontSize: 14, margin: "4px 0" }}>
                Ví dụ định dạng tiền theo locale:{" "}
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
            <p style={{ color: "#8b96a3", fontSize: 13 }}>
              Chưa có hồ sơ nước nào — tạo một hồ sơ để tiếp tục.
            </p>
          )}
        </>
      )}
    </Frame>
  );
}
