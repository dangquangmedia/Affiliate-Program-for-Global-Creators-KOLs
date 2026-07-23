"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shell, MarketStrip, Kpi, Panel, Chip, Btn, Note, Empty, Icon, css as s, type NavItem, type Role,
} from "../ui";
import { MARKETS, formatMoney, type Market } from "../../../mockup/data";
import { readPrefMarket } from "../session";
import { listBatches, createBatch, lockBatch, type ReconBatch } from "../../../lib/reconciliation-client";
import { payoutQueue, payoutHolds, settlePayout, resolveHold, type PayoutQueueItem } from "../../../lib/payout-client";

const NAV: NavItem[] = [
  { key: "home", label: "Tổng quan", icon: "home" },
  { key: "recon", label: "Đối soát", icon: "scale" },
  { key: "payout", label: "Hàng đợi chi trả", icon: "coins" },
  { key: "hold", label: "Giữ chờ xác minh", icon: "hold" },
];

export default function FinanceDashboard() {
  const [market] = useState<Market>(readPrefMarket);
  const [showUsd, setShowUsd] = useState(false);
  const [active, setActive] = useState("home");
  const cur = MARKETS[market].currency;
  const fm = (v: number) => formatMoney(v, cur);

  const [batches, setBatches] = useState<ReconBatch[]>([]);
  const [queue, setQueue] = useState<PayoutQueueItem[]>([]);
  const [holds, setHolds] = useState<PayoutQueueItem[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, q, h] = await Promise.all([listBatches(market), payoutQueue(market), payoutHolds(market)]);
      let forbiddenMsg: string | null = null;
      if ("forbidden" in b) {
        setBatches([]);
        forbiddenMsg = "Bạn không có quyền xem đối soát ở thị trường này.";
      } else {
        setBatches(b);
      }
      if ("forbidden" in q) {
        setQueue([]);
        forbiddenMsg = "Bạn không có quyền xem hàng đợi chi trả ở thị trường này.";
      } else {
        setQueue(q);
      }
      if ("forbidden" in h) {
        setHolds([]);
        forbiddenMsg = "Bạn không có quyền xem hàng giữ chờ xác minh ở thị trường này.";
      } else {
        setHolds(h);
      }
      setLoadErr(forbiddenMsg);
    } catch {
      // Lỗi mạng/transport — KHÔNG để hàng đợi trống bị hiểu nhầm là "không có gì cần xử lý".
      setLoadErr("Không tải được dữ liệu, thử lại sau.");
    }
  }, [market]);

  useEffect(() => {
    void load();
  }, [load]);

  const ROLE: Role = { key: "finance", name: "Vũ Finance", scope: `Local Finance · ${market}`, color: "#35d08a" };

  const openBatch = batches.find((b) => b.status === "OPEN");

  const [batchBusy, setBatchBusy] = useState(false);
  const [batchErr, setBatchErr] = useState<string | null>(null);

  async function onCreateBatch() {
    setBatchBusy(true);
    setBatchErr(null);
    try {
      const res = await createBatch(market);
      if (!res.ok) {
        setBatchErr(res.message);
        return;
      }
      await load();
    } catch {
      setBatchErr("Không xử lý được, thử lại sau.");
    } finally {
      setBatchBusy(false);
    }
  }

  async function onLock(id: string) {
    setBatchBusy(true);
    setBatchErr(null);
    try {
      const res = await lockBatch(market, id);
      if (!res.ok) {
        setBatchErr("Không khoá được batch, thử lại sau.");
        return;
      }
      await load();
    } catch {
      setBatchErr("Không xử lý được, thử lại sau.");
    } finally {
      setBatchBusy(false);
    }
  }

  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutErr, setPayoutErr] = useState<string | null>(null);

  async function onSettle(id: string, ok: boolean) {
    setPayoutBusy(true);
    setPayoutErr(null);
    try {
      const res = await settlePayout(market, id, ok ? "SUCCESS" : "FAIL");
      if (!res.ok) {
        setPayoutErr("Không xử lý được payout, thử lại sau.");
        return;
      }
      await load();
    } catch {
      setPayoutErr("Không xử lý được, thử lại sau.");
    } finally {
      setPayoutBusy(false);
    }
  }

  const [holdBusy, setHoldBusy] = useState(false);
  const [holdErr, setHoldErr] = useState<string | null>(null);

  async function onResolve(id: string, ok: boolean) {
    setHoldBusy(true);
    setHoldErr(null);
    try {
      const res = await resolveHold(market, id, ok ? "SUCCESS" : "FAIL");
      if (!res.ok) {
        setHoldErr("Không xử lý được hàng giữ, thử lại sau.");
        return;
      }
      await load();
    } catch {
      setHoldErr("Không xử lý được, thử lại sau.");
    } finally {
      setHoldBusy(false);
    }
  }

  const navWithBadge: NavItem[] = NAV.map((n) => (n.key === "hold" ? { ...n, badge: holds.length } : n));

  return (
    <Shell role={ROLE} market={market} setMarket={() => {}} marketLocked nav={navWithBadge} active={active} setActive={setActive}
      title={NAV.find((n) => n.key === active)?.label ?? "Tổng quan"}
      subtitle="Bàn tài chính — đối soát & chi trả, khoá theo thị trường"
      user={{ name: "Vũ Tài Chính", sub: `Local Finance · ${market}` }} showUsd={showUsd} setShowUsd={setShowUsd}
      variant="passport" headerStamp={{ text: "CÔNG\nVỤ", ok: true }}>

      <MarketStrip market={market} note="Tiền tệ cố định theo nước — không bao giờ cộng gộp VND + PHP" />

      {loadErr && <div style={{ marginBottom: 12 }}><Chip tone="danger">{loadErr}</Chip></div>}

      {active === "home" && (
        <>
          <div className={`${s.grid} ${s.kpiGrid}`}>
            <Kpi label="Batch đang mở" icon="scale" tone="warn" value={String(batches.filter((b) => b.status === "OPEN").length)} sub={<>{openBatch ? `${openBatch.lineCount} dòng` : "chưa có batch mở"}</>} />
            <Kpi label="Net chờ khoá" icon="scale" tone="info" value={fm(openBatch?.totalNetMinor ?? 0)} />
            <Kpi label="Payout đang xử lý" icon="coins" tone="info" value={String(queue.filter((p) => p.state === "PROCESSING").length)} />
            <Kpi label="Giữ chờ xác minh" icon="hold" tone="hold" value={String(holds.length)} sub={<>không tự hoàn</>} />
          </div>
          <div className={`${s.grid} ${s.g2}`} style={{ marginTop: 22 }}>
            <Panel title="Việc cần làm" sub="ưu tiên tiền">
              {openBatch ? (
                <div className={s.taskItem} style={{ ["--tone" as string]: "var(--warn)" }}>
                  <span className={s.taskIcon}><Icon name="scale" size={18} /></span>
                  <div className={s.taskBody}><b>Batch đối soát đang mở</b><span>{openBatch.lineCount} dòng · {fm(openBatch.totalNetMinor)} chờ khoá</span></div>
                  <Btn sm variant="primary" onClick={() => setActive("recon")}>Mở batch</Btn>
                </div>
              ) : (
                <div className={s.taskItem} style={{ ["--tone" as string]: "var(--info)" }}>
                  <span className={s.taskIcon}><Icon name="scale" size={18} /></span>
                  <div className={s.taskBody}><b>Chưa có batch nào đang mở</b><span>Tạo batch mới để gom earning chờ đối soát</span></div>
                  <Btn sm variant="primary" onClick={() => setActive("recon")}>Mở đối soát</Btn>
                </div>
              )}
              {holds.length > 0 && (
                <div className={s.taskItem} style={{ ["--tone" as string]: "var(--hold)" }}>
                  <span className={s.taskIcon}><Icon name="hold" size={18} /></span>
                  <div className={s.taskBody}><b>{holds.length} payout UNKNOWN cần xử lý tay</b><span>Provider không xác nhận — tiền đang giữ an toàn</span></div>
                  <Btn sm onClick={() => setActive("hold")}>Xử lý</Btn>
                </div>
              )}
            </Panel>
            <Note>Khoá batch là <b>bất biến</b>: earning hợp lệ chuyển PENDING → AVAILABLE. Payout FAIL hoàn balance đúng 1 lần; UNKNOWN <b>giữ tiền</b> chờ xác minh, tuyệt đối không tự hoàn (tránh double-pay).</Note>
          </div>
        </>
      )}

      {(active === "home" || active === "payout") && (
        <div data-testid="finance-payout-queue" style={active === "home" ? { marginTop: 22 } : undefined}>
          <Panel title="Hàng đợi chi trả" sub="mock provider · 2 kết cục">
            {payoutErr && <div style={{ marginBottom: 10 }}><Chip tone="danger">{payoutErr}</Chip></div>}
            {queue.length === 0 ? (
              <Empty>Chưa có payout nào đang xử lý ở {MARKETS[market].name}.</Empty>
            ) : (
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead><tr><th>Creator</th><th className={s.amt}>Số tiền</th><th>Trạng thái</th><th style={{ textAlign: "right" }}>Kết cục provider</th></tr></thead>
                  <tbody>
                    {queue.map((p) => (
                      <tr key={p.id}>
                        <td>{p.creatorName}</td>
                        <td className={s.amt}>{formatMoney(p.amountMinor, cur)}</td>
                        <td><Chip tone={p.state === "PROCESSING" ? "info" : "neutral"} icon="clock">{p.state === "PROCESSING" ? "Đang xử lý" : p.state}</Chip></td>
                        <td><div className={s.btnRow} style={{ justifyContent: "flex-end" }}>
                          <Btn sm variant="primary" disabled={payoutBusy} onClick={() => void onSettle(p.id, true)}>Thành công</Btn>
                          <Btn sm variant="danger" disabled={payoutBusy} onClick={() => void onSettle(p.id, false)}>Thất bại (hoàn)</Btn>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 14 }}><Note warn>Mỗi kết cục thay đổi tiền ngay. <b>Thất bại</b> = hoàn balance 1 lần. Provider timeout/không phản hồi được xử lý riêng ở mục Giữ chờ xác minh.</Note></div>
          </Panel>
        </div>
      )}

      {active === "recon" && (
        <Panel title="Batch đối soát" sub={`${batches.length} batch · ${MARKETS[market].name}`}
          action={<Btn sm variant="primary" disabled={batchBusy} testId="finance-create-batch" onClick={() => void onCreateBatch()}>
            <Icon name="plus" size={15} /> {batchBusy ? "Đang xử lý…" : "Tạo batch"}
          </Btn>}>
          {batchErr && <div style={{ marginBottom: 10 }}><Chip tone="danger">{batchErr}</Chip></div>}
          {batches.length === 0 ? (
            <Empty>Chưa có batch đối soát nào ở {MARKETS[market].name}.</Empty>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead><tr><th>Kỳ</th><th>Số dòng</th><th className={s.amt}>Net hợp lệ</th><th>Trạng thái</th><th style={{ textAlign: "right" }}></th></tr></thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td>{b.period}</td>
                      <td>{b.lineCount}</td>
                      <td className={s.amt}>{fm(b.totalNetMinor)}</td>
                      <td>{b.status === "LOCKED" ? <Chip tone="ok" icon="lock">Đã khoá</Chip> : <Chip tone="warn" icon="clock">Đang mở</Chip>}</td>
                      <td style={{ textAlign: "right" }}>
                        {b.status === "OPEN" && (
                          <Btn sm variant="primary" disabled={batchBusy} onClick={() => void onLock(b.id)}>
                            <Icon name="lock" size={14} /> Khoá batch
                          </Btn>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 14 }}><Note>Khoá batch không thể hoàn tác — earning hợp lệ chuyển sang AVAILABLE, bản ghi read-only có link audit append-only.</Note></div>
        </Panel>
      )}

      {active === "hold" && (
        <Panel title="Giữ chờ xác minh (UNKNOWN)" sub="xử lý tay có audit">
          {holdErr && <div style={{ marginBottom: 10 }}><Chip tone="danger">{holdErr}</Chip></div>}
          {holds.length === 0 ? (
            <Empty>Không có payout nào đang giữ chờ xác minh ở {MARKETS[market].name}.</Empty>
          ) : holds.map((h) => (
            <div key={h.id} className={s.taskItem} style={{ ["--tone" as string]: "var(--hold)" }}>
              <span className={s.taskIcon}><Icon name="hold" size={18} /></span>
              <div className={s.taskBody}><b>{h.creatorName} · {formatMoney(h.amountMinor, cur)}</b><span>Provider timeout — tiền vẫn đang reserve, chưa hoàn</span></div>
              <div className={s.btnRow}>
                <Btn sm variant="primary" disabled={holdBusy} onClick={() => void onResolve(h.id, true)}>Xác nhận đã trả</Btn>
                <Btn sm variant="danger" disabled={holdBusy} onClick={() => void onResolve(h.id, false)}>Hoàn balance</Btn>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8 }}><Note>Chỉ resolve khi có bằng chứng từ provider thật. Release vội khi provider đã chuyển tiền = double-pay — đây là lý do UNKNOWN không bao giờ tự động hoàn.</Note></div>
        </Panel>
      )}
    </Shell>
  );
}
