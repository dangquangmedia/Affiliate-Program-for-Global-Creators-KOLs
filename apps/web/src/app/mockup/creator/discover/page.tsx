"use client";

import { useState } from "react";
import Link from "next/link";
import { campaignsFor, formatMoney, slotsLabel, type Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Badge, Skeleton, Empty, ContextBanner } from "../../../../mockup/ui";

type View = "list" | "loading" | "empty";

export default function DiscoverScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("list");
  const campaigns = campaignsFor(market);

  return (
    <Frame screen="V04 Discover" title="Khám phá campaign" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> có campaign nào phù hợp với tôi ở nước này, và tôi có
        đủ điều kiện tham gia không? → Danh sách <strong>chỉ hiện campaign của nước đang chọn</strong>
        (đổi VN/PH ở góc phải để thấy khác biệt). Mỗi campaign hiện tiền thưởng, số suất còn
        lại, trạng thái. <em>Bài toán khó #1 (cách ly) + #3 (số suất) nhìn thấy được ngay ở đây.</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "list", label: "Có campaign" },
          { key: "loading", label: "Đang tải" },
          { key: "empty", label: "Trống" },
        ]}
      />

      <ContextBanner market={market} />

      {view === "loading" && (
        <>
          <Card><Skeleton rows={2} /></Card>
          <Card><Skeleton rows={2} /></Card>
        </>
      )}

      {view === "empty" && (
        <Card>
          <Empty icon="🔍">Chưa có campaign nào ở nước {market} lúc này. Quay lại sau nhé.</Empty>
        </Card>
      )}

      {view === "list" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {campaigns.map((c) => {
            const slots = slotsLabel(c);
            const joinable = c.status === "ACTIVE" && !slots.full;
            return (
              <Card key={c.id} title={c.title} sub={`${c.brand} · ${c.platform}`}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                  {formatMoney(c.rewardMinor, c.currency)}
                  <span style={{ fontSize: 12, color: "#8b96a3", fontWeight: 400 }}> / content duyệt</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {c.status === "PAUSED" && <Badge kind="warn">Tạm dừng</Badge>}
                  {c.status === "ENDED" && <Badge kind="neutral">Đã kết thúc</Badge>}
                  {slots.full && c.status === "ACTIVE" && <Badge kind="danger">Đã đầy</Badge>}
                  {joinable && <Badge kind="success">Còn nhận</Badge>}
                  <Badge kind="neutral">{slots.text}</Badge>
                </div>
                <Link
                  href="/mockup/creator/campaign"
                  style={{ color: "#6aa6ff", fontSize: 14, textDecoration: "none" }}
                >
                  Xem chi tiết →
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </Frame>
  );
}
