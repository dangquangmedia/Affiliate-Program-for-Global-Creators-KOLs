"use client";

import { useState } from "react";
import Link from "next/link";
import { EARNINGS, formatMoney, netMinor, toUsdReference, type Earning, type Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Badge, KV, Empty, ContextBanner } from "../../../../mockup/ui";

type View = "list" | "empty";

const statusBadge = (s: Earning["status"]) => {
  switch (s) {
    case "PENDING":
      return <Badge kind="warn">Chờ đối soát</Badge>;
    case "AVAILABLE":
      return <Badge kind="success">Rút được</Badge>;
    case "PAID":
      return <Badge kind="info">Đã trả</Badge>;
    case "REVERSED":
      return <Badge kind="danger">Đã đảo</Badge>;
  }
};

export default function EarningsScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("list");

  return (
    <Frame screen="V07 Earnings" title="Thu nhập" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> tôi kiếm được bao nhiêu, tiền đang ở trạng thái nào,
        bao giờ rút được? → Mỗi khoản hiện rõ <strong>Gross – Thuế – Net</strong> và vòng đời
        <strong> PENDING → AVAILABLE → PAID</strong>. <em>Bài toán khó #2: tiền tính bằng số
        nguyên (minor units), thuế synthetic demo; Net = Gross − Thuế luôn tính lại, không lưu
        rời để tránh lệch.</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "list", label: "Có thu nhập" },
          { key: "empty", label: "Chưa có" },
        ]}
      />

      <ContextBanner market={market} />

      {view === "empty" ? (
        <Card>
          <Empty icon="💸">
            Chưa có thu nhập. Hãy{" "}
            <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
              tham gia campaign
            </Link>{" "}
            và nộp nội dung.
          </Empty>
        </Card>
      ) : (
        EARNINGS.map((e) => (
          <Card key={e.id} title={e.campaignTitle} sub={`Ghi nhận ${e.createdAt}`}>
            <div style={{ marginBottom: 10 }}>{statusBadge(e.status)}</div>
            <KV k="Gross (tổng)">{formatMoney(e.grossMinor, e.currency)}</KV>
            <KV k="Thuế (demo)">− {formatMoney(e.taxMinor, e.currency)}</KV>
            <KV k="Net (thực nhận)" strong>
              {formatMoney(netMinor(e), e.currency)}
            </KV>
            <div style={{ fontSize: 12, color: "#6b7684", marginTop: 4 }}>
              ≈ {toUsdReference(netMinor(e), e.currency)} (tham chiếu, demo)
            </div>
          </Card>
        ))
      )}

      {view === "list" && (
        <p style={{ fontSize: 13, color: "#8b96a3" }}>
          Muốn rút tiền khả dụng? →{" "}
          <Link href="/mockup/creator/wallet" style={{ color: "#6aa6ff" }}>
            Ví &amp; rút tiền
          </Link>
        </p>
      )}
    </Frame>
  );
}
