"use client";

import { useState } from "react";
import Link from "next/link";
import { CAMPAIGNS, formatMoney, slotsLabel, toUsdReference, type Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge, KV, UsdRef, ContextBanner } from "../../../../mockup/ui";

type View = "detail" | "kycGuard" | "confirm" | "full" | "joined";

export default function CampaignScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("detail");

  // Lấy 1 campaign của market hiện tại làm ví dụ chi tiết.
  const c = CAMPAIGNS.find((x) => x.market === market && x.status === "ACTIVE") ?? CAMPAIGNS[0];
  const slots = slotsLabel(c);

  return (
    <Frame screen="V05 Campaign detail + Join" title={c.title} market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> điều khoản là gì, tôi nhận bao nhiêu, có được Join
        không? → Trước khi Join phải thấy rõ tiền thưởng, yêu cầu nội dung, số suất. Nút Join bị
        chặn nếu chưa KYC (QĐ-2) hoặc hết suất (QĐ-3). <em>Bài toán khó #5: điều khoản được
        &quot;chụp ảnh&quot; (snapshot) lúc Join — admin sửa sau không ảnh hưởng bạn.</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "detail", label: "Chi tiết" },
          { key: "kycGuard", label: "Chưa KYC" },
          { key: "confirm", label: "Xác nhận Join" },
          { key: "full", label: "Hết suất" },
          { key: "joined", label: "Đã join" },
        ]}
      />

      <ContextBanner market={market} />

      <Card title={`${c.brand} · ${c.platform}`} sub={c.brief}>
        <KV k="Tiền thưởng / content được duyệt" strong>
          {formatMoney(c.rewardMinor, c.currency)}
        </KV>
        <UsdRef>{toUsdReference(c.rewardMinor, c.currency)}</UsdRef>
        <div style={{ height: 8 }} />
        <KV k="Hashtag bắt buộc">{c.requiredHashtag}</KV>
        <KV k="Số suất">{slots.text}</KV>
        <KV k="Trạng thái">
          {c.status === "ACTIVE" && !slots.full ? (
            <Badge kind="success">Đang nhận</Badge>
          ) : slots.full ? (
            <Badge kind="danger">Đã đầy</Badge>
          ) : (
            <Badge kind="warn">Tạm dừng</Badge>
          )}
        </KV>
      </Card>

      {view === "detail" && (
        <BtnRow>
          <Btn variant="primary" onClick={() => setView("confirm")}>
            Tham gia campaign
          </Btn>
        </BtnRow>
      )}

      {view === "kycGuard" && (
        <Card>
          <Badge kind="warn">Cần hoàn tất KYC trước khi Join</Badge>
          <p style={{ color: "#f0c674", fontSize: 14, marginTop: 10 }}>
            Join là cam kết tài chính (giữ 1 suất, sẽ trả tiền), nên bạn cần xác minh danh tính
            trước. Vì sao chặn ở đây chứ không ở lúc rút tiền? → để bạn không mất công làm content
            rồi mới biết không nhận được tiền.
          </p>
          <BtnRow>
            <Btn variant="primary">
              <Link href="/mockup/creator/kyc" style={{ color: "#fff", textDecoration: "none" }}>
                Hoàn tất KYC →
              </Link>
            </Btn>
          </BtnRow>
        </Card>
      )}

      {view === "confirm" && (
        <Card title="Xác nhận tham gia" sub="Điều khoản dưới đây sẽ được chụp lại (snapshot) và không đổi kể cả khi campaign sửa sau này.">
          <KV k="Bạn sẽ nhận (nếu content được duyệt)" strong>
            {formatMoney(c.rewardMinor, c.currency)}
          </KV>
          <KV k="Yêu cầu">{c.requiredHashtag} · {c.platform}</KV>
          <BtnRow>
            <Btn variant="primary" onClick={() => setView("joined")}>
              Đồng ý &amp; Join
            </Btn>
            <Btn variant="ghost" onClick={() => setView("detail")}>
              Quay lại
            </Btn>
          </BtnRow>
        </Card>
      )}

      {view === "full" && (
        <Card>
          <Badge kind="danger">Campaign đã đầy suất</Badge>
          <p style={{ color: "#ff9ba3", fontSize: 14, marginTop: 10 }}>
            Rất tiếc, campaign này đã đủ người tham gia. &quot;Đầy&quot; là trạng thái suy ra từ
            số suất còn lại (= 0), không phải do admin đặt tay — nên luôn chính xác.
          </p>
        </Card>
      )}

      {view === "joined" && (
        <Card>
          <Badge kind="success">✓ Đã tham gia</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>
            Bạn đã giữ 1 suất. Điều khoản đã được snapshot. Bấm Join lại nhiều lần cũng chỉ tính
            1 lần (idempotent) — không bị trừ 2 suất.
          </p>
          <BtnRow>
            <Btn variant="primary">
              <Link href="/mockup/creator/submit" style={{ color: "#fff", textDecoration: "none" }}>
                Nộp nội dung →
              </Link>
            </Btn>
          </BtnRow>
        </Card>
      )}
    </Frame>
  );
}
