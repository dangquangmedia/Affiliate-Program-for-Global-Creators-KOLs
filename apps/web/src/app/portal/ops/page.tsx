"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shell, MarketStrip, Kpi, Panel, Chip, Btn, Note, Empty, Icon, css as s, type NavItem, type Role,
} from "../ui";
import { type Market } from "../../../mockup/data";
import { getKycQueue, reviewKyc, type KycQueueItem, type FieldDecision } from "../../../lib/kyc-client";
import { contentQueue, reviewContent, type ContentQueueItem } from "../../../lib/content-client";

function readPrefMarket(): Market {
  if (typeof window === "undefined") return "VN";
  return window.localStorage.getItem("ag_pref_market") === "PH" ? "PH" : "VN";
}

// Mã lỗi thật từ apps/api/src/content/content.service.ts review().
const CONTENT_ERROR_MESSAGES: Record<string, string> = {
  ALREADY_REVIEWED: "Nội dung này vừa được người khác duyệt/từ chối rồi.",
  VALIDATION_ERROR: "Cần nhập lý do khi từ chối.",
  RESOURCE_NOT_FOUND: "Không tìm thấy nội dung này ở thị trường của bạn.",
};
function contentErrorMessage(code?: string): string {
  return CONTENT_ERROR_MESSAGES[code ?? ""] ?? "Không xử lý được, thử lại sau.";
}

