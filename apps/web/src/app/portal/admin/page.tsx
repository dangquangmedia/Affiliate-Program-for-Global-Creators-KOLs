"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shell, MarketStrip, Kpi, Panel, Chip, Btn, Meter, Note, Empty, Icon, css as s, type NavItem, type Role,
} from "../ui";
import {
  MARKETS, formatMoney, TRIGGER_OPTIONS, PRICING_OPTIONS, type Market,
} from "../../../mockup/data";
import { readPrefMarket } from "../session";
import {
  listCampaigns, createCampaign, type CampaignSummary, type CreateCampaignInput,
} from "../../../lib/campaign-client";

const NAV: NavItem[] = [
  { key: "home", label: "Tổng quan", icon: "home" },
  { key: "campaigns", label: "Chiến dịch", icon: "layers" },
  { key: "builder", label: "Tạo chiến dịch", icon: "sliders" },
];

export default function AdminDashboard() {
  const [market] = useState<Market>(readPrefMarket);
  const [showUsd, setShowUsd] = useState(false);
  const [active, setActive] = useState("home");

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const c = await listCampaigns(market);
      if ("unauthorized" in c) {
        setCampaigns([]);
        setLoadErr("Bạn không có quyền xem chiến dịch ở thị trường này.");
      } else {
        setCampaigns(c);
        setLoadErr(null);
      }
    } catch {
      // Lỗi mạng/transport — KHÔNG để danh sách trống bị hiểu nhầm là "chưa có chiến dịch nào".
      setLoadErr("Không tải được dữ liệu, thử lại sau.");
    }
  }, [market]);

  useEffect(() => {
    void load();
  }, [load]);

  const ROLE: Role = { key: "admin", name: "Lê Admin", scope: `Local Admin · ${market}`, color: "#2dd4bf" };
  const cur = MARKETS[market].currency;
  const fm = (v: number) => formatMoney(v, cur);
  const totalSlots = campaigns.reduce((a, c) => a + c.slotsTotal, 0);
  const usedSlots = campaigns.reduce((a, c) => a + c.slotsTaken, 0);
  const budget = campaigns.reduce((a, c) => a + c.slotsTotal * c.rewardMinor, 0);

  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  async function onCreate(input: CreateCampaignInput) {
    if (!input.title.trim() || !input.brand.trim() || !input.platform.trim() || !input.requiredHashtag.trim() || !input.brief.trim()) {
      setCreateErr("Vui lòng điền đầy đủ thông tin bắt buộc (tên, thương hiệu, nền tảng, hashtag, brief).");
      return;
    }
    if (!(input.rewardMinor > 0)) {
      setCreateErr("Đơn giá phải lớn hơn 0.");
      return;
    }
    if (!(input.slotsTotal >= 1)) {
      setCreateErr("Số suất phải từ 1 trở lên.");
      return;
    }
    setCreateBusy(true);
    setCreateErr(null);
    try {
      const res = await createCampaign(market, input);
      if (!res.ok) {
        setCreateErr("Không tạo được chiến dịch, thử lại sau.");
        return;
      }
      await load();
      setActive("campaigns");
    } catch {
      setCreateErr("Không tạo được chiến dịch, thử lại sau.");
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <Shell role={ROLE} market={market} setMarket={() => {}} marketLocked nav={NAV} active={active} setActive={setActive}
      title={NAV.find((n) => n.key === active)?.label ?? "Tổng quan"}
      subtitle="Quản trị chiến dịch — khoá theo thị trường được phân công"
      user={{ name: "Lê Quản Trị", sub: `Local Admin · ${market}` }} showUsd={showUsd} setShowUsd={setShowUsd}
      variant="passport" headerStamp={{ text: "CÔNG\nVỤ", ok: true }}>

      <MarketStrip market={market} note={`Chiến dịch gắn đúng một nước — ${market} không quản campaign nước khác`} />

      {loadErr && <div style={{ marginBottom: 12 }}><Chip tone="danger">{loadErr}</Chip></div>}

      {active !== "builder" && (
        <>
          <div className={`${s.grid} ${s.kpiGrid}`}>
            <Kpi label="Chiến dịch active" icon="layers" tone="ok" value={String(campaigns.filter((c) => c.status === "ACTIVE").length)} sub={<>{campaigns.filter((c) => c.status === "PAUSED").length} tạm dừng</>} />
            <Kpi label="Suất đã dùng" icon="users" tone="brand" value={`${usedSlots}/${totalSlots}`} sub={<>{totalSlots ? Math.round((usedSlots / totalSlots) * 100) : 0}% lấp đầy</>} />
            <Kpi label="Ngân sách cam kết" icon="coins" tone="warn" value={fm(budget)} sub={<>suất × đơn giá</>} />
            <Kpi label="Nội dung chờ duyệt" icon="fileCheck" tone="info" value="3" sub={<>Ops đang xử lý</>} />
          </div>

          <div data-testid="admin-campaign-list">
            <Panel title="Danh sách chiến dịch" sub={`${MARKETS[market].name}`} action={<Btn sm variant="primary" onClick={() => setActive("builder")}><Icon name="plus" size={15} /> Tạo chiến dịch</Btn>}>
              {campaigns.length === 0 ? (
                <Empty>Chưa có chiến dịch nào ở {MARKETS[market].name}.</Empty>
              ) : (
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead><tr><th>Chiến dịch</th><th>Nền tảng</th><th className={s.amt}>Đơn giá</th><th>Suất</th><th className={s.amt}>Ngân sách</th><th>Trạng thái</th></tr></thead>
                    <tbody>
                      {campaigns.map((c) => (
                        <tr key={c.id}>
                          <td><b style={{ fontWeight: 600 }}>{c.title}</b><div className={s.campBrand}>{c.brand}</div></td>
                          <td>{c.platform}</td>
                          <td className={s.amt}>{fm(c.rewardMinor)}</td>
                          <td style={{ minWidth: 130 }}><div style={{ fontSize: 12, marginBottom: 5 }}>{c.slotsTaken}/{c.slotsTotal}</div><Meter taken={c.slotsTaken} total={c.slotsTotal} /></td>
                          <td className={s.amt}>{fm(c.slotsTotal * c.rewardMinor)}</td>
                          <td>{c.status === "ACTIVE" ? <Chip tone={c.full ? "warn" : "ok"} icon={c.full ? "ban" : "check"}>{c.full ? "Đầy suất" : "Active"}</Chip> : <Chip tone="neutral" icon="clock">Tạm dừng</Chip>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
          <div style={{ marginTop: 16 }}><Note>Edit / Pause / Export chiến dịch cần API (đánh dấu Requires API). Phase 1 tập trung luồng tạo + kiểm soát ngân sách tuyệt đối.</Note></div>
        </>
      )}

      {active === "builder" && (
        <Builder cur={cur} fm={fm} busy={createBusy} err={createErr} onCreate={onCreate} />
      )}
    </Shell>
  );
}

const STEPS = ["Thông tin cơ bản", "Brief nội dung", "Quy tắc thưởng", "Suất & Ngân sách", "Xem lại"];

function Builder({ cur, fm, busy, err, onCreate }: {
  cur: string;
  fm: (v: number) => string;
  busy: boolean;
  err: string | null;
  onCreate: (input: CreateCampaignInput) => void;
}) {
  const [step, setStep] = useState(2); // mở sẵn bước Quy tắc thưởng — nơi 3 trục "sống"
  const [title, setTitle] = useState("Review son mùa hè");
  const [brand, setBrand] = useState("GlowUp Cosmetics");
  const [platform, setPlatform] = useState("TikTok");
  const [hashtag, setHashtag] = useState("#GlowUpHe2026");
  const [brief, setBrief] = useState("Quay 1 video ngắn review sản phẩm, gắn hashtag bắt buộc.");
  const [slots, setSlots] = useState(30);
  const [price, setPrice] = useState(500000);
  const budgetPreview = slots * price;
  const init = (brand.trim().slice(0, 2) || "CP").toUpperCase();

  function submit() {
    onCreate({
      title, brand, platform, requiredHashtag: hashtag, brief,
      rewardMinor: Math.floor(price), slotsTotal: Math.floor(slots),
    });
  }

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
            <div className={s.field}><label>Tên chiến dịch</label><input className={s.input} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className={`${s.grid} ${s.g2}`}>
              <div className={s.field}><label>Thương hiệu</label><input className={s.input} value={brand} onChange={(e) => setBrand(e.target.value)} /></div>
              <div className={s.field}><label>Nền tảng</label><input className={s.input} value={platform} onChange={(e) => setPlatform(e.target.value)} /></div>
            </div>
            <div className={s.field}><label>Hashtag bắt buộc</label><input className={s.input} value={hashtag} onChange={(e) => setHashtag(e.target.value)} /></div>
            {step === 1 && (
              <div className={s.field}>
                <label>Brief nội dung</label>
                <textarea className={s.input} rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} />
              </div>
            )}
            {step === 3 && (
              <div className={`${s.grid} ${s.g2}`}>
                <div className={s.field}><label>Số suất</label><input className={s.input} type="number" min={1} step={1} value={slots} onChange={(e) => setSlots(Math.floor(Number(e.target.value)) || 0)} /></div>
                <div className={s.field}>
                  <label>Đơn giá / content — đơn vị nhỏ nhất ({cur})</label>
                  <input className={s.input} type="number" min={0} step={1} value={price} onChange={(e) => setPrice(Math.floor(Number(e.target.value)) || 0)} />
                  <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4 }}>VD nhập 500000 = {fm(500000)}</div>
                </div>
              </div>
            )}
          </Panel>
        )}
      </div>

      {/* live preview + budget */}
      <div className={s.grid} style={{ gap: 16 }}>
        <Panel title="Ngân sách (live)" sub="cap dẫn xuất">
          <div className={`${s.kv} ${s.kvBig}`}><span className={s.k}>Ngân sách tối đa</span><span className={s.v}>{fm(budgetPreview)}</span></div>
          <div className={s.kv}><span className={s.k}>Số suất</span><span className={s.v}>{slots}</span></div>
          <div className={s.kv}><span className={s.k}>Đơn giá</span><span className={s.v}>{fm(price)}</span></div>
          <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 10, textAlign: "center" }}>{slots} × {fm(price)} = {fm(budgetPreview)}</div>
        </Panel>
        <Panel title="Xem trước thẻ campaign" sub="mắt creator sẽ thấy">
          <div className={s.campCard}>
            <div className={s.campCover} style={{ background: "linear-gradient(135deg,#25152e,#3a1f4d)" }}><span className={s.init}>{init}</span><Chip tone="ok" icon="check">Còn suất</Chip></div>
            <div className={s.campBody}>
              <div><div className={s.campTitle}>{title}</div><div className={s.campBrand}>{brand} · {platform}</div></div>
              <div className={s.campReward}>{fm(price)} <small>/ nội dung được duyệt</small></div>
              <Meter taken={0} total={slots || 1} />
              <div className={s.campMeta}><span>{slots}/{slots} suất còn lại</span><span>{hashtag}</span></div>
            </div>
          </div>
          {err && <div style={{ marginTop: 14 }}><Chip tone="danger">{err}</Chip></div>}
          <div className={s.btnRow} style={{ marginTop: 14 }}>
            <Btn variant="primary" block disabled={busy} testId="admin-create-campaign" onClick={submit}>
              <Icon name="check" size={16} /> {busy ? "Đang tạo…" : "Tạo chiến dịch"}
            </Btn>
          </div>
        </Panel>
      </div>
    </div>
  );
}
