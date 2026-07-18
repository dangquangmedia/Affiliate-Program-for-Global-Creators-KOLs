"use client";

import { useState } from "react";
import {
  MARKETS,
  PRICING_OPTIONS,
  TRIGGER_OPTIONS,
  formatMoney,
  type Market,
  type PricingType,
  type TriggerType,
} from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge, Field, KV, mk } from "../../../../mockup/ui";

type View = "form" | "invalid" | "draft" | "active";

export default function CampaignBuilderScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("form");
  const [trigger, setTrigger] = useState<TriggerType>("CONTENT_APPROVED");
  const [pricing, setPricing] = useState<PricingType>("FLAT");

  const currency = MARKETS[market].currency;
  const priceMinor = currency === "VND" ? 500000 : 120000;
  const slots = 30;
  const budgetCap = priceMinor * slots; // ③ ngân sách = suất × đơn giá (tự suy ra)

  return (
    <Frame screen="V11 Campaign builder" title="Tạo campaign (Local Admin)" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> nhãn hàng/admin dựng campaign và quy tắc thưởng thế nào?
        → Chọn quy tắc thưởng theo <strong>3 trục</strong> (① điều kiện · ② định giá · ③ trần
        ngân sách). <em>Đây là QĐ-1 sống trong UI: Phase 1 chỉ bật content-flat; view-gate &amp;
        CPS hiển thị nhưng khoá — cho mentor thấy đã &quot;chừa đường&quot; chứ không bỏ sót.</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "form", label: "Đang tạo" },
          { key: "invalid", label: "Lỗi hợp lệ" },
          { key: "draft", label: "Đã lưu nháp" },
          { key: "active", label: "Kích hoạt" },
        ]}
      />

      {(view === "form" || view === "invalid") && (
        <>
          <Card title="Thông tin campaign">
            <Field label="Tên campaign" value={view === "invalid" ? "" : "Review son mùa hè"} error={view === "invalid" ? "Bắt buộc nhập tên." : undefined} />
            <Field label="Nhãn hàng" value="GlowUp Cosmetics" />
            <Field label="Nền tảng" value="TikTok" />
            <Field label="Hashtag bắt buộc" value="#GlowUpHe2026" />
          </Card>

          <Card title="Quy tắc thưởng — 3 trục" sub="Phase 1 chạy: ① Content duyệt + ② Flat. Các lựa chọn khác bị khoá (chừa đường mở rộng).">
            <div style={{ fontSize: 12, color: "#7d8896", marginBottom: 6 }}>① Điều kiện kích hoạt</div>
            <div className={mk.optRow}>
              {TRIGGER_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  disabled={!o.enabled}
                  onClick={() => o.enabled && setTrigger(o.key)}
                  className={`${mk.opt} ${trigger === o.key ? mk.optOn : ""} ${!o.enabled ? mk.optDisabled : ""}`}
                >
                  <span className={mk.optLabel}>
                    {o.label} {!o.enabled && <Badge kind="neutral">khoá</Badge>}
                    {o.enabled && <Badge kind="success">đang dùng</Badge>}
                  </span>
                  <span className={mk.optNote}>{o.note}</span>
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "#7d8896", margin: "12px 0 6px" }}>② Cách định giá</div>
            <div className={mk.optRow}>
              {PRICING_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  disabled={!o.enabled}
                  onClick={() => o.enabled && setPricing(o.key)}
                  className={`${mk.opt} ${pricing === o.key ? mk.optOn : ""} ${!o.enabled ? mk.optDisabled : ""}`}
                >
                  <span className={mk.optLabel}>
                    {o.label} {!o.enabled && <Badge kind="neutral">khoá</Badge>}
                    {o.enabled && <Badge kind="success">đang dùng</Badge>}
                  </span>
                  <span className={mk.optNote}>{o.note}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="③ Ngân sách = số suất × đơn giá" sub="Trần ngân sách tự suy ra — không nhập tay tổng, tránh lệch.">
            <Field label={`Đơn giá / content (${currency})`} value={String(priceMinor)} />
            <Field label="Số suất" value={String(slots)} error={view === "invalid" ? "Số suất phải > 0." : undefined} />
            <KV k="Trần ngân sách (tự tính)" strong>
              {formatMoney(budgetCap, currency)}
            </KV>
            <div style={{ fontSize: 12, color: "#6b7684", marginTop: 6 }}>
              = {formatMoney(priceMinor, currency)} × {slots} suất. Vì pricing là FLAT nên trần này
              CỐ ĐỊNH — không thể vỡ (đây là câu trả lời cho điểm &quot;cấn&quot; của mentor).
            </div>
          </Card>

          <BtnRow>
            <Btn variant="primary" onClick={() => setView(view === "invalid" ? "invalid" : "draft")}>
              Lưu nháp
            </Btn>
          </BtnRow>
        </>
      )}

      {view === "draft" && (
        <Card title="Đã lưu nháp">
          <Badge kind="neutral">DRAFT</Badge>
          <p style={{ fontSize: 14, color: "#a9b6c4", marginTop: 10 }}>
            Campaign đang ở trạng thái nháp — creator chưa thấy. Kích hoạt để mở cho creator join.
          </p>
          <BtnRow>
            <Btn variant="primary" onClick={() => setView("active")}>Kích hoạt (Draft → Active)</Btn>
          </BtnRow>
        </Card>
      )}

      {view === "active" && (
        <Card title="Đã kích hoạt">
          <Badge kind="success">ACTIVE</Badge>
          <p style={{ fontSize: 14, color: "#a9b6c4", marginTop: 10 }}>
            Campaign đã mở. Creator nước {market} sẽ thấy ở màn Khám phá (V04). Vòng đời:{" "}
            <b>DRAFT → ACTIVE ↔ PAUSED → CLOSED</b>. Trạng thái &quot;Đầy&quot; là suy ra từ số
            suất, không phải một trạng thái đặt tay.
          </p>
        </Card>
      )}
    </Frame>
  );
}
