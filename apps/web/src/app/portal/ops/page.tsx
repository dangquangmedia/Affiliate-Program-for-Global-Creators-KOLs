"use client";

import { useState } from "react";
import {
  Shell, MarketStrip, Kpi, Panel, Chip, Btn, Note, Icon, css as s, type NavItem, type Role,
} from "../ui";
import {
  MARKETS, KYC_QUEUE, CONTENT_QUEUE, KYC_FIELDS, type Market,
} from "../../../mockup/data";

const MKT: Market = "VN";
const ROLE: Role = { key: "ops", name: "Trần Ops", scope: "Local Ops · VN", color: "#5ab0f0" };

export default function OpsDashboard() {
  const [showUsd, setShowUsd] = useState(false);
  const [active, setActive] = useState("home");
  const kyc = KYC_QUEUE.filter((k) => k.market === MKT);
  const content = CONTENT_QUEUE.filter((c) => c.market === MKT);
  const nav: NavItem[] = [
    { key: "home", label: "Tổng quan", icon: "home" },
    { key: "kyc", label: "Duyệt KYC", icon: "shield", badge: kyc.length },
    { key: "content", label: "Duyệt nội dung", icon: "fileCheck", badge: content.length },
    { key: "creators", label: "Người sáng tạo", icon: "users" },
  ];

  return (
    <Shell role={ROLE} market={MKT} setMarket={() => {}} marketLocked nav={nav} active={active} setActive={setActive}
      title={nav.find((n) => n.key === active)?.label ?? "Tổng quan"}
      subtitle="Trung tâm duyệt — khoá theo thị trường được phân công"
      user={{ name: "Trần Vận Hành", sub: "Local Ops · VN" }} showUsd={showUsd} setShowUsd={setShowUsd}>

      <MarketStrip market={MKT} note="Local Ops không có công tắc VN/PH — chỉ thấy dữ liệu nước mình" />

      {active === "home" && (
        <>
          <div className={`${s.grid} ${s.kpiGrid}`}>
            <Kpi label="KYC chờ duyệt" icon="shield" tone="warn" value={String(kyc.length)} sub={<>{kyc.filter((k) => k.state === "RESUBMITTED").length} nộp lại</>} />
            <Kpi label="Nội dung chờ duyệt" icon="fileCheck" tone="brand" value={String(content.length)} sub={<>{content.filter((c) => !c.platformOk).length} nghi ngờ nền tảng</>} />
            <Kpi label="Chờ lâu nhất" icon="clock" tone="danger" value="26h" sub={<><Icon name="alert" size={13} /> vượt SLA</>} />
            <Kpi label="Đã xử lý hôm nay" icon="check" tone="ok" value="18" />
          </div>
          <div className={`${s.grid} ${s.g2}`} style={{ marginTop: 22 }}>
            <Panel title="Cần chú ý" sub="ưu tiên xử lý">
              {content.filter((c) => !c.platformOk).map((c) => (
                <div key={c.id} className={s.taskItem} style={{ ["--tone" as string]: "var(--danger)" }}>
                  <span className={s.taskIcon}><Icon name="alert" size={18} /></span>
                  <div className={s.taskBody}><b>{c.creatorName} · {c.campaignTitle}</b><span>Link sai nền tảng: {c.url}</span></div>
                  <Btn sm onClick={() => setActive("content")}>Xem</Btn>
                </div>
              ))}
              <div className={s.taskItem} style={{ ["--tone" as string]: "var(--warn)" }}>
                <span className={s.taskIcon}><Icon name="clock" size={18} /></span>
                <div className={s.taskBody}><b>1 hồ sơ KYC nộp lại</b><span>Cần duyệt lại field ngân hàng đã sửa</span></div>
                <Btn sm onClick={() => setActive("kyc")}>Duyệt</Btn>
              </div>
            </Panel>
            <Note>Mỗi quyết định Approve/Reject ghi <b>vết audit trong cùng transaction</b> với hành động — không có quyết định thiếu dấu. Duyệt content = tạo đúng <b>một</b> earning PENDING (exactly-once).</Note>
          </div>
        </>
      )}

      {active === "kyc" && <KycReview />}
      {active === "content" && <ContentReview />}
      {active === "creators" && (
        <Panel title="Người sáng tạo (VN)"><div className={s.emptyState}><Icon name="users" size={30} /><div style={{ marginTop: 8 }}>Danh bạ creator — cần API tổng hợp (đánh dấu Requires API).</div></div></Panel>
      )}
    </Shell>
  );
}

