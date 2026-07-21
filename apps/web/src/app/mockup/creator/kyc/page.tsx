"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Frame, Note, Card, Btn, BtnRow, Badge, ContextBanner, mk } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { t } from "../../../../lib/i18n";
import { loadSession, saveSession, mockLogin } from "../../../../lib/auth-client";
import { getMyKyc, submitKyc, getKycQueue, reviewKyc, type KycCase, type KycField } from "../../../../lib/kyc-client";

type Status = "loading" | "needLogin" | "ready";

export default function KycScreen() {
  const [status, setStatus] = useState<Status>("loading");
  const [kyc, setKyc] = useState<KycCase | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [qbusy, setQbusy] = useState(false);
  const { lang, market, setMarket } = usePrefs();

  const load = useCallback(async () => {
    const c = await getMyKyc(market);
    setKyc(c);
    if (c) setValues(Object.fromEntries(c.fields.map((f) => [f.key, f.value ?? ""])));
  }, [market]);

  useEffect(() => {
    if (!loadSession()) {
      setStatus("needLogin");
      return;
    }
    setStatus("loading");
    load().then(() => setStatus("ready"));
  }, [load]);

  // Field mở để sửa khi: case đang DRAFT/REJECTED và field chưa được duyệt (ACCEPTED thì khoá).
  const editable = (f: KycField): boolean =>
    (kyc?.state === "DRAFT" || kyc?.state === "REJECTED") && f.state !== "ACCEPTED";
  const isFormState = kyc?.state === "DRAFT" || kyc?.state === "REJECTED";

  async function submit() {
    if (!kyc) return;
    setBusy(true);
    try {
      const payload: Record<string, string> = {};
      for (const f of kyc.fields) if (editable(f)) payload[f.key] = values[f.key] ?? "";
      await submitKyc(market, payload);
      await load();
    } finally {
      setBusy(false);
    }
  }

  // Demo: mô phỏng Ops duyệt để gỡ kẹt màn "chờ duyệt" — đăng nhập Ops đúng nước, duyệt mọi field
  // rồi TRẢ LẠI phiên creator. Ngoài nút này còn có link sang hàng đợi Ops để duyệt tay thủ công.
  async function quickApprove() {
    if (!kyc) return;
    setQbusy(true);
    const creator = loadSession();
    try {
      saveSession(await mockLogin(`ops.${market.toLowerCase()}@demo.affiliate.gl`, `Ops ${market}`));
      const q = await getKycQueue(market);
      if (!("forbidden" in q)) {
        const mine = q.find((c) => c.caseId === kyc.caseId) ?? q[0];
        if (mine) {
          const decisions = mine.fields
            .filter((f) => f.state !== "ACCEPTED")
            .map((f) => ({ key: f.key, decision: "ACCEPT" as const }));
          await reviewKyc(market, mine.caseId, decisions);
        }
      }
    } finally {
      if (creator) saveSession(creator); // trả lại phiên creator
      setQbusy(false);
      await load();
    }
  }

  return (
    <Frame screen="V03 KYC" title={t(lang, "kyc.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "kyc.noteQ")}</strong> {t(lang, "kyc.noteBody")} <em>{t(lang, "kyc.noteHard")}</em>
      </Note>

      {status === "needLogin" && (
        <Card title={t(lang, "kyc.needLoginTitle")}>
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              {t(lang, "nav.login")}
            </Link>
          </p>
        </Card>
      )}

      {status === "loading" && <p style={{ color: "#8b96a3" }}>{t(lang, "kyc.loading")}</p>}

      {status === "ready" && kyc && (
        <>
          <ContextBanner market={market} />

          <div style={{ margin: "6px 0 14px" }}>
            {t(lang, "kyc.stateLabel")}{" "}
            {kyc.state === "APPROVED" ? (
              <Badge kind="success">✓ {t(lang, "kyc.approvedBadge")}</Badge>
            ) : kyc.state === "REJECTED" ? (
              <Badge kind="warn">{t(lang, "kyc.needChanges")}</Badge>
            ) : kyc.state === "DRAFT" ? (
              <Badge kind="neutral">{t(lang, "kyc.draft")}</Badge>
            ) : (
              <Badge kind="info">{t(lang, "kyc.pendingReview", { state: kyc.state })}</Badge>
            )}
          </div>

          {kyc.state === "APPROVED" && (
            <Card>
              <Badge kind="success">✓ {t(lang, "kyc.approvedBadge")}</Badge>
              <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>{t(lang, "kyc.approvedBody")}</p>
              <BtnRow>
                <Btn variant="primary">
                  <Link href="/mockup/creator/discover" style={{ color: "#fff", textDecoration: "none" }}>
                    {t(lang, "kyc.discoverBtn")}
                  </Link>
                </Btn>
              </BtnRow>
            </Card>
          )}

          {(kyc.state === "SUBMITTED" || kyc.state === "RESUBMITTED") && (
            <Card>
              <Badge kind="info">{t(lang, "kyc.awaitingBadge")}</Badge>
              <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>{t(lang, "kyc.awaitingBody", { market })}</p>
              <BtnRow>
                <Btn variant="primary" disabled={qbusy} onClick={quickApprove}>
                  {qbusy
                    ? lang === "vi" ? "Đang duyệt…" : "Approving…"
                    : lang === "vi" ? "Duyệt nhanh (demo)" : "Quick approve (demo)"}
                </Btn>
                <Btn variant="ghost">
                  <Link href="/mockup/ops/review" style={{ color: "inherit", textDecoration: "none" }}>
                    {lang === "vi" ? "Vào hàng đợi Ops duyệt tay →" : "Open Ops queue →"}
                  </Link>
                </Btn>
              </BtnRow>
              <p style={{ fontSize: 13, color: "#8b96a3", marginTop: 10 }}>
                {lang === "vi" ? "Trong lúc chờ, bạn vẫn có thể " : "While waiting, you can "}
                <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
                  {lang === "vi" ? "khám phá campaign" : "browse campaigns"}
                </Link>
                .
              </p>
            </Card>
          )}

          {isFormState && (
            <Card
              title={t(lang, "kyc.formTitle")}
              sub={kyc.state === "REJECTED" ? t(lang, "kyc.formSubReject") : t(lang, "kyc.formSubDraft")}
            >
              {kyc.fields.map((f) => {
                const locked = !editable(f);
                const rejected = f.state === "NEEDS_CHANGES";
                return (
                  <div key={f.key} className={mk.field}>
                    <label className={mk.fieldLabel}>{f.label}</label>
                    <input
                      className={`${mk.input} ${locked ? mk.inputLocked : ""} ${rejected ? mk.inputError : ""}`}
                      value={values[f.key] ?? ""}
                      readOnly={locked}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.label}
                    />
                    {locked && f.state === "ACCEPTED" && (
                      <div style={{ marginTop: 4 }}>
                        <Badge kind="success">✓ {t(lang, "kyc.fieldApproved")}</Badge>
                      </div>
                    )}
                    {rejected && f.reason && (
                      <div style={{ marginTop: 4, color: "#ff9ba3", fontSize: 13 }}>{t(lang, "kyc.reason")} {f.reason}</div>
                    )}
                  </div>
                );
              })}
              <BtnRow>
                <Btn variant="primary" disabled={busy} onClick={submit}>
                  {busy ? t(lang, "kyc.sending") : kyc.state === "REJECTED" ? t(lang, "kyc.resubmit") : t(lang, "kyc.submit")}
                </Btn>
              </BtnRow>
            </Card>
          )}
        </>
      )}
    </Frame>
  );
}
