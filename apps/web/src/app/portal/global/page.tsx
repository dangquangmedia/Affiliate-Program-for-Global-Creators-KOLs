"use client";

import { useState } from "react";
import {
  Shell, Kpi, Panel, Chip, Btn, Note, Icon, css as s, type NavItem, type Role,
} from "../ui";
import { MARKETS, COUNTRY_CONFIG, formatMoney, type Market } from "../../../mockup/data";

const ROLE: Role = { key: "global", name: "Hà Global", scope: "Global Admin · toàn cục", color: "#f6b44c" };
const NAV: NavItem[] = [
  { key: "home", label: "Tổng quan", icon: "home" },
  { key: "config", label: "Cấu hình nước", icon: "sliders" },
  { key: "audit", label: "Nhật ký audit", icon: "shield" },
  { key: "roles", label: "Vai & phân quyền", icon: "users" },
];

type AuditRow = { time: string; actor: string; action: string; market: Market; target: string; tone: "ok" | "info" | "warn" | "hold" | "brand" };
const AUDIT: AuditRow[] = [
  { time: "20/07 14:22", actor: "Vũ Finance", action: "PAYOUT_SETTLED", market: "VN", target: "payout · Minh Anh", tone: "ok" },
  { time: "20/07 13:58", actor: "Vũ Finance", action: "RECON_BATCH_LOCKED", market: "VN", target: "batch #B1 · 2 dòng", tone: "info" },
  { time: "20/07 11:40", actor: "Trần Ops", action: "CONTENT_APPROVED", market: "VN", target: "Review son · Minh Anh", tone: "brand" },
  { time: "20/07 10:15", actor: "Maria Ops", action: "KYC_REVIEWED", market: "PH", target: "kyc · Jose Cruz", tone: "info" },
  { time: "20/07 09:33", actor: "Trần Ops", action: "CONTENT_REJECTED", market: "VN", target: "Review son · Phạm Dương", tone: "warn" },
  { time: "19/07 16:02", actor: "Lê Admin", action: "CAMPAIGN_CREATED", market: "VN", target: "Đánh giá cà phê lon", tone: "brand" },
  { time: "19/07 15:10", actor: "Cruz Finance", action: "PAYOUT_RESOLVED", market: "PH", target: "hold · timeout", tone: "hold" },
];

