"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, Empty, ContextBanner } from "../../../../mockup/ui";
import { loadSession } from "../../../../lib/auth-client";
import { myParticipations, leaveCampaign, type Participation } from "../../../../lib/campaign-client";
import { formatMoney } from "../../../../lib/i18n";

type Status = "loading" | "needLogin" | "ready";

const STATE_BADGE: Record<string, { kind: "success" | "info" | "warn" | "danger" | "neutral"; label: string }> = {
  JOINED: { kind: "success", label: "Đang giữ suất" },
  CONTENT_SUBMITTED: { kind: "info", label: "Chờ Ops duyệt" },
  APPROVED: { kind: "success", label: "Đã duyệt" },
  REJECTED: { kind: "warn", label: "Cần sửa lại" },
  WAITLISTED: { kind: "info", label: "Đang chờ suất" },
  EXPIRED: { kind: "danger", label: "Bị thu hồi (quá hạn)" },
};
const HOLDING = new Set(["JOINED", "CONTENT_SUBMITTED", "REJECTED"]);

export default function MyCampaignsScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<Participation[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const locale = MARKETS[market].locale;

  const load = useCallback(async () => {
    setRows(await myParticipations(market));
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

  async function leave(campaignId: string) {
    setBusy(campaignId);
    try {
      await leaveCampaign(market, campaignId);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Frame screen="My Campaigns" title="Chiến dịch của tôi" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> tôi đang giữ những suất nào, hạn nộp bài đến bao giờ, và
        trạng thái ra sao? <em>Suất giữ mà không nộp đúng hạn (48h) sẽ bị thu hồi để trả cho creator
        khác (QĐ-4) — nên deadline hiển thị rõ để bạn triển khai nhanh.</em>
      </Note>

      {status === "needLogin" && (
        <Card title="Bạn cần đăng nhập">
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              Đăng nhập
            </Link>
          </p>
        </Card>
      )}
      {status === "loading" && <p style={{ color: "#8b96a3" }}>Đang tải…</p>}

      {status === "ready" && (
        <>
          <ContextBanner market={market} />
          {rows.length === 0 ? (
            <Card>
              <Empty icon="📭">
                Bạn chưa tham gia campaign nào ở nước {market}.{" "}
                <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
                  Khám phá campaign →
                </Link>
              </Empty>
            </Card>
          ) : (
            rows.map((p) => {
              const badge = STATE_BADGE[p.state] ?? { kind: "neutral" as const, label: p.state };
              return (
                <Card key={p.campaignId} title={p.campaignTitle ?? p.campaignId}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge kind={badge.kind}>{badge.label}</Badge>
                    {p.snapshotRewardMinor != null && p.currency && (
                      <span style={{ color: "#a9b6c4", fontSize: 14 }}>
                        Thưởng (snapshot): {formatMoney(p.snapshotRewardMinor, p.currency, locale)}
                      </span>
                    )}
                  </div>
                  {p.submitDeadlineAt && p.state === "JOINED" && (
                    <p style={{ color: "#f0c674", fontSize: 13, marginTop: 8 }}>
                      ⏳ Hạn nộp bài: {new Date(p.submitDeadlineAt).toLocaleString(locale)}
                    </p>
                  )}
                  <BtnRow>
                    {p.state === "JOINED" && (
                      <Btn variant="primary">
                        <Link href="/mockup/creator/submit" style={{ color: "#fff", textDecoration: "none" }}>
                          Nộp nội dung →
                        </Link>
                      </Btn>
                    )}
                    {HOLDING.has(p.state) && (
                      <Btn variant="ghost" disabled={busy === p.campaignId} onClick={() => leave(p.campaignId)}>
                        {busy === p.campaignId ? "…" : "Rời suất"}
                      </Btn>
                    )}
                  </BtnRow>
                </Card>
              );
            })
          )}
        </>
      )}
    </Frame>
  );
}
