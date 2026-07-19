"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, ContextBanner, mk } from "../../../../mockup/ui";
import { loadSession } from "../../../../lib/auth-client";
import { getMyKyc, submitKyc, type KycCase, type KycField } from "../../../../lib/kyc-client";

type Status = "loading" | "needLogin" | "ready";

export default function KycScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<Status>("loading");
  const [kyc, setKyc] = useState<KycCase | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

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

  return (
    <Frame screen="V03 KYC" title="Xác minh danh tính (KYC)" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> creator đang ở bước nào của KYC, và nếu bị từ chối thì
        sửa gì? → Ops duyệt/từ chối <strong>theo từng field</strong>; khi &quot;cần sửa&quot;,
        chỉ field bị từ chối mới mở lại, field đã duyệt bị khoá. <em>Nút gọi API thật
        (`/me/country/:market/kyc`); KYC phải Approved mới được Join (QĐ-2). Server chặn ghi đè
        field đã duyệt kể cả khi client cố gửi.</em>
      </Note>

      {status === "needLogin" && (
        <Card title="Bạn cần đăng nhập trước khi làm KYC">
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              Đăng nhập
            </Link>
          </p>
        </Card>
      )}

      {status === "loading" && <p style={{ color: "#8b96a3" }}>Đang tải hồ sơ KYC…</p>}

      {status === "ready" && kyc && (
        <>
          <ContextBanner market={market} />

          <div style={{ margin: "6px 0 14px" }}>
            Trạng thái hồ sơ:{" "}
            {kyc.state === "APPROVED" ? (
              <Badge kind="success">✓ Đã duyệt</Badge>
            ) : kyc.state === "REJECTED" ? (
              <Badge kind="warn">Cần sửa</Badge>
            ) : kyc.state === "DRAFT" ? (
              <Badge kind="neutral">Nháp</Badge>
            ) : (
              <Badge kind="info">Chờ Ops duyệt ({kyc.state})</Badge>
            )}
          </div>

          {kyc.state === "APPROVED" && (
            <Card>
              <Badge kind="success">✓ Đã duyệt</Badge>
              <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>
                Danh tính đã xác minh. Bây giờ bạn có thể Join campaign.
              </p>
              <BtnRow>
                <Btn variant="primary">
                  <Link href="/mockup/creator/discover" style={{ color: "#fff", textDecoration: "none" }}>
                    Khám phá campaign →
                  </Link>
                </Btn>
              </BtnRow>
            </Card>
          )}

          {(kyc.state === "SUBMITTED" || kyc.state === "RESUBMITTED") && (
            <Card>
              <Badge kind="info">Đang chờ Ops duyệt</Badge>
              <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>
                Hồ sơ đã gửi. Ops nước {market} sẽ duyệt sớm. Bạn không cần làm gì thêm lúc này.
              </p>
            </Card>
          )}

          {isFormState && (
            <Card
              title="Thông tin định danh"
              sub={
                kyc.state === "REJECTED"
                  ? "Có mục cần sửa. Mục đã duyệt đã bị khoá — không cần nhập lại."
                  : "Điền các thông tin sau để nộp KYC."
              }
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
                        <Badge kind="success">✓ đã duyệt</Badge>
                      </div>
                    )}
                    {rejected && f.reason && (
                      <div style={{ marginTop: 4, color: "#ff9ba3", fontSize: 13 }}>Lý do: {f.reason}</div>
                    )}
                  </div>
                );
              })}
              <BtnRow>
                <Btn variant="primary" disabled={busy} onClick={submit}>
                  {busy ? "Đang gửi…" : kyc.state === "REJECTED" ? "Nộp lại mục đã sửa" : "Nộp KYC"}
                </Btn>
              </BtnRow>
            </Card>
          )}
        </>
      )}
    </Frame>
  );
}
