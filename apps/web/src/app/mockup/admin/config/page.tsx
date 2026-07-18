"use client";

import { useState } from "react";
import { COUNTRY_CONFIG, MARKETS, formatMoney, type Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge, KV, Field } from "../../../../mockup/ui";

type View = "overview" | "edit";

export default function AdminConfigScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("overview");
  const cfg = COUNTRY_CONFIG[market];

  return (
    <Frame screen="V09 Admin config" title="Cấu hình quốc gia (Global Admin)" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> ai được cấu hình từng nước, và cấu hình gì? → Chỉ{" "}
        <strong>Global Admin</strong> thấy &amp; sửa cấu hình mọi nước (thuế, mức rút tối thiểu,
        bật/tắt tính năng). <em>Đây là vai DUY NHẤT vượt biên giới nước — nhân viên Local chỉ
        thấy nước mình (bài toán khó #1). Mọi thay đổi cấu hình đều ghi audit.</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "overview", label: "Tổng quan" },
          { key: "edit", label: "Sửa cấu hình" },
        ]}
      />

      <div style={{ fontSize: 12, color: "#8b96a3", marginBottom: 14 }}>
        Đang xem: <b style={{ color: "#cfe0ff" }}>{MARKETS[market].flag} {MARKETS[market].name}</b>{" "}
        · đổi VN/PH ở góc phải để thấy cấu hình khác nhau theo nước.
      </div>

      {view === "overview" ? (
        <Card title={`Cấu hình ${MARKETS[market].name}`} sub={`Ngôn ngữ ${MARKETS[market].locale} · tiền tệ ${MARKETS[market].currency}`}>
          <KV k="Thuế (synthetic demo)">{cfg.taxPercent}%</KV>
          <KV k="Rút tối thiểu">{formatMoney(cfg.minPayoutMinor, MARKETS[market].currency)}</KV>
          <div style={{ marginTop: 12, marginBottom: 6, fontSize: 13, color: "#9aa6b3" }}>Tính năng theo nước:</div>
          {cfg.features.map((f) => (
            <KV key={f.key} k={f.label}>
              {f.on ? <Badge kind="success">Bật</Badge> : <Badge kind="neutral">Tắt</Badge>}
            </KV>
          ))}
          <BtnRow>
            <Btn variant="primary" onClick={() => setView("edit")}>Sửa cấu hình</Btn>
          </BtnRow>
        </Card>
      ) : (
        <Card title={`Sửa cấu hình ${MARKETS[market].name}`} sub="Lưu lại sẽ tạo version mới + ghi audit ai sửa, sửa gì, khi nào.">
          <Field label="Thuế (%)" value={String(cfg.taxPercent)} />
          <Field label={`Rút tối thiểu (${MARKETS[market].currency})`} value={String(cfg.minPayoutMinor)} />
          <div style={{ fontSize: 13, color: "#9aa6b3", margin: "6px 0 10px" }}>
            Bật/tắt tính năng (feature flag theo nước — bật/tắt không cần deploy lại):
          </div>
          {cfg.features.map((f) => (
            <KV key={f.key} k={f.label}>
              <Badge kind={f.on ? "success" : "neutral"}>{f.on ? "Bật" : "Tắt"}</Badge>
            </KV>
          ))}
          <BtnRow>
            <Btn variant="primary" onClick={() => setView("overview")}>Lưu (tạo version + audit)</Btn>
            <Btn variant="ghost" onClick={() => setView("overview")}>Huỷ</Btn>
          </BtnRow>
        </Card>
      )}
    </Frame>
  );
}