export default function GlobalDashboard() {
  const [showUsd, setShowUsd] = useState(false);
  const [active, setActive] = useState("home");
  const [scope, setScope] = useState<Market | "ALL">("ALL");
  // Global Admin dùng scope 3 giá trị (VN/PH/All) — vai duy nhất thấy "All"; đổ vào Shell qua market.
  const shellMarket: Market = scope === "PH" ? "PH" : "VN";
  const audit = scope === "ALL" ? AUDIT : AUDIT.filter((a) => a.market === scope);

  return (
    <Shell role={ROLE} market={shellMarket} setMarket={(m) => setScope(m)} nav={NAV} active={active} setActive={setActive}
      title={NAV.find((n) => n.key === active)?.label ?? "Tổng quan"}
      subtitle="Vai duy nhất vượt biên giới nước"
      user={{ name: "Hà Toàn Cục", sub: "Global Admin" }} showUsd={showUsd} setShowUsd={setShowUsd}>

      {/* scope 3 giá trị riêng cho Global (Shell chỉ có VN/PH) */}
      <div className={s.mktStrip}>
        <Icon name="globe" size={17} />
        <b>Phạm vi:</b>
        <div className={s.marketSwitch}>
          {(["ALL", "VN", "PH"] as const).map((sc) => (
            <button key={sc} className={`${s.mktBtn} ${scope === sc ? s.mktBtnActive : ""}`} onClick={() => setScope(sc)}>
              {sc === "ALL" ? "🌐 Tất cả" : `${MARKETS[sc].flag} ${sc}`}
            </button>
          ))}
        </div>
        <span className={s.mktSep} />
        <span className={s.dim}>Chỉ Global Admin được xem “Tất cả thị trường”.</span>
      </div>

      {active === "home" && (
        <>
          <div className={`${s.grid} ${s.kpiGrid}`}>
            <Kpi label="Thị trường cấu hình" icon="globe" tone="mkt" value="2" sub={<>VN · PH</>} />
            <Kpi label="Cờ tính năng bật" icon="sliders" tone="brand" value="4" sub={<>trên 6 cờ</>} />
            <Kpi label="Sự kiện audit (24h)" icon="shield" tone="info" value={String(AUDIT.length)} />
            <Kpi label="Cấu hình mới nhất" icon="clock" tone="ok" value="v3" sub={<>VN · hôm nay</>} />
          </div>

          <div className={`${s.grid} ${s.g2}`} style={{ marginTop: 22 }}>
            {(Object.keys(COUNTRY_CONFIG) as Market[]).map((m) => {
              const c = COUNTRY_CONFIG[m];
              return (
                <div key={m} className={s.app} data-market={m} style={{ background: "none", minHeight: 0 }}>
                  <Panel title={`${MARKETS[m].name}`} sub={MARKETS[m].locale} action={<Chip tone="ok" icon="check">Active</Chip>}>
                    <div className={s.kv}><span className={s.k}>Tiền tệ</span><span className={s.v}>{MARKETS[m].currency}</span></div>
                    <div className={s.kv}><span className={s.k}>Thuế (demo)</span><span className={s.v}>{c.taxPercent}%</span></div>
                    <div className={s.kv}><span className={s.k}>Rút tối thiểu</span><span className={s.v}>{formatMoney(c.minPayoutMinor, MARKETS[m].currency)}</span></div>
                    <div className={s.kv}><span className={s.k}>Cờ tính năng</span><span style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {c.features.map((f) => <Chip key={f.key} tone={f.on ? "ok" : "neutral"} icon={f.on ? "check" : "ban"}>{f.label.replace("Bật ", "")}</Chip>)}
                    </span></div>
                  </Panel>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16 }}><Note>Bảng so sánh 2 nước giữ nguyên tiền tệ bản địa — không quy đổi gộp. USD (nếu bật) chỉ là tham chiếu có nhãn, không dùng thanh toán.</Note></div>
        </>
      )}

      {active === "config" && (
        <Panel title={`Cấu hình — ${scope === "PH" ? "Philippines" : "Việt Nam"}`} sub="chỉnh có diff + xác nhận" action={<Chip tone="warn" icon="lock">Save cần API</Chip>}>
          {(() => {
            const m: Market = scope === "PH" ? "PH" : "VN";
            const c = COUNTRY_CONFIG[m];
            return (
              <>
                <div className={s.field}><label>Thuế synthetic (%)</label><input className={s.input} defaultValue={c.taxPercent} /></div>
                <div className={s.field}><label>Mức rút tối thiểu ({MARKETS[m].currency} minor)</label><input className={s.input} defaultValue={c.minPayoutMinor} /></div>
                <div className={s.navLabel} style={{ padding: "4px 2px 8px" }}>Cờ tính năng</div>
                {c.features.map((f) => (
                  <div key={f.key} className={s.kv}><span className={s.k}>{f.label}</span><span className={s.v}><Chip tone={f.on ? "ok" : "neutral"} icon={f.on ? "check" : "ban"}>{f.on ? "Bật" : "Tắt"}</Chip></span></div>
                ))}
                <div className={s.btnRow} style={{ marginTop: 16 }}><Btn variant="primary"><Icon name="check" size={16} /> Lưu (ghi audit)</Btn><Btn variant="ghost">Huỷ</Btn></div>
              </>
            );
          })()}
        </Panel>
      )}

      {active === "audit" && (
        <Panel title="Nhật ký audit" sub={`${audit.length} sự kiện · append-only`} action={<Chip tone="neutral" icon="lock">Không sửa/xoá</Chip>}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Nước</th><th>Đối tượng</th></tr></thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={i}>
                    <td className={s.num}>{a.time}</td>
                    <td>{a.actor}</td>
                    <td><Chip tone={a.tone}>{a.action}</Chip></td>
                    <td>{MARKETS[a.market].flag} {a.market}</td>
                    <td style={{ color: "var(--text-dim)" }}>{a.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14 }}><Note>Mỗi dòng được ghi trong cùng transaction với hành động gốc — quyết định đã rollback không để lại dấu, và không có quyết định nào thiếu dấu (AD-02).</Note></div>
        </Panel>
      )}

      {active === "roles" && (
        <Panel title="Vai & phân quyền" sub="4 vai + cách ly nước">
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Vai</th><th>Phạm vi</th><th>Quyền chính</th></tr></thead>
              <tbody>
                {[
                  ["Local Ops", "1 nước", "Duyệt KYC + nội dung"],
                  ["Local Admin", "1 nước", "Tạo & quản chiến dịch"],
                  ["Local Finance", "1 nước", "Đối soát + chi trả"],
                  ["Global Admin", "Toàn cục", "Cấu hình nước + audit (vượt biên giới)"],
                ].map((r) => (
                  <tr key={r[0]}><td><b style={{ fontWeight: 600 }}>{r[0]}</b></td><td><Chip tone={r[1] === "Toàn cục" ? "warn" : "neutral"}>{r[1]}</Chip></td><td style={{ color: "var(--text-dim)" }}>{r[2]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 14 }}><Note warn>Cross-country → 404, sai vai → 403, transition sai → 409. Local staff bị khoá đúng nước; chỉ Global Admin thấy “Tất cả”.</Note></div>
        </Panel>
      )}
    </Shell>
  );
}
