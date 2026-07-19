"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTENT_QUEUE, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, mk } from "../../../../mockup/ui";
import { mockLogin, saveSession } from "../../../../lib/auth-client";
import { getKycQueue, reviewKyc, type KycQueueItem, type FieldDecision } from "../../../../lib/kyc-client";

// Quyết định đang soạn cho từng field của từng case: caseId -> fieldKey -> {decision, reason}.
type DecisionMap = Record<string, Record<string, { decision: "ACCEPT" | "NEEDS_CHANGES"; reason: string }>>;

export default function OpsReviewScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<"loading" | "needStaff" | "ready">("loading");
  const [queue, setQueue] = useState<KycQueueItem[]>([]);
  const [decisions, setDecisions] = useState<DecisionMap>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const content = CONTENT_QUEUE.filter((c) => c.market === market);

  const load = useCallback(async () => {
    const q = await getKycQueue(market);
    if ("forbidden" in q) {
      setStatus("needStaff");
      setQueue([]);
      return;
    }
    // Mặc định mọi field chưa duyệt = ACCEPT (đường duyệt nhanh); Ops đổi field cần sửa.
    const seed: DecisionMap = {};
    for (const c of q) {
      seed[c.caseId] = {};
      for (const f of c.fields) if (f.state !== "ACCEPTED") seed[c.caseId][f.key] = { decision: "ACCEPT", reason: "" };
    }
    setDecisions(seed);
    setQueue(q);
    setStatus("ready");
  }, [market]);

  useEffect(() => {
    setStatus("loading");
    load();
  }, [load]);

  async function loginAsOps() {
    const email = `ops.${market.toLowerCase()}@demo.affiliate.gl`;
    saveSession(await mockLogin(email, `Ops ${market}`));
    await load();
  }

  function setField(caseId: string, key: string, patch: Partial<{ decision: "ACCEPT" | "NEEDS_CHANGES"; reason: string }>) {
    setDecisions((d) => ({
      ...d,
      [caseId]: { ...d[caseId], [key]: { ...d[caseId][key], ...patch } },
    }));
  }

  async function submitReview(c: KycQueueItem) {
    setErr(null);
    const picks = decisions[c.caseId] ?? {};
    const list: FieldDecision[] = Object.entries(picks).map(([key, v]) => ({ key, decision: v.decision, reason: v.reason }));
    if (list.some((d) => d.decision === "NEEDS_CHANGES" && !(d.reason ?? "").trim())) {
      setErr("Từ chối field nào thì phải nhập lý do cho field đó.");
      return;
    }
    setBusy(c.caseId);
    try {
      await reviewKyc(market, c.caseId, list);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Frame screen="V10 Ops review" title="Hàng đợi duyệt (Local Ops)" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> Ops duyệt KYC thế nào, từ chối ra sao? → Duyệt/từ chối
        <strong> theo từng field</strong>, từ chối phải có lý do; creator chỉ nộp lại field bị từ
        chối. <em>KYC gọi API thật + RBAC: chỉ Ops đúng nước mới thấy/xử lý (bài toán #1). Hàng
        đợi content bên dưới còn là mock — nối ở N11.</em>
      </Note>

      <div style={{ fontSize: 12, color: "#8b96a3", marginBottom: 14 }}>
        Phạm vi: <b style={{ color: "#cfe0ff" }}>Ops {market}</b> — chỉ thấy hồ sơ của nước {market}.
      </div>

      {status === "loading" && <p style={{ color: "#8b96a3" }}>Đang tải hàng đợi…</p>}

      {status === "needStaff" && (
        <Card title={`Cần quyền Ops ${market}`} sub="Phiên hiện tại không có vai Ops của nước này.">
          <p style={{ color: "#a9b6c4", fontSize: 14, marginBottom: 10 }}>
            Đăng nhập bằng tài khoản Ops demo (mock SSO) để xem & duyệt hàng đợi KYC nước {market}.
          </p>
          <BtnRow>
            <Btn variant="primary" onClick={loginAsOps}>
              Đăng nhập vai Ops {market}
            </Btn>
          </BtnRow>
        </Card>
      )}

      {status === "ready" && (
        <>
          {err && (
            <div style={{ marginBottom: 12 }}>
              <Badge kind="danger">{err}</Badge>
            </div>
          )}

          <Card title={`Hàng đợi KYC (${queue.length})`} sub="Duyệt/từ chối theo từng field rồi gửi quyết định.">
            {queue.length === 0 && <p style={{ color: "#8b96a3" }}>Không có hồ sơ chờ duyệt.</p>}
            {queue.map((c) => (
              <div
                key={c.caseId}
                data-creator={c.creatorName}
                style={{ borderTop: "1px solid #1b2430", paddingTop: 12, marginTop: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{c.creatorName}</strong>
                  {c.state === "RESUBMITTED" ? <Badge kind="info">Nộp lại</Badge> : <Badge kind="warn">Chờ duyệt</Badge>}
                </div>
                {c.fields.map((f) => {
                  const locked = f.state === "ACCEPTED";
                  const pick = decisions[c.caseId]?.[f.key];
                  return (
                    <div key={f.key} style={{ padding: "8px 0", borderBottom: "1px solid #131a22" }}>
                      <div style={{ fontSize: 13 }}>
                        <b>{f.label}:</b> <span style={{ color: "#cfe0ff" }}>{f.value ?? "—"}</span>{" "}
                        {locked && <Badge kind="success">✓ đã duyệt</Badge>}
                      </div>
                      {!locked && pick && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                          <Btn
                            variant={pick.decision === "ACCEPT" ? "primary" : "ghost"}
                            onClick={() => setField(c.caseId, f.key, { decision: "ACCEPT" })}
                          >
                            Duyệt
                          </Btn>
                          <Btn
                            variant={pick.decision === "NEEDS_CHANGES" ? "danger" : "ghost"}
                            onClick={() => setField(c.caseId, f.key, { decision: "NEEDS_CHANGES" })}
                          >
                            Cần sửa
                          </Btn>
                          {pick.decision === "NEEDS_CHANGES" && (
                            <input
                              className={mk.input}
                              style={{ flex: 1, minWidth: 200 }}
                              placeholder="Lý do từ chối (bắt buộc)"
                              value={pick.reason}
                              onChange={(e) => setField(c.caseId, f.key, { reason: e.target.value })}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <BtnRow>
                  <Btn variant="primary" disabled={busy === c.caseId} onClick={() => submitReview(c)}>
                    {busy === c.caseId ? "Đang gửi…" : "Gửi quyết định"}
                  </Btn>
                </BtnRow>
              </div>
            ))}
          </Card>

          <Card title={`Hàng đợi content (${content.length}) — mock (N11)`}>
            <table className={mk.table}>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Campaign</th>
                  <th>Kiểm tự động</th>
                </tr>
              </thead>
              <tbody>
                {content.map((c) => {
                  const ok = c.hashtagOk && c.platformOk;
                  return (
                    <tr key={c.id}>
                      <td>{c.creatorName}</td>
                      <td>{c.campaignTitle}</td>
                      <td>{ok ? <Badge kind="success">Đạt sơ bộ</Badge> : <Badge kind="danger">Cần xem</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </Frame>
  );
}
