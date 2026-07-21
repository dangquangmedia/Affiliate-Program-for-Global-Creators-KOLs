"use client";

import { useState } from "react";
import {
  Shell, MarketStrip, Kpi, Panel, Chip, Btn, Note, Icon, css as s, type NavItem, type Role,
} from "../ui";
import {
  MARKETS, RECON_LINES, PAYOUT_QUEUE, formatMoney, type Market,
} from "../../../mockup/data";

const MKT: Market = "VN";
const ROLE: Role = { key: "finance", name: "Vũ Finance", scope: "Local Finance · VN", color: "#35d08a" };
const NAV: NavItem[] = [
  { key: "home", label: "Tổng quan", icon: "home" },
  { key: "recon", label: "Đối soát", icon: "scale" },
  { key: "payout", label: "Hàng đợi chi trả", icon: "coins" },
  { key: "hold", label: "Giữ chờ xác minh", icon: "hold", badge: 1 },
];

export default function FinanceDashboard() {
  const [showUsd, setShowUsd] = useState(false);
  const [active, setActive] = useState("home");
  const [locked, setLocked] = useState(false);
  const cur = MARKETS[MKT].currency;
  const fm = (v: number) => formatMoney(v, cur);
  const lines = RECON_LINES.filter((l) => l.currency === cur);
  const valid = lines.filter((l) => !l.anomaly);
  const validTotal = valid.reduce((a, l) => a + l.netMinor, 0);
  const anomalies = lines.filter((l) => l.anomaly);

  return (
    <Shell role={ROLE} market={MKT} setMarket={() => {}} marketLocked nav={NAV} active={active} setActive={setActive}
      title={NAV.find((n) => n.key === active)?.label ?? "Tổng quan"}
      subtitle="Bàn tài chính — đối soát & chi trả, khoá theo VN"
      user={{ name: "Vũ Tài Chính", sub: "Local Finance · VN" }} showUsd={showUsd} setShowUsd={setShowUsd}>

      <MarketStrip market={MKT} note="Tiền tệ cố định theo nước — không bao giờ cộng gộp VND + PHP" />

      {active === "home" && (
        <>
          <div className={`${s.grid} ${s.kpiGrid}`}>
            <Kpi label="Net chờ đối soát" icon="scale" tone="warn" value={fm(validTotal)} sub={<>{valid.length} dòng hợp lệ</>} />
            <Kpi label="Bất thường" icon="alert" tone="danger" value={String(anomalies.length)} sub={<>loại khỏi tổng</>} />
            <Kpi label="Payout đang xử lý" icon="coins" tone="info" value={String(PAYOUT_QUEUE.filter((p) => p.state === "PROCESSING").length)} />
            <Kpi label="Giữ chờ xác minh" icon="hold" tone="hold" value="1" sub={<>không tự hoàn</>} />
          </div>
          <div className={`${s.grid} ${s.g2}`} style={{ marginTop: 22 }}>
            <Panel title="Việc cần làm" sub="ưu tiên tiền">
              <div className={s.taskItem} style={{ ["--tone" as string]: "var(--warn)" }}>
                <span className={s.taskIcon}><Icon name="scale" size={18} /></span>
                <div className={s.taskBody}><b>Batch đối soát đang mở</b><span>{valid.length} dòng · {fm(validTotal)} chờ khoá</span></div>
                <Btn sm variant="primary" onClick={() => setActive("recon")}>Mở batch</Btn>
              </div>
              <div className={s.taskItem} style={{ ["--tone" as string]: "var(--hold)" }}>
                <span className={s.taskIcon}><Icon name="hold" size={18} /></span>
                <div className={s.taskBody}><b>1 payout UNKNOWN cần xử lý tay</b><span>Provider không xác nhận — tiền đang giữ an toàn</span></div>
                <Btn sm onClick={() => setActive("hold")}>Xử lý</Btn>
              </div>
            </Panel>
            <Note>Khoá batch là <b>bất biến</b>: earning hợp lệ chuyển PENDING → AVAILABLE. Payout FAIL hoàn balance đúng 1 lần; UNKNOWN <b>giữ tiền</b> chờ xác minh, tuyệt đối không tự hoàn (tránh double-pay).</Note>
          </div>
        </>
      )}

      {active === "recon" && (
        <Panel title="Batch đối soát #2026-07-B1" sub={`${lines.length} dòng · ${MARKETS[MKT].name}`}
          action={locked ? <Chip tone="ok" icon="lock">Đã khoá</Chip> : <Chip tone="warn" icon="clock">Đang mở</Chip>}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Creator</th><th>Chiến dịch</th><th className={s.amt}>Net</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} style={l.anomaly ? { background: "var(--danger-soft)" } : undefined}>
                    <td>{l.creatorName}</td>
                    <td>{l.campaignTitle}</td>
                    <td className={s.amt}>{fm(l.netMinor)}</td>
                    <td>{l.anomaly ? <Chip tone="danger" icon="alert">{l.anomaly}</Chip> : <Chip tone="ok" icon="check">Hợp lệ</Chip>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={s.kv} style={{ marginTop: 14 }}><span className={s.k}>Tổng hợp lệ (loại {anomalies.length} bất thường)</span><span className={s.v} style={{ fontSize: 17 }}>{fm(validTotal)}</span></div>
          <div className={s.btnRow} style={{ marginTop: 14 }}>
            <Btn variant="primary" disabled={locked} onClick={() => setLocked(true)}><Icon name="lock" size={16} /> {locked ? "Đã khoá batch" : "Khoá batch (không thể hoàn tác)"}</Btn>
            <Btn>Export đối soát</Btn>
          </div>
          {locked && <div style={{ marginTop: 14 }}><Note>Batch đã khoá lúc 20/07 · {valid.length} earning chuyển sang AVAILABLE. Bản ghi read-only, có link audit append-only.</Note></div>}
        </Panel>
      )}

      {active === "payout" && (
        <Panel title="Hàng đợi chi trả" sub="mock provider · 3 kết cục">
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Creator</th><th className={s.amt}>Số tiền</th><th>Trạng thái</th><th style={{ textAlign: "right" }}>Kết cục provider</th></tr></thead>
              <tbody>
                {PAYOUT_QUEUE.map((p) => (
                  <tr key={p.id}>
                    <td>{p.creatorName}</td>
                    <td className={s.amt}>{fm(p.amountMinor)}</td>
                    <td><Chip tone={p.state === "PROCESSING" ? "info" : "neutral"} icon="clock">{p.state === "PROCESSING" ? "Đang xử lý" : "Đã reserve"}</Chip></td>
                    <td><div className={s.btnRow} style={{ justifyContent: "flex-end" }}>
                      <Btn sm variant="primary">Success</Btn>
                      <Btn sm variant="danger">Fail</Btn>
                      <Btn sm>Unknown</Btn>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14 }}><Note warn>Mỗi kết cục có xác nhận giải thích hệ quả tiền trước khi chạy. <b>Fail</b> = hoàn balance 1 lần. <b>Unknown</b> = chuyển sang hàng giữ, không tự hoàn.</Note></div>
        </Panel>
      )}

      {active === "hold" && (
        <Panel title="Giữ chờ xác minh (UNKNOWN)" sub="xử lý tay có audit">
          <div className={s.taskItem} style={{ ["--tone" as string]: "var(--hold)" }}>
            <span className={s.taskIcon}><Icon name="hold" size={18} /></span>
            <div className={s.taskBody}><b>Trần Bảo · {fm(720000)}</b><span>Provider timeout 18/07 — tiền vẫn đang reserve, chưa hoàn</span></div>
            <div className={s.btnRow}><Btn sm variant="primary">Xác nhận đã trả</Btn><Btn sm variant="danger">Hoàn balance</Btn></div>
          </div>
          <div style={{ marginTop: 8 }}><Note>Chỉ resolve khi có bằng chứng từ provider thật. Release vội khi provider đã chuyển tiền = double-pay — đây là lý do UNKNOWN không bao giờ tự động hoàn.</Note></div>
        </Panel>
      )}
    </Shell>
  );
}
