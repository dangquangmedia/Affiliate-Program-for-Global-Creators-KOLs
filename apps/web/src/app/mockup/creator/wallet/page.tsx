"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, KV, Field, ContextBanner, UsdRef } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { loadSession } from "../../../../lib/auth-client";
import { getWallet, requestOtp, createPayout, type Wallet, type Otp, type Payout } from "../../../../lib/payout-client";
import { t, formatMoney, usdReference } from "../../../../lib/i18n";

type Status = "loading" | "needLogin" | "ready";
type Step = "idle" | "otp";

// Chỉ giữ "kind" (màu) ở code; nhãn trạng thái lấy từ i18n theo key wallet.st.*.
const PAYOUT_KIND: Record<Payout["state"], "info" | "success" | "danger" | "warn"> = {
  PROCESSING: "info",
  PAID: "success",
  FAILED_RELEASED: "danger",
  UNKNOWN_HOLD: "warn",
};

export default function WalletScreen() {
  const [status, setStatus] = useState<Status>("loading");
  const [w, setW] = useState<Wallet | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [otp, setOtp] = useState<Otp | null>(null);
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [idemKey, setIdemKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { lang, showUsd, market, setMarket } = usePrefs();
  const locale = MARKETS[market].locale;

  const load = useCallback(async () => {
    const res = await getWallet(market);
    if ("unauthorized" in res) {
      setStatus("needLogin");
      return;
    }
    setW(res);
    setStatus("ready");
  }, [market]);

  useEffect(() => {
    if (!loadSession()) {
      setStatus("needLogin");
      return;
    }
    setStatus("loading");
    setStep("idle");
    load();
  }, [load]);

  async function startPayout() {
    setBusy(true);
    setErr(null);
    try {
      const o = await requestOtp(market);
      if (!o) {
        setErr(t(lang, "wallet.noOtp"));
        return;
      }
      setOtp(o);
      setCode("");
      setAmount(w ? String(w.withdrawableMinor) : "");
      setIdemKey(crypto.randomUUID()); // 1 key/lệnh -> bấm xác nhận 2 lần vẫn 1 lệnh (idempotent)
      setStep("otp");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPayout() {
    if (!otp) return;
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) {
      setErr(t(lang, "wallet.badAmount"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await createPayout(market, { amountMinor: amt, otpId: otp.otpId, code, idempotencyKey: idemKey });
      if (res.ok) {
        setStep("idle");
        setOtp(null);
        await load();
      } else {
        setErr(res.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const cur = w?.currency ?? MARKETS[market].currency;

  return (
    <Frame screen="V08 Wallet + Payout" title={t(lang, "wallet.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "wallet.noteQ")}</strong> {t(lang, "wallet.noteBody")}{" "}
        <em>{t(lang, "wallet.noteHard")}</em>
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

      {status === "ready" && w && (
        <>
          <ContextBanner market={market} />

          <Card title={t(lang, "wallet.balanceTitle")}>
            <KV k={t(lang, "wallet.withdrawable", { cur })} strong>
              {formatMoney(w.withdrawableMinor, cur, locale)}
            </KV>
            {showUsd && <UsdRef>{usdReference(w.withdrawableMinor, cur)}</UsdRef>}
            <KV k={t(lang, "wallet.min")}>{formatMoney(w.minPayoutMinor, cur, locale)}</KV>
            <p style={{ fontSize: 12, color: "#6b7684", marginTop: 8 }}>
              {t(lang, "wallet.balanceHint")}{" "}
              <Link href="/mockup/creator/earnings" style={{ color: "#6aa6ff" }}>{t(lang, "wallet.balanceHintLink")}</Link>.
            </p>

            {step === "idle" ? (
              <BtnRow>
                <Btn
                  variant="primary"
                  disabled={busy || w.withdrawableMinor < w.minPayoutMinor || w.withdrawableMinor <= 0}
                  onClick={startPayout}
                >
                  {busy ? "…" : w.withdrawableMinor < w.minPayoutMinor ? t(lang, "wallet.belowMin") : t(lang, "wallet.request")}
                </Btn>
              </BtnRow>
            ) : (
              <div style={{ marginTop: 12, borderTop: "1px solid #1b2430", paddingTop: 12 }}>
                {err && (
                  <div style={{ marginBottom: 10 }}>
                    <Badge kind="danger">{err}</Badge>
                  </div>
                )}
                {otp && (
                  <p style={{ fontSize: 13, color: "#f0c674", marginBottom: 8 }}>
                    {t(lang, "wallet.otpLine")} <b style={{ color: "#fff" }}>{otp.code}</b> {t(lang, "wallet.otpLineTail")}
                  </p>
                )}
                <Field label={t(lang, "wallet.amountLabel", { cur })} placeholder="VD 450000" value={amount} onChange={setAmount} />
                <Field label={t(lang, "wallet.otpLabel")} placeholder={t(lang, "wallet.otpPlaceholder")} value={code} onChange={setCode} />
                <BtnRow>
                  <Btn variant="primary" disabled={busy || !code.trim()} onClick={confirmPayout}>
                    {busy ? t(lang, "wallet.sending") : t(lang, "wallet.confirm")}
                  </Btn>
                  <Btn variant="ghost" disabled={busy} onClick={() => { setStep("idle"); setErr(null); }}>
                    {t(lang, "wallet.cancel")}
                  </Btn>
                </BtnRow>
              </div>
            )}
          </Card>

          <Card title={t(lang, "wallet.historyTitle")} sub={t(lang, "wallet.historySub")}>
            {w.payouts.length === 0 ? (
              <p style={{ color: "#8b96a3", fontSize: 13 }}>{t(lang, "wallet.noPayouts")}</p>
            ) : (
              w.payouts.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid #1b2430", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{formatMoney(p.amountMinor, p.currency, locale)}</span>
                    <span style={{ fontSize: 12, color: "#6b7684" }}> · {new Date(p.requestedAt).toLocaleString(locale)}</span>
                  </div>
                  <Badge kind={PAYOUT_KIND[p.state]}>{t(lang, `wallet.st.${p.state}`)}</Badge>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </Frame>
  );
}
