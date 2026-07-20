"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, KV, Field, ContextBanner } from "../../../../mockup/ui";
import { loadSession } from "../../../../lib/auth-client";
import { getWallet, requestOtp, createPayout, type Wallet, type Otp, type Payout } from "../../../../lib/payout-client";
import { formatMoney } from "../../../../lib/i18n";

type Status = "loading" | "needLogin" | "ready";
type Step = "idle" | "otp";

const PAYOUT_BADGE: Record<Payout["state"], { kind: "info" | "success" | "danger" | "warn"; label: string }> = {
  PROCESSING: { kind: "info", label: "Đang xử lý (đã giữ chỗ)" },
  PAID: { kind: "success", label: "Đã trả" },
  FAILED_RELEASED: { kind: "danger", label: "Lỗi → đã hoàn" },
  UNKNOWN_HOLD: { kind: "warn", label: "Không rõ → đang giữ" },
};

export default function WalletScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<Status>("loading");
  const [w, setW] = useState<Wallet | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [otp, setOtp] = useState<Otp | null>(null);
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [idemKey, setIdemKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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
        setErr("Không phát được OTP.");
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
      setErr("Số tiền không hợp lệ.");
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
    <Frame screen="V08 Wallet + Payout" title="Ví & rút tiền" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> tôi rút tiền thế nào? → Rút cần OTP; số tiền được{" "}
        <strong>giữ chỗ (reserve)</strong> khi gửi lệnh (ghi sổ −amount). <em>Bấm 2 lần vẫn 1 lệnh
        (idempotency key UNIQUE). Bài toán #4 (fail-hoàn / unknown-giữ) hoàn thiện ở N15.</em>
      </Note>

      {status === "needLogin" && (
        <Card title="Bạn cần đăng nhập">
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              Đăng nhập
            </Link>
          </p>
        </Card>
      )}
      {status === "loading" && <p style={{ color: "#8b96a3" }}>Đang tải…</p>}

      {status === "ready" && w && (
        <>
          <ContextBanner market={market} />

          <Card title="Số dư khả dụng">
            <KV k={`Rút được (${cur})`} strong>
              {formatMoney(w.withdrawableMinor, cur, locale)}
            </KV>
            <KV k="Tối thiểu mỗi lần rút">{formatMoney(w.minPayoutMinor, cur, locale)}</KV>
            <p style={{ fontSize: 12, color: "#6b7684", marginTop: 8 }}>
              Số dư = net đã đối soát (AVAILABLE) − các lệnh đang giữ tiền. Chưa đủ? Tiền còn{" "}
              <Link href="/mockup/creator/earnings" style={{ color: "#6aa6ff" }}>PENDING chờ đối soát</Link>.
            </p>

            {step === "idle" ? (
              <BtnRow>
                <Btn
                  variant="primary"
                  disabled={busy || w.withdrawableMinor < w.minPayoutMinor || w.withdrawableMinor <= 0}
                  onClick={startPayout}
                >
                  {busy ? "…" : w.withdrawableMinor < w.minPayoutMinor ? "Chưa đủ mức tối thiểu" : "Yêu cầu rút tiền"}
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
                    OTP (mock, dev hiển thị): <b style={{ color: "#fff" }}>{otp.code}</b> — nhập vào bên dưới.
                  </p>
                )}
                <Field label={`Số tiền rút (${cur}, minor units)`} placeholder="VD 450000" value={amount} onChange={setAmount} />
                <Field label="Mã OTP (6 chữ số)" placeholder="6 chữ số" value={code} onChange={setCode} />
                <BtnRow>
                  <Btn variant="primary" disabled={busy || !code.trim()} onClick={confirmPayout}>
                    {busy ? "Đang gửi…" : "Xác nhận rút (giữ chỗ)"}
                  </Btn>
                  <Btn variant="ghost" disabled={busy} onClick={() => { setStep("idle"); setErr(null); }}>
                    Huỷ
                  </Btn>
                </BtnRow>
              </div>
            )}
          </Card>

          <Card title="Lịch sử lệnh rút" sub="Mỗi lệnh là bản ghi riêng — không ghi đè. Provider mock được Finance xử lý (V12).">
            {w.payouts.length === 0 ? (
              <p style={{ color: "#8b96a3", fontSize: 13 }}>Chưa có lệnh rút nào.</p>
            ) : (
              w.payouts.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid #1b2430", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{formatMoney(p.amountMinor, p.currency, locale)}</span>
                    <span style={{ fontSize: 12, color: "#6b7684" }}> · {new Date(p.requestedAt).toLocaleString(locale)}</span>
                  </div>
                  <Badge kind={PAYOUT_BADGE[p.state].kind}>{PAYOUT_BADGE[p.state].label}</Badge>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </Frame>
  );
}