function KycReview() {
  const items = KYC_QUEUE.filter((k) => k.market === MKT);
  const [sel, setSel] = useState(0);
  const cur = items[sel];
  return (
    <div className={s.reviewSplit}>
      <div>
        <div className={s.navLabel} style={{ padding: "0 2px 8px" }}>Hàng đợi · {items.length}</div>
        <div className={s.queueList}>
          {items.map((k, i) => (
            <button key={k.id} className={`${s.queueItem} ${i === sel ? s.queueItemActive : ""}`} onClick={() => setSel(i)}>
              <div className={s.queueTop}><span className={s.miniAv} data-m={k.market}>{k.creatorName.split(" ").slice(-1)[0][0]}</span><b>{k.creatorName}</b></div>
              <div className={s.queueMeta}>Nộp {k.submittedAt} · {k.state === "RESUBMITTED" ? "Nộp lại" : "Lần đầu"}</div>
            </button>
          ))}
        </div>
      </div>
      <Panel title={`Hồ sơ KYC — ${cur.creatorName}`} sub="duyệt theo từng field" action={<Chip tone={cur.state === "RESUBMITTED" ? "info" : "neutral"}>{cur.state === "RESUBMITTED" ? "Nộp lại" : "Lần đầu"}</Chip>}>
        {KYC_FIELDS.map((f) => (
          <div key={f.key} style={{ padding: "13px 0", borderBottom: "1px solid var(--line-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div><div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>{f.label}</div><div style={{ fontWeight: 600, marginTop: 3 }} className={s.num}>{f.value}</div></div>
              {f.state === "ACCEPTED" ? <Chip tone="ok" icon="check">Đã duyệt</Chip>
                : f.state === "NEEDS_CHANGES" ? <div className={s.btnRow}><Btn sm variant="danger">Từ chối</Btn><Btn sm variant="primary">Duyệt</Btn></div>
                  : <div className={s.btnRow}><Btn sm>Từ chối</Btn><Btn sm variant="primary">Duyệt</Btn></div>}
            </div>
            {f.state === "NEEDS_CHANGES" && f.reason && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 8, display: "flex", gap: 6 }}><Icon name="alert" size={13} /> {f.reason}</div>}
          </div>
        ))}
        <div className={s.btnRow} style={{ marginTop: 16 }}><Btn variant="primary"><Icon name="check" size={16} /> Gửi quyết định</Btn></div>
      </Panel>
    </div>
  );
}

function ContentReview() {
  const items = CONTENT_QUEUE.filter((c) => c.market === MKT);
  const [sel, setSel] = useState(0);
  const cur = items[sel];
  return (
    <div className={s.reviewSplit}>
      <div>
        <div className={s.navLabel} style={{ padding: "0 2px 8px" }}>Hàng đợi · {items.length}</div>
        <div className={s.queueList}>
          {items.map((c, i) => (
            <button key={c.id} className={`${s.queueItem} ${i === sel ? s.queueItemActive : ""}`} onClick={() => setSel(i)}>
              <div className={s.queueTop}><span className={s.miniAv} data-m={c.market}>{c.creatorName.split(" ").slice(-1)[0][0]}</span><b>{c.creatorName}</b></div>
              <div className={s.queueMeta}>{c.campaignTitle} · {c.submittedAt}</div>
              <div className={s.btnRow} style={{ marginTop: 2 }}>
                <Chip tone={c.platformOk ? "ok" : "danger"} icon={c.platformOk ? "check" : "ban"}>Nền tảng</Chip>
                <Chip tone={c.hashtagOk ? "ok" : "warn"} icon={c.hashtagOk ? "check" : "alert"}>Hashtag</Chip>
              </div>
            </button>
          ))}
        </div>
      </div>
      <Panel title={`Nội dung — ${cur.creatorName}`} sub={cur.campaignTitle} action={<Chip tone="neutral">{cur.platform}</Chip>}>
        <div className={s.kv}><span className={s.k}>Link nộp</span><span className={s.v} style={{ color: "var(--brand-2)" }}>{cur.url}</span></div>
        <div className={s.kv}><span className={s.k}><Icon name="check" size={14} /> Kiểm tra nền tảng</span><span className={s.v}>{cur.platformOk ? <Chip tone="ok" icon="check">Đúng {cur.platform}</Chip> : <Chip tone="danger" icon="ban">Sai nền tảng</Chip>}</span></div>
        <div className={s.kv}><span className={s.k}><Icon name="check" size={14} /> Kiểm tra hashtag</span><span className={s.v}>{cur.hashtagOk ? <Chip tone="ok" icon="check">Có hashtag</Chip> : <Chip tone="warn" icon="alert">Cảnh báo — có thể trong video</Chip>}</span></div>
        {!cur.platformOk && <div style={{ marginTop: 14 }}><Note warn>Link không thuộc nền tảng yêu cầu — nên từ chối kèm lý do. Từ chối cho creator 24h để sửa; đồng hồ dừng khi Ops đang xem.</Note></div>}
        <div className={s.btnRow} style={{ marginTop: 16 }}>
          <Btn variant="danger"><Icon name="ban" size={16} /> Từ chối kèm lý do</Btn>
          <Btn variant="primary" disabled={!cur.platformOk}><Icon name="check" size={16} /> Duyệt · tạo 1 earning</Btn>
        </div>
      </Panel>
    </div>
  );
}