export default function OpsDashboard() {
  const [market] = useState<Market>(readPrefMarket);
  const [showUsd, setShowUsd] = useState(false);
  const [active, setActive] = useState("home");

  const [kyc, setKyc] = useState<KycQueueItem[]>([]);
  const [content, setContent] = useState<ContentQueueItem[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [k, c] = await Promise.all([getKycQueue(market), contentQueue(market)]);
    if ("forbidden" in k) {
      setKyc([]);
      setLoadErr("Bạn không có quyền xem hàng đợi KYC ở thị trường này.");
    } else {
      setKyc(k);
    }
    if ("forbidden" in c) {
      setContent([]);
      setLoadErr("Bạn không có quyền xem hàng đợi nội dung ở thị trường này.");
    } else {
      setContent(c);
    }
  }, [market]);

  useEffect(() => {
    void load();
  }, [load]);

  const ROLE: Role = { key: "ops", name: "Trần Ops", scope: `Local Ops · ${market}`, color: "#5ab0f0" };

  const [kycBusy, setKycBusy] = useState(false);
  const [kycErr, setKycErr] = useState<string | null>(null);
  async function decideKyc(caseId: string, decisions: FieldDecision[]) {
    setKycBusy(true);
    setKycErr(null);
    try {
      await reviewKyc(market, caseId, decisions);
      await load();
    } catch {
      setKycErr("Không gửi được quyết định KYC, thử lại sau.");
    } finally {
      setKycBusy(false);
    }
  }

  const [contentBusy, setContentBusy] = useState(false);
  const [contentErr, setContentErr] = useState<string | null>(null);
  async function approveContent(id: string) {
    setContentBusy(true);
    setContentErr(null);
    try {
      const res = await reviewContent(market, id, "APPROVE");
      if (!res.ok) {
        setContentErr(contentErrorMessage(res.code));
        return;
      }
      await load();
    } finally {
      setContentBusy(false);
    }
  }
  async function rejectContent(id: string, reason: string) {
    setContentBusy(true);
    setContentErr(null);
    try {
      const res = await reviewContent(market, id, "REJECT", reason);
      if (!res.ok) {
        setContentErr(contentErrorMessage(res.code));
        return;
      }
      await load();
    } finally {
      setContentBusy(false);
    }
  }
  function onQuickReject(id: string) {
    const reason = window.prompt("Lý do từ chối nội dung:");
    if (reason === null) return; // huỷ
    const trimmed = reason.trim();
    if (!trimmed) {
      setContentErr("Cần nhập lý do khi từ chối.");
      return;
    }
    void rejectContent(id, trimmed);
  }

  const nav: NavItem[] = [
    { key: "home", label: "Tổng quan", icon: "home" },
    { key: "kyc", label: "Duyệt KYC", icon: "shield", badge: kyc.length },
    { key: "content", label: "Duyệt nội dung", icon: "fileCheck", badge: content.length },
    { key: "creators", label: "Người sáng tạo", icon: "users" },
  ];

  return (
    <Shell role={ROLE} market={market} setMarket={() => {}} marketLocked nav={nav} active={active} setActive={setActive}
      title={nav.find((n) => n.key === active)?.label ?? "Tổng quan"}
      subtitle="Trung tâm duyệt — khoá theo thị trường được phân công"
      user={{ name: "Trần Vận Hành", sub: `Local Ops · ${market}` }} showUsd={showUsd} setShowUsd={setShowUsd}>

      <MarketStrip market={market} note="Local Ops không có công tắc VN/PH — chỉ thấy dữ liệu nước mình" />

      {loadErr && <div style={{ marginBottom: 12 }}><Chip tone="danger">{loadErr}</Chip></div>}

      {active === "home" && (
        <>
          <div className={`${s.grid} ${s.kpiGrid}`}>
            <Kpi label="KYC chờ duyệt" icon="shield" tone="warn" value={String(kyc.length)} sub={<>{kyc.filter((k) => k.state === "RESUBMITTED").length} nộp lại</>} />
            <Kpi label="Nội dung chờ duyệt" icon="fileCheck" tone="brand" value={String(content.length)} sub={<>{content.filter((c) => !c.platformOk).length} nghi ngờ nền tảng</>} />
            <Kpi label="Chờ lâu nhất" icon="clock" tone="danger" value="26h" sub={<><Icon name="alert" size={13} /> vượt SLA</>} />
            <Kpi label="Đã xử lý hôm nay" icon="check" tone="ok" value="18" />
          </div>
          <div className={`${s.grid} ${s.g2}`} style={{ marginTop: 22 }}>
            <div data-testid="ops-content-queue">
              <Panel title="Nội dung chờ duyệt" sub="link creator nộp — duyệt nhanh">
                {contentErr && <div style={{ marginBottom: 10 }}><Chip tone="danger">{contentErr}</Chip></div>}
                {content.length === 0 ? (
                  <Empty>Chưa có nội dung nào đang chờ duyệt.</Empty>
                ) : content.map((c) => (
                  <div key={c.submissionId} className={s.taskItem} style={{ ["--tone" as string]: c.platformOk ? "var(--info)" : "var(--danger)" }}>
                    <span className={s.taskIcon}><Icon name={c.platformOk ? "fileCheck" : "alert"} size={18} /></span>
                    <div className={s.taskBody}>
                      <b>{c.creatorName} · {c.campaignTitle}</b>
                      <span>{c.platformOk ? "Link: " : "Link sai nền tảng: "}{c.url}</span>
                    </div>
                    <div className={s.btnRow}>
                      <Btn sm variant="danger" disabled={contentBusy} onClick={() => onQuickReject(c.submissionId)}>Từ chối</Btn>
                      <Btn sm variant="primary" disabled={contentBusy || !c.platformOk} testId="ops-approve-content" onClick={() => void approveContent(c.submissionId)}>Duyệt</Btn>
                    </div>
                  </div>
                ))}
              </Panel>
            </div>
            <Note>Mỗi quyết định Approve/Reject ghi <b>vết audit trong cùng transaction</b> với hành động — không có quyết định thiếu dấu. Duyệt content = tạo đúng <b>một</b> earning PENDING (exactly-once).</Note>
          </div>
        </>
      )}

      {active === "kyc" && <KycReview items={kyc} market={market} busy={kycBusy} err={kycErr} onDecide={decideKyc} />}
      {active === "content" && (
        <ContentReview items={content} market={market} busy={contentBusy} err={contentErr} onApprove={approveContent} onReject={rejectContent} />
      )}
      {active === "creators" && (
        <Panel title={`Người sáng tạo (${market})`}><div className={s.emptyState}><Icon name="users" size={30} /><div style={{ marginTop: 8 }}>Danh bạ creator — cần API tổng hợp (đánh dấu Requires API).</div></div></Panel>
      )}
    </Shell>
  );
}

