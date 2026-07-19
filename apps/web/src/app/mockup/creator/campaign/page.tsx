"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MARKETS, type Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, KV, ContextBanner } from "../../../../mockup/ui";
import { loadSession } from "../../../../lib/auth-client";
import { getCampaign, type CampaignDetail } from "../../../../lib/campaign-client";
import { formatMoney } from "../../../../lib/i18n";

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
    setStatus("ready");
  }, [id, market]);

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

          <Card title="Tham gia" sub="Join (giữ suất + snapshot điều khoản) được nối ở N10.">
            <p style={{ color: "#a9b6c4", fontSize: 14 }}>
              Trước khi Join cần KYC Approved (QĐ-2) và còn suất (QĐ-3). Luồng Join thật (idempotent
              + snapshot) sẽ bật ở N10.
            </p>
            <BtnRow>
              <Btn variant="primary" disabled>
                Tham gia campaign (mở ở N10)
              </Btn>
              <Btn variant="ghost">
                <Link href="/mockup/creator/kyc" style={{ color: "inherit", textDecoration: "none" }}>
                  Kiểm tra KYC
                </Link>
              </Btn>
            </BtnRow>
          </Card>
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
