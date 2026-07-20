"use client";

import { useCallback, useEffect, useState } from "react";
import type { Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, mk } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { t } from "../../../../lib/i18n";
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
  const { lang } = usePrefs();

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
      setErr(t(lang, "ops.errRejectContent"));
      return;
    }
    setBusy(id);
    try {
      const res = await reviewContent(market, id, decision, reason || undefined);
      if (!res.ok && res.code === "ALREADY_REVIEWED") {
        setErr(t(lang, "ops.errAlreadyReviewed"));
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
      setErr(t(lang, "ops.errRejectField"));
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
    <Frame screen="V10 Ops review" title={t(lang, "ops.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "ops.noteQ")}</strong> {t(lang, "ops.noteBody")} <em>{t(lang, "ops.noteHard")}</em>
      </Note>

      <div style={{ fontSize: 12, color: "#8b96a3", marginBottom: 14 }}>
        {t(lang, "ops.scope")} <b style={{ color: "#cfe0ff" }}>{t(lang, "ops.scopeName", { market })}</b> {t(lang, "ops.scopeTail", { market })}
      </div>

      {status === "loading" && <p style={{ color: "#8b96a3" }}>{t(lang, "ops.loading")}</p>}

      {status === "needStaff" && (
        <Card title={t(lang, "ops.needStaffTitle", { market })} sub={t(lang, "ops.needStaffSub")}>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginBottom: 10 }}>{t(lang, "ops.needStaffBody", { market })}</p>
          <BtnRow>
            <Btn variant="primary" onClick={loginAsOps}>
              {t(lang, "ops.loginBtn", { market })}
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

          <Card title={t(lang, "ops.kycQueue", { n: queue.length })} sub={t(lang, "ops.kycQueueSub")}>
            {queue.length === 0 && <p style={{ color: "#8b96a3" }}>{t(lang, "ops.kycEmpty")}</p>}
            {queue.map((c) => (
              <div
                key={c.caseId}
                data-creator={c.creatorName}
                style={{ borderTop: "1px solid #1b2430", paddingTop: 12, marginTop: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{c.creatorName}</strong>
                  {c.state === "RESUBMITTED" ? <Badge kind="info">{t(lang, "ops.resubmitted")}</Badge> : <Badge kind="warn">{t(lang, "ops.pending")}</Badge>}
                </div>
                {c.fields.map((f) => {
                  const locked = f.state === "ACCEPTED";
                  const pick = decisions[c.caseId]?.[f.key];
                  return (
                    <div key={f.key} style={{ padding: "8px 0", borderBottom: "1px solid #131a22" }}>
                      <div style={{ fontSize: 13 }}>
                        <b>{f.label}:</b> <span style={{ color: "#cfe0ff" }}>{f.value ?? "—"}</span>{" "}
                        {locked && <Badge kind="success">✓ {t(lang, "ops.fieldApproved")}</Badge>}
                      </div>
                      {!locked && pick && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                          <Btn
                            variant={pick.decision === "ACCEPT" ? "primary" : "ghost"}
                            onClick={() => setField(c.caseId, f.key, { decision: "ACCEPT" })}
                          >
                            {t(lang, "ops.approve")}
                          </Btn>
                          <Btn
                            variant={pick.decision === "NEEDS_CHANGES" ? "danger" : "ghost"}
                            onClick={() => setField(c.caseId, f.key, { decision: "NEEDS_CHANGES" })}
                          >
                            {t(lang, "ops.needChanges")}
                          </Btn>
                          {pick.decision === "NEEDS_CHANGES" && (
                            <input
                              className={mk.input}
                              style={{ flex: 1, minWidth: 200 }}
                              placeholder={t(lang, "ops.reasonPlaceholder")}
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
                    {busy === c.caseId ? t(lang, "ops.sending") : t(lang, "ops.submitDecision")}
                  </Btn>
                </BtnRow>
              </div>
            ))}
          </Card>

          <Card title={t(lang, "ops.contentQueue", { n: content.length })} sub={t(lang, "ops.contentQueueSub")}>
            {content.length === 0 && <p style={{ color: "#8b96a3" }}>{t(lang, "ops.contentEmpty")}</p>}
            {content.map((s) => {
              const ok = s.hashtagOk && s.platformOk;
              return (
                <div key={s.submissionId} data-creator={s.creatorName} style={{ borderTop: "1px solid #1b2430", paddingTop: 12, marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <strong>{s.creatorName}</strong>
                      <span style={{ color: "#8b96a3", fontSize: 13 }}> · {s.campaignTitle} · attempt #{s.attemptNo}</span>
                    </div>
                    {ok ? <Badge kind="success">{t(lang, "ops.passPrelim")}</Badge> : <Badge kind="danger">{t(lang, "ops.needReview")}</Badge>}
                  </div>
                  <p style={{ fontSize: 12, color: "#6aa6ff", wordBreak: "break-all", margin: "6px 0" }}>
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "#6aa6ff" }}>{s.url}</a>
                    {!s.hashtagOk && <span style={{ color: "#f0c674" }}>{t(lang, "ops.captionMissing")}</span>}
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Btn variant="primary" disabled={busy === s.submissionId} onClick={() => reviewSubmission(s.submissionId, "APPROVE")}>
                      {busy === s.submissionId ? "…" : t(lang, "ops.approveContent")}
                    </Btn>
                    <Btn variant="danger" disabled={busy === s.submissionId} onClick={() => reviewSubmission(s.submissionId, "REJECT")}>
                      {t(lang, "ops.reject")}
                    </Btn>
                    <input
                      className={mk.input}
                      style={{ flex: 1, minWidth: 200 }}
                      placeholder={t(lang, "ops.rejectPlaceholder")}
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
