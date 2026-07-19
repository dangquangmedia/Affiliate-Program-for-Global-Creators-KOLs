"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Badge, Empty, ContextBanner } from "../../../../mockup/ui";
import { loadSession } from "../../../../lib/auth-client";
import { listCampaigns, type CampaignSummary } from "../../../../lib/campaign-client";
import { formatMoney } from "../../../../lib/i18n";

type Status = "loading" | "needLogin" | "ready";

export default function DiscoverScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<Status>("loading");
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const locale = MARKETS[market].locale;

  const load = useCallback(async () => {
    const res = await listCampaigns(market);
    if ("unauthorized" in res) {
      setStatus("needLogin");
      return;
    }
    setCampaigns(res);
    setStatus("ready");
  }, [market]);

  useEffect(() => {
    if (!loadSession()) {
      setStatus("needLogin");
      return;
    }
    setStatus("loading");
    load();
  }, [load]);

  return (
    <Frame screen="V04 Discover" title="Khám phá campaign" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> có campaign nào ở nước này? → Danh sách gọi API thật,
        <strong> chỉ hiện campaign của nước đang chọn</strong> (đổi VN/PH để thấy khác biệt). Mỗi
        campaign hiện tiền thưởng, số suất còn lại, trạng thái. <em>Bài toán #1 (cách ly) + #3 (số
        suất): &quot;Đầy&quot; suy ra từ suất còn lại, không phải cờ lưu sẵn.</em>
      </Note>

      {status === "needLogin" && (
        <Card title="Bạn cần đăng nhập để khám phá campaign">
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              Đăng nhập
            </Link>
          </p>
        </Card>
      )}

      {status === "loading" && <p style={{ color: "#8b96a3" }}>Đang tải campaign…</p>}

      {status === "ready" && (
        <>
          <ContextBanner market={market} />
          {campaigns.length === 0 ? (
            <Card>
              <Empty icon="🔍">Chưa có campaign nào ở nước {market} lúc này. Quay lại sau nhé.</Empty>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
              {campaigns.map((c) => {
                const joinable = c.status === "ACTIVE" && !c.full;
                return (
                  <Card key={c.id} title={c.title} sub={`${c.brand} · ${c.platform}`}>
                    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                      {formatMoney(c.rewardMinor, c.currency, locale)}
                      <span style={{ fontSize: 12, color: "#8b96a3", fontWeight: 400 }}> / content duyệt</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {c.status === "PAUSED" && <Badge kind="warn">Tạm dừng</Badge>}
                      {c.status === "ENDED" && <Badge kind="neutral">Đã kết thúc</Badge>}
                      {c.full && c.status === "ACTIVE" && <Badge kind="danger">Đã đầy</Badge>}
                      {joinable && <Badge kind="success">Còn nhận</Badge>}
                      <Badge kind="neutral">{c.slotsLeft}/{c.slotsTotal} suất còn lại</Badge>
                    </div>
                    <Link
                      href={`/mockup/creator/campaign?id=${c.id}&m=${market}`}
                      style={{ color: "#6aa6ff", fontSize: 14, textDecoration: "none" }}
                    >
                      Xem chi tiết →
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </Frame>
  );
}
