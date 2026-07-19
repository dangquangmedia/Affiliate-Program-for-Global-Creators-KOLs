"use client";

import { useCallback, useEffect, useState } from "react";
import type { Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, mk } from "../../../../mockup/ui";
import { mockLogin, saveSession } from "../../../../lib/auth-client";
import { getKycQueue, reviewKyc, type KycQueueItem, type FieldDecision } from "../../../../lib/kyc-client";
import { contentQueue, reviewContent, type ContentQueueItem } from "../../../../lib/content-client";

// Quyết định đang soạn cho từng field của từng case: caseId -> fieldKey -> {decision, reason}.
type DecisionMap = Record<string, Record<string, { decision: "ACCEPT" | "NEEDS_CHANGES"; reason: string }>>;

export default function OpsReviewScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<"loading" | "needStaff" | "ready">("loading");
  const [queue, setQueue] = useState<KycQueueItem[]>([]);
  const [content, setContent] = useState<ContentQueueItem[]>([]);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<DecisionMap>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
    const cq = await contentQueue(market);
    setContent("forbidden" in cq ? [] : cq);
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

  async function reviewSubmission(id: string, decision: "APPROVE" | "REJECT") {
    setErr(null);
    const reason = (rejectReasons[id] ?? "").trim();
    if (decision === "REJECT" && !reason) {
      setErr("Từ chối content phải nhập lý do.");
      return;
    }
    setBusy(id);
    try {
      const res = await reviewContent(market, id, decision, reason || undefined);
      if (!res.ok && res.code === "ALREADY_REVIEWED") {
        setErr("Submission này vừa được reviewer khác xử lý (chống duyệt trùng).");
      }
      await load();
    } finally {
      setBusy(null);
    }
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
        <strong>Màn này trả lời:</strong> Ops duyệt KYC + content thế nào, từ chối ra sao? →
        Duyệt/từ chối <strong>theo từng field</strong> (KYC) và theo submission (content), từ chối
        phải có lý do. <em>Cả 2 hàng đợi gọi API thật + RBAC cách ly nước (bài toán #1); duyệt
        content tạo thu nhập ĐÚNG 1 LẦN kể cả double-click (bài toán #7 — N11).</em>
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

          <Card
            title={`Hàng đợi content (${content.length})`}
            sub="Approve tạo ĐÚNG 1 khoản thu nhập (exactly-once); reject bắt buộc lý do, creator có 24h sửa (QĐ-4)."
          >
            {content.length === 0 && <p style={{ color: "#8b96a3" }}>Không có content chờ duyệt.</p>}
            {content.map((s) => {
              const ok = s.hashtagOk && s.platformOk;
              return (
                <div key={s.submissionId} data-creator={s.creatorName} style={{ borderTop: "1px solid #1b2430", paddingTop: 12, marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <strong>{s.creatorName}</strong>
                      <span style={{ color: "#8b96a3", fontSize: 13 }}> · {s.campaignTitle} · attempt #{s.attemptNo}</span>
                    </div>
                    {ok ? <Badge kind="success">Đạt sơ bộ</Badge> : <Badge kind="danger">Cần xem</Badge>}
                  </div>
                  <p style={{ fontSize: 12, color: "#6aa6ff", wordBreak: "break-all", margin: "6px 0" }}>
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "#6aa6ff" }}>{s.url}</a>
                    {!s.hashtagOk && <span style={{ color: "#f0c674" }}> · caption thiếu hashtag</span>}
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Btn variant="primary" disabled={busy === s.submissionId} onClick={() => reviewSubmission(s.submissionId, "APPROVE")}>
                      {busy === s.submissionId ? "…" : "Duyệt (+ thu nhập)"}
                    </Btn>
                    <Btn variant="danger" disabled={busy === s.submissionId} onClick={() => reviewSubmission(s.submissionId, "REJECT")}>
                      Từ chối
                    </Btn>
                    <input
                      className={mk.input}
                      style={{ flex: 1, minWidth: 200 }}
                      placeholder="Lý do từ chối (bắt buộc khi từ chối)"
                      value={rejectReasons[s.submissionId] ?? ""}
                      onChange={(e) => setRejectReasons((r) => ({ ...r, [s.submissionId]: e.target.value }))}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}
    </Frame>
  );
}