function KycReview({ items, market, busy, err, onDecide }: {
  items: KycQueueItem[];
  market: Market;
  busy: boolean;
  err: string | null;
  onDecide: (caseId: string, decisions: FieldDecision[]) => void;
}) {
  const [sel, setSel] = useState(0);
  const idx = Math.min(sel, Math.max(items.length - 1, 0));
  const cur = items[idx];
  const [pending, setPending] = useState<Record<string, FieldDecision>>({});

  useEffect(() => {
    setPending({});
  }, [cur?.caseId]);

  if (!cur) {
    return <Panel title="Hồ sơ KYC"><Empty>Không có hồ sơ KYC nào đang chờ duyệt ở {market}.</Empty></Panel>;
  }

  function setDecision(key: string, decision: "ACCEPT" | "NEEDS_CHANGES") {
    if (decision === "NEEDS_CHANGES") {
      const reason = window.prompt("Lý do yêu cầu bổ sung:");
      if (reason === null) return;
      const trimmed = reason.trim();
      if (!trimmed) return;
      setPending((p) => ({ ...p, [key]: { key, decision, reason: trimmed } }));
    } else {
      setPending((p) => ({ ...p, [key]: { key, decision } }));
    }
  }

  const decisionsToSend = Object.values(pending);

  return (
    <div className={s.reviewSplit}>
      <div>
        <div className={s.navLabel} style={{ padding: "0 2px 8px" }}>Hàng đợi · {items.length}</div>
        <div className={s.queueList}>
          {items.map((k, i) => (
            <button key={k.caseId} className={`${s.queueItem} ${i === idx ? s.queueItemActive : ""}`} onClick={() => setSel(i)}>
              <div className={s.queueTop}><span className={s.miniAv} data-m={market}>{k.creatorName.split(" ").slice(-1)[0][0]}</span><b>{k.creatorName}</b></div>
              <div className={s.queueMeta}>{k.pendingFields} field chờ · {k.state === "RESUBMITTED" ? "Nộp lại" : "Lần đầu"}</div>
            </button>
          ))}
        </div>
      </div>
      <Panel title={`Hồ sơ KYC — ${cur.creatorName}`} sub="duyệt theo từng field" action={<Chip tone={cur.state === "RESUBMITTED" ? "info" : "neutral"}>{cur.state === "RESUBMITTED" ? "Nộp lại" : "Lần đầu"}</Chip>}>
        {err && <div style={{ marginBottom: 10 }}><Chip tone="danger">{err}</Chip></div>}
        {cur.fields.map((f) => {
          const decided = pending[f.key];
          return (
            <div key={f.key} style={{ padding: "13px 0", borderBottom: "1px solid var(--line-soft)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div><div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{f.label}</div><div style={{ fontWeight: 600, marginTop: 3 }} className={s.num}>{f.value ?? "—"}</div></div>
                {f.state === "ACCEPTED" ? <Chip tone="ok" icon="check">Đã duyệt</Chip>
                  : decided ? (
                    <Chip tone={decided.decision === "ACCEPT" ? "ok" : "danger"} icon={decided.decision === "ACCEPT" ? "check" : "ban"}>
                      {decided.decision === "ACCEPT" ? "Sẽ duyệt" : "Sẽ yêu cầu sửa"}
                    </Chip>
                  ) : (
                    <div className={s.btnRow}>
                      <Btn sm onClick={() => setDecision(f.key, "NEEDS_CHANGES")}>Từ chối</Btn>
                      <Btn sm variant="primary" onClick={() => setDecision(f.key, "ACCEPT")}>Duyệt</Btn>
                    </div>
                  )}
              </div>
              {f.state === "NEEDS_CHANGES" && f.reason && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 8, display: "flex", gap: 6 }}><Icon name="alert" size={13} /> {f.reason}</div>}
            </div>
          );
        })}
        <div className={s.btnRow} style={{ marginTop: 16 }}>
          <Btn variant="primary" disabled={busy || decisionsToSend.length === 0} onClick={() => onDecide(cur.caseId, decisionsToSend)}>
            <Icon name="check" size={16} /> {busy ? "Đang gửi…" : "Gửi quyết định"}
          </Btn>
        </div>
      </Panel>
    </div>
  );
}

