"use client";

import { useState } from "react";
import {
  Shell, MarketStrip, Kpi, Panel, Chip, Btn, Meter, Note, Icon, css as s, type NavItem, type Role,
} from "../ui";
import {
  MARKETS, campaignsFor, slotsLabel, formatMoney, TRIGGER_OPTIONS, PRICING_OPTIONS, type Market,
} from "../../../mockup/data";

const MKT: Market = "VN";
const ROLE: Role = { key: "admin", name: "Lê Admin", scope: "Local Admin · VN", color: "#2dd4bf" };
const NAV: NavItem[] = [
  { key: "home", label: "Tổng quan", icon: "home" },
  { key: "campaigns", label: "Chiến dịch", icon: "layers" },
  { key: "builder", label: "Tạo chiến dịch", icon: "sliders" },
];

export default function AdminDashboard() {
  const [showUsd, setShowUsd] = useState(false);
  const [active, setActive] = useState("home");
  const list = campaignsFor(MKT);
  const cur = MARKETS[MKT].currency;
  const fm = (v: number) => formatMoney(v, cur);
  const totalSlots = list.reduce((a, c) => a + c.slotsTotal, 0);
  const usedSlots = list.reduce((a, c) => a + c.slotsTaken, 0);
  const budget = list.reduce((a, c) => a + c.slotsTotal * c.rewardMinor, 0);

  return (
    <Shell role={ROLE} market={MKT} setMarket={() => {}} marketLocked nav={NAV} active={active} setActive={setActive}
      title={NAV.find((n) => n.key === active)?.label ?? "Tổng quan"}
      subtitle="Quản trị chiến dịch — khoá theo thị trường VN"
      user={{ name: "Lê Quản Trị", sub: "Local Admin · VN" }} showUsd={showUsd} setShowUsd={setShowUsd}>

      <MarketStrip market={MKT} note="Chiến dịch gắn đúng một nước — VN không quản campaign PH" />

      {active !== "builder" && (
        <>
          <div className={`${s.grid} ${s.kpiGrid}`}>
            <Kpi label="Chiến dịch active" icon="layers" tone="ok" value={String(list.filter((c) => c.status === "ACTIVE").length)} sub={<>{list.filter((c) => c.status === "PAUSED").length} tạm dừng</>} />
            <Kpi label="Suất đã dùng" icon="users" tone="brand" value={`${usedSlots}/${totalSlots}`} sub={<>{Math.round((usedSlots / totalSlots) * 100)}% lấp đầy</>} />
            <Kpi label="Ngân sách cam kết" icon="coins" tone="warn" value={fm(budget)} sub={<>suất × đơn giá</>} />
            <Kpi label="Nội dung chờ duyệt" icon="fileCheck" tone="info" value="3" sub={<>Ops đang xử lý</>} />
          </div>

          <Panel title="Danh sách chiến dịch" sub={`${MARKETS[MKT].name}`} action={<Btn sm variant="primary" onClick={() => setActive("builder")}><Icon name="plus" size={15} /> Tạo chiến dịch</Btn>}>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead><tr><th>Chiến dịch</th><th>Nền tảng</th><th className={s.amt}>Đơn giá</th><th>Suất</th><th className={s.amt}>Ngân sách</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {list.map((c) => {
                    const sl = slotsLabel(c);
                    return (
                      <tr key={c.id}>
                        <td><b style={{ fontWeight: 600 }}>{c.title}</b><div className={s.campBrand}>{c.brand}</div></td>
                        <td>{c.platform}</td>
                        <td className={s.amt}>{fm(c.rewardMinor)}</td>
                        <td style={{ minWidth: 130 }}><div style={{ fontSize: 12, marginBottom: 5 }}>{c.slotsTaken}/{c.slotsTotal}</div><Meter taken={c.slotsTaken} total={c.slotsTotal} /></td>
                        <td className={s.amt}>{fm(c.slotsTotal * c.rewardMinor)}</td>
                        <td>{c.status === "ACTIVE" ? <Chip tone={sl.full ? "warn" : "ok"} icon={sl.full ? "ban" : "check"}>{sl.full ? "Đầy suất" : "Active"}</Chip> : <Chip tone="neutral" icon="clock">Tạm dừng</Chip>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <div style={{ marginTop: 16 }}><Note>Edit / Pause / Export chiến dịch cần API (đánh dấu Requires API). Phase 1 tập trung luồng tạo + kiểm soát ngân sách tuyệt đối.</Note></div>
        </>
      )}

      {active === "builder" && <Builder fm={fm} onDone={() => setActive("campaigns")} />}
    </Shell>
  );
}

const STEPS = ["Thông tin cơ bản", "Brief nội dung", "Quy tắc thưởng", "Suất & Ngân sách", "Xem lại"];

function Builder({ fm, onDone }: { fm: (v: number) => string; onDone: () => void }) {
  const [step, setStep] = useState(2); // mở sẵn bước Quy tắc thưởng — nơi 3 trục "sống"
  const [slots, setSlots] = useState(30);
  const [price, setPrice] = useState(500000);
  const budget = slots * price;

  return (
    <div className={`${s.grid} ${s.split}`}>
      <div className={s.grid} style={{ gap: 16 }}>
        <Panel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            {STEPS.map((label, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`${s.pillBtn} ${i === step ? s.pillBtnOn : ""}`}
                style={i < step ? { color: "var(--ok)" } : undefined}>
                {i < step && <Icon name="check" size={12} />} {i + 1}. {label}
              </button>
            ))}
          </div>
        </Panel>

        {step === 2 ? (
          <>
            <Panel title="Quy tắc thưởng · 3 trục độc lập" sub="Phase 1 chỉ bật content-flat; các trục khác chừa đường">
              <div className={s.navLabel} style={{ padding: "2px 2px 8px" }}>① Trigger — khi nào phát thưởng</div>
              <div className={s.axis} style={{ marginBottom: 16 }}>
                {TRIGGER_OPTIONS.map((o) => (
                  <button key={o.key} className={`${s.axisOpt} ${o.enabled ? s.axisOn : s.axisOff}`} disabled={!o.enabled}>
                    <b>{o.label} {!o.enabled && <Icon name="lock" size={12} />}</b><span>{o.note}</span>
                  </button>
                ))}
              </div>
              <div className={s.navLabel} style={{ padding: "2px 2px 8px" }}>② Pricing — tính tiền thế nào</div>
              <div className={s.axis}>
                {PRICING_OPTIONS.map((o) => (
                  <button key={o.key} className={`${s.axisOpt} ${o.enabled ? s.axisOn : s.axisOff}`} disabled={!o.enabled}>
                    <b>{o.label} {!o.enabled && <Icon name="lock" size={12} />}</b><span>{o.note}</span>
                  </button>
                ))}
              </div>
            </Panel>
            <Note>Trục ③ Cap = <b>Suất × Đơn giá</b>, luôn dẫn xuất — người tạo không nhập tổng ngân sách mâu thuẫn. Đây là cách kiểm soát chi tiêu tuyệt đối của Phase 1.</Note>
          </>
        ) : (
          <Panel title={STEPS[step]}>
            <div className={s.field}><label>Tên chiến dịch</label><input className={s.input} defaultValue="Review son mùa hè" /></div>
            <div className={`${s.grid} ${s.g2}`}>
              <div className={s.field}><label>Thương hiệu</label><input className={s.input} defaultValue="GlowUp Cosmetics" /></div>
              <div className={s.field}><label>Nền tảng</label><input className={s.input} defaultValue="TikTok" /></div>
            </div>
            <div className={s.field}><label>Hashtag bắt buộc</label><input className={s.input} defaultValue="#GlowUpHe2026" /></div>
            {step === 3 && (
              <div className={`${s.grid} ${s.g2}`}>
                <div className={s.field}><label>Số suất</label><input className={s.input} type="number" value={slots} onChange={(e) => setSlots(Number(e.target.value) || 0)} /></div>
                <div className={s.field}><label>Đơn giá / content (VND minor)</label><input className={s.input} type="number" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} /></div>
              </div>
            )}
          </Panel>
        )}
      </div>

      {/* live preview + budget */}
      <div className={s.grid} style={{ gap: 16 }}>
        <Panel title="Ngân sách (live)" sub="cap dẫn xuất">
          <div className={`${s.kv} ${s.kvBig}`}><span className={s.k}>Ngân sách tối đa</span><span className={s.v}>{fm(budget)}</span></div>
          <div className={s.kv}><span className={s.k}>Số suất</span><span className={s.v}>{slots}</span></div>
          <div className={s.kv}><span className={s.k}>Đơn giá</span><span className={s.v}>{fm(price)}</span></div>
          <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 10, textAlign: "center" }}>{slots} × {fm(price)} = {fm(budget)}</div>
        </Panel>
        <Panel title="Xem trước thẻ campaign" sub="mắt creator sẽ thấy">
          <div className={s.campCard}>
            <div className={s.campCover} style={{ background: "linear-gradient(135deg,#25152e,#3a1f4d)" }}><span className={s.init}>GC</span><Chip tone="ok" icon="check">Còn suất</Chip></div>
            <div className={s.campBody}>
              <div><div className={s.campTitle}>Review son mùa hè</div><div className={s.campBrand}>GlowUp Cosmetics · TikTok</div></div>
              <div className={s.campReward}>{fm(price)} <small>/ nội dung được duyệt</small></div>
              <Meter taken={0} total={slots} />
              <div className={s.campMeta}><span>{slots}/{slots} suất còn lại</span><span>#GlowUpHe2026</span></div>
            </div>
          </div>
          <div className={s.btnRow} style={{ marginTop: 14 }}><Btn variant="primary" block onClick={onDone}><Icon name="check" size={16} /> Tạo chiến dịch</Btn></div>
        </Panel>
      </div>
    </div>
  );
}
