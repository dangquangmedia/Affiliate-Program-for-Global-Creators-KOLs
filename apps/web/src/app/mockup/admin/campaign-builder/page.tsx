"use client";

import { useState } from "react";
import Link from "next/link";
import { MARKETS, PRICING_OPTIONS, TRIGGER_OPTIONS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, KV, mk } from "../../../../mockup/ui";
import { mockLogin, saveSession } from "../../../../lib/auth-client";
import { createCampaign, type CampaignDetail } from "../../../../lib/campaign-client";
import { formatMoney } from "../../../../lib/i18n";

export default function CampaignBuilderScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const currency = MARKETS[market].currency;
  const locale = MARKETS[market].locale;

  const [title, setTitle] = useState("Review son mùa hè");
  const [brand, setBrand] = useState("GlowUp Cosmetics");
  const [platform, setPlatform] = useState("TikTok");
  const [hashtag, setHashtag] = useState("#GlowUpHe2026");
  const [price, setPrice] = useState(currency === "VND" ? "500000" : "120000");
  const [slots, setSlots] = useState("30");

  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CampaignDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const priceMinor = Number(price) || 0;
  const slotsN = Number(slots) || 0;
  const budgetCap = priceMinor * slotsN; // ③ trần = suất × đơn giá (tự suy ra)

  async function loginAsAdmin() {
    saveSession(await mockLogin(`admin.${market.toLowerCase()}@demo.affiliate.gl`, `Admin ${market}`));
    setErr(null);
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    setCreated(null);
    try {
      const res = await createCampaign(market, {
        title,
        brand,
        platform,
        requiredHashtag: hashtag,
        brief: "",
        rewardMinor: priceMinor,
        slotsTotal: slotsN,
      });
      if (res.ok) {
        setCreated(res.campaign);
      } else if (res.status === 403) {
        setErr("forbidden");
      } else if (res.status === 401) {
        setErr("unauthorized");
      } else {
        setErr("Dữ liệu chưa hợp lệ (đơn giá & số suất phải > 0).");
      }
    } finally {
      setBusy(false);
    }
  }

  const field = (label: string, value: string, set: (v: string) => void, type = "text") => (
    <div className={mk.field}>
      <label className={mk.fieldLabel}>{label}</label>
      <input className={mk.input} value={value} type={type} onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <Frame screen="V11 Campaign builder" title="Tạo campaign (Local Admin)" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> admin dựng campaign & quy tắc thưởng thế nào? → Quy tắc
        thưởng theo <strong>3 trục</strong> (① điều kiện · ② định giá · ③ trần ngân sách). <em>QĐ-1
        sống trong UI: Phase 1 chỉ bật content-flat; view-gate & CPS hiển thị nhưng khoá. Nút gọi
        API thật, cần vai Local Admin của nước — mở đúng bài toán RBAC + cách ly.</em>
      </Note>

      <div style={{ marginBottom: 12 }}>
        <Btn variant="ghost" onClick={loginAsAdmin}>
          Đăng nhập vai Admin {market}
        </Btn>
      </div>

      {created ? (
        <Card title="Đã tạo campaign">
          <Badge kind="success">ACTIVE</Badge>
          <p style={{ fontSize: 14, color: "#a9b6c4", margin: "10px 0" }}>
            <strong>{created.title}</strong> ({created.currency}) — trần ngân sách{" "}
            {created.reward?.budgetCapMinor != null
              ? formatMoney(created.reward.budgetCapMinor, created.currency, locale)
              : "—"}
            . Creator nước {market} sẽ thấy ở màn Khám phá.
          </p>
          <BtnRow>
            <Btn variant="primary">
              <Link href="/mockup/creator/discover" style={{ color: "#fff", textDecoration: "none" }}>
                Xem ở Khám phá (V04) →
              </Link>
            </Btn>
            <Btn variant="ghost" onClick={() => setCreated(null)}>
              Tạo cái khác
            </Btn>
          </BtnRow>
        </Card>
      ) : (
        <>
          {err === "forbidden" && (
            <div style={{ marginBottom: 12 }}>
              <Badge kind="danger">Cần vai Local Admin {market}</Badge>
              <p style={{ color: "#ff9ba3", fontSize: 13, marginTop: 6 }}>
                Phiên hiện tại không phải Admin nước này. Bấm &quot;Đăng nhập vai Admin {market}&quot; ở trên.
              </p>
            </div>
          )}
          {err === "unauthorized" && (
            <div style={{ marginBottom: 12 }}>
              <Badge kind="danger">Chưa đăng nhập</Badge>
            </div>
          )}
          {err && err !== "forbidden" && err !== "unauthorized" && (
            <div style={{ marginBottom: 12 }}>
              <Badge kind="danger">{err}</Badge>
            </div>
          )}

          <Card title="Thông tin campaign">
            {field("Tên campaign", title, setTitle)}
            {field("Nhãn hàng", brand, setBrand)}
            {field("Nền tảng", platform, setPlatform)}
            {field("Hashtag bắt buộc", hashtag, setHashtag)}
          </Card>

          <Card title="Quy tắc thưởng — 3 trục" sub="Phase 1: ① Content duyệt + ② Flat. Lựa chọn khác khoá (chừa đường).">
            <div style={{ fontSize: 12, color: "#7d8896", marginBottom: 6 }}>① Điều kiện kích hoạt</div>
            <div className={mk.optRow}>
              {TRIGGER_OPTIONS.map((o) => (
                <div key={o.key} className={`${mk.opt} ${o.enabled ? mk.optOn : mk.optDisabled}`}>
                  <span className={mk.optLabel}>
                    {o.label} {o.enabled ? <Badge kind="success">đang dùng</Badge> : <Badge kind="neutral">khoá</Badge>}
                  </span>
                  <span className={mk.optNote}>{o.note}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#7d8896", margin: "12px 0 6px" }}>② Cách định giá</div>
            <div className={mk.optRow}>
              {PRICING_OPTIONS.map((o) => (
                <div key={o.key} className={`${mk.opt} ${o.enabled ? mk.optOn : mk.optDisabled}`}>
                  <span className={mk.optLabel}>
                    {o.label} {o.enabled ? <Badge kind="success">đang dùng</Badge> : <Badge kind="neutral">khoá</Badge>}
                  </span>
                  <span className={mk.optNote}>{o.note}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="③ Ngân sách = số suất × đơn giá" sub="Trần tự suy ra — không nhập tay tổng, tránh lệch.">
            {field(`Đơn giá / content (${currency}, minor)`, price, setPrice, "number")}
            {field("Số suất", slots, setSlots, "number")}
            <KV k="Trần ngân sách (tự tính)" strong>
              {formatMoney(budgetCap, currency, locale)}
            </KV>
            <div style={{ fontSize: 12, color: "#6b7684", marginTop: 6 }}>
              = {formatMoney(priceMinor, currency, locale)} × {slotsN} suất. Vì pricing FLAT nên trần
              CỐ ĐỊNH — không thể vỡ (câu trả lời điểm &quot;cấn&quot; của mentor).
            </div>
          </Card>

          <BtnRow>
            <Btn variant="primary" disabled={busy} onClick={submit}>
              {busy ? "Đang tạo…" : "Tạo campaign (Active)"}
            </Btn>
          </BtnRow>
        </>
      )}
    </Frame>
  );
}