function ContentReview({ items, market, busy, err, onApprove, onReject }: {
  items: ContentQueueItem[];
  market: Market;
  busy: boolean;
  err: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [sel, setSel] = useState(0);
  const [reason, setReason] = useState("");
  const idx = Math.min(sel, Math.max(items.length - 1, 0));
  const cur = items[idx];

  useEffect(() => {
    setReason("");
  }, [cur?.submissionId]);

  if (!cur) {
    return <Panel title="Nội dung"><Empty>Không có nội dung nào đang chờ duyệt ở {market}.</Empty></Panel>;
  }

  return (
    <div className={s.reviewSplit}>
      <div>
        <div className={s.navLabel} style={{ padding: "0 2px 8px" }}>Hàng đợi · {items.length}</div>
        <div className={s.queueList}>
          {items.map((c, i) => (
            <button key={c.submissionId} className={`${s.queueItem} ${i === idx ? s.queueItemActive : ""}`} onClick={() => setSel(i)}>
              <div className={s.queueTop}><span className={s.miniAv} data-m={market}>{c.creatorName.split(" ").slice(-1)[0][0]}</span><b>{c.creatorName}</b></div>
              <div className={s.queueMeta}>{c.campaignTitle} · {c.submittedAt}</div>
              <div className={s.btnRow} style={{ marginTop: 2 }}>
                <Chip tone={c.platformOk ? "ok" : "danger"} icon={c.platformOk ? "check" : "ban"}>Nền tảng</Chip>
                <Chip tone={c.hashtagOk ? "ok" : "warn"} icon={c.hashtagOk ? "check" : "alert"}>Hashtag</Chip>
              </div>
            </button>
          ))}
        </div>
      </div>
      <Panel title={`Nội dung — ${cur.creatorName}`} sub={cur.campaignTitle} action={<Chip tone="neutral">Lần {cur.attemptNo}</Chip>}>
        {err && <div style={{ marginBottom: 10 }}><Chip tone="danger">{err}</Chip></div>}
        <div className={s.kv}><span className={s.k}>Link nộp</span><span className={s.v} style={{ color: "var(--brand-2)" }}>{cur.url}</span></div>
        <div className={s.kv}><span className={s.k}><Icon name="check" size={14} /> Kiểm tra nền tảng</span><span className={s.v}>{cur.platformOk ? <Chip tone="ok" icon="check">Đúng nền tảng</Chip> : <Chip tone="danger" icon="ban">Sai nền tảng</Chip>}</span></div>
        <div className={s.kv}><span className={s.k}><Icon name="check" size={14} /> Kiểm tra hashtag</span><span className={s.v}>{cur.hashtagOk ? <Chip tone="ok" icon="check">Có hashtag</Chip> : <Chip tone="warn" icon="alert">Cảnh báo — có thể trong video</Chip>}</span></div>
        {!cur.platformOk && <div style={{ marginTop: 14 }}><Note warn>Link không thuộc nền tảng yêu cầu — nên từ chối kèm lý do. Từ chối cho creator 24h để sửa; đồng hồ dừng khi Ops đang xem.</Note></div>}
        <div className={s.field} style={{ marginTop: 14 }}>
          <label>Lý do (bắt buộc khi từ chối)</label>
          <input className={s.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Vì sao từ chối nội dung này" />
        </div>
        <div className={s.btnRow} style={{ marginTop: 16 }}>
          <Btn variant="danger" disabled={busy || !reason.trim()} onClick={() => onReject(cur.submissionId, reason.trim())}>
            <Icon name="ban" size={16} /> Từ chối kèm lý do
          </Btn>
          <Btn variant="primary" disabled={busy || !cur.platformOk} testId="ops-approve-content" onClick={() => onApprove(cur.submissionId)}>
            <Icon name="check" size={16} /> Duyệt · tạo 1 earning
          </Btn>
        </div>
      </Panel>
    </div>
  );
}
