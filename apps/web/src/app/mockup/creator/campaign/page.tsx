"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, KV, ContextBanner } from "../../../../mockup/ui";
import { loadSession } from "../../../../lib/auth-client";
import {
  getCampaign,
  joinCampaign,
  leaveCampaign,
  myParticipations,
  type CampaignDetail,
  type Participation,
} from "../../../../lib/campaign-client";
import { formatMoney } from "../../../../lib/i18n";

// Thông báo rõ nguyên nhân theo mã lỗi có kiểu (QĐ-5).
const JOIN_ERROR_MSG: Record<string, string> = {
  SLOT_FULL: "Suất cuối vừa được creator khác giữ trước bạn.",
  KYC_REQUIRED: "Bạn cần hoàn tất KYC (được duyệt) trước khi Join.",
  CAMPAIGN_NOT_JOINABLE: "Campaign đang tạm dừng, đã kết thúc hoặc hết hạn.",
  JOIN_BLOCKED_STRIKE: "Bạn đã bị thu hồi suất nhiều lần ở campaign này nên không thể join lại.",
};
const HOLDING = new Set(["JOINED", "CONTENT_SUBMITTED", "APPROVED", "REJECTED"]);

function isMarket(v: string | null): v is Market {
  return v === "VN" || v === "PH";
}

function CampaignDetailInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const initialMarket = isMarket(params.get("m")) ? (params.get("m") as Market) : "VN";

  const [market, setMarket] = useState<Market>(initialMarket);
  const [status, setStatus] = useState<"loading" | "needLogin" | "missing" | "notFound" | "ready">("loading");
  const [c, setC] = useState<CampaignDetail | null>(null);
  const [joined, setJoined] = useState<Participation | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const locale = MARKETS[market].locale;

  const load = useCallback(async () => {
    if (!id) {
      setStatus("missing");
      return;
    }
    const d = await getCampaign(market, id);
    if (!d) {
      setStatus("notFound");
      return;
    }
    setC(d);
    const mine = await myParticipations(market);
    setJoined(mine.find((p) => p.campaignId === id && HOLDING.has(p.state)) ?? null);
    setStatus("ready");
  }, [id, market]);

  async function doJoin() {
    if (!id) return;
    setJoinBusy(true);
    setJoinError(null);
    try {
      const res = await joinCampaign(market, id);
      if (res.ok) {
        setJoined(res.participation);
        await load();
      } else {
        setJoinError(JOIN_ERROR_MSG[res.code] ?? "Không join được, thử lại sau.");
      }
    } finally {
      setJoinBusy(false);
    }
  }

  async function doLeave() {
    if (!id) return;
    setJoinBusy(true);
    try {
      await leaveCampaign(market, id);
      setJoined(null);
      await load();
    } finally {
      setJoinBusy(false);
    }
  }

  useEffect(() => {
    if (!loadSession()) {
      setStatus("needLogin");
      return;
    }
    setStatus("loading");
    load();
  }, [load]);

  return (
    <Frame screen="V05 Campaign detail + Join" title={c?.title ?? "Chi tiết campaign"} market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> điều khoản là gì, tôi nhận bao nhiêu, có được Join
        không? → Trước khi Join phải thấy rõ tiền thưởng, yêu cầu nội dung, số suất. Nút Join bị
        chặn nếu chưa KYC (QĐ-2) hoặc hết suất (QĐ-3). <em>Bài toán #5: điều khoản được snapshot
        lúc Join — nối ở N10.</em>
      </Note>

      {status === "needLogin" && (
        <Card title="Cần đăng nhập">
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              Đăng nhập
            </Link>
          </p>
        </Card>
      )}
      {status === "loading" && <p style={{ color: "#8b96a3" }}>Đang tải…</p>}
      {status === "missing" && (
        <Card title="Thiếu campaign">
          <p style={{ fontSize: 13 }}>
            Vào từ{" "}
            <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
              màn Khám phá
            </Link>{" "}
            để chọn 1 campaign.
          </p>
        </Card>
      )}
      {status === "notFound" && (
        <Card>
          <Badge kind="danger">Không tìm thấy campaign ở nước {market}</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>
            Campaign này không thuộc nước {market} (cách ly dữ liệu). Quay lại{" "}
            <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
              Khám phá
            </Link>
            .
          </p>
        </Card>
      )}

      {status === "ready" && c && (
        <>
          <ContextBanner market={market} />
          <Card title={`${c.brand} · ${c.platform}`} sub={c.brief}>
            <KV k="Tiền thưởng / content được duyệt" strong>
              {formatMoney(c.rewardMinor, c.currency, locale)}
            </KV>
            <div style={{ height: 8 }} />
            <KV k="Hashtag bắt buộc">{c.requiredHashtag}</KV>
            <KV k="Số suất">
              {c.slotsLeft}/{c.slotsTotal} suất còn lại
            </KV>
            {c.reward && (
              <KV k="Quy tắc thưởng (3 trục)">
                {c.reward.triggerType} · {c.reward.pricingType} · trần{" "}
                {c.reward.budgetCapMinor != null ? formatMoney(c.reward.budgetCapMinor, c.currency, locale) : "—"}
              </KV>
            )}
            <KV k="Trạng thái">
              {c.status === "ACTIVE" && !c.full ? (
                <Badge kind="success">Đang nhận</Badge>
              ) : c.full ? (
                <Badge kind="danger">Đã đầy</Badge>
              ) : (
                <Badge kind="warn">Tạm dừng</Badge>
              )}
            </KV>
          </Card>

          {joined ? (
            <Card title="Đã tham gia" sub="Bạn đã giữ 1 suất — điều khoản đã được snapshot lúc Join.">
              <Badge kind="success">✓ Đang giữ suất ({joined.state})</Badge>
              <p style={{ color: "#a9b6c4", fontSize: 14, margin: "10px 0" }}>
                Snapshot khi Join: {joined.snapshotRewardMinor != null && joined.currency
                  ? formatMoney(joined.snapshotRewardMinor, joined.currency, locale)
                  : "—"}
                {joined.submitDeadlineAt && (
                  <> · hạn nộp bài: {new Date(joined.submitDeadlineAt).toLocaleString(locale)}</>
                )}
                . Bấm Join lại nhiều lần cũng chỉ 1 suất (idempotent).
              </p>
              <BtnRow>
                <Btn variant="primary">
                  <Link href="/mockup/creator/submit" style={{ color: "#fff", textDecoration: "none" }}>
                    Nộp nội dung →
                  </Link>
                </Btn>
                <Btn variant="ghost" disabled={joinBusy} onClick={doLeave}>
                  {joinBusy ? "…" : "Rời suất"}
                </Btn>
              </BtnRow>
            </Card>
          ) : (
            <Card title="Tham gia" sub="Join = giữ 1 suất + snapshot điều khoản (QĐ-2/3/5).">
              {joinError && (
                <div style={{ marginBottom: 10 }}>
                  <Badge kind="danger">{joinError}</Badge>
                  {joinError === JOIN_ERROR_MSG.KYC_REQUIRED && (
                    <p style={{ fontSize: 13, marginTop: 6 }}>
                      →{" "}
                      <Link href="/mockup/creator/kyc" style={{ color: "#6aa6ff" }}>
                        Hoàn tất KYC
                      </Link>
                    </p>
                  )}
                </div>
              )}
              <p style={{ color: "#a9b6c4", fontSize: 14, marginBottom: 10 }}>
                Trước khi Join cần KYC Approved (QĐ-2) và còn suất. Tranh suất cuối được phân xử
                công bằng (ai tới trước) — nếu thua bạn sẽ thấy lý do rõ ràng.
              </p>
              <BtnRow>
                <Btn variant="primary" disabled={joinBusy || c.full || c.status !== "ACTIVE"} onClick={doJoin}>
                  {joinBusy ? "Đang join…" : c.full ? "Đã đầy suất" : "Tham gia campaign"}
                </Btn>
                <Btn variant="ghost">
                  <Link href="/mockup/creator/kyc" style={{ color: "inherit", textDecoration: "none" }}>
                    Kiểm tra KYC
                  </Link>
                </Btn>
              </BtnRow>
            </Card>
          )}
        </>
      )}
    </Frame>
  );
}

export default function CampaignScreen() {
  return (
    <Suspense fallback={<p style={{ padding: 32, color: "#8b96a3" }}>Đang tải…</p>}>
      <CampaignDetailInner />
    </Suspense>
  );
}
