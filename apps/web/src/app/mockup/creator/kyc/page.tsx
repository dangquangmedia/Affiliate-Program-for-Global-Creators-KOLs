"use client";

import { useState } from "react";
import Link from "next/link";
import { KYC_FIELDS, type Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge, ContextBanner, Field } from "../../../../mockup/ui";

type View = "draft" | "submitted" | "needsChanges" | "approved" | "providerTimeout";

export default function KycScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("draft");

  return (
    <Frame screen="V03 KYC" title="Xác minh danh tính (KYC)" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> creator đang ở bước nào của KYC, và nếu bị từ chối thì
        sửa gì? → Ops duyệt/từ chối <strong>theo từng field</strong>; khi &quot;cần sửa&quot;,
        chỉ field bị từ chối mới mở lại, các field đã duyệt bị khoá. <em>Vì sao: tránh bắt
        creator nộp lại toàn bộ, và không đánh mất kết quả duyệt cũ. KYC phải Approved mới được
        Join (QĐ-2).</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "draft", label: "Nháp" },
          { key: "submitted", label: "Chờ duyệt" },
          { key: "needsChanges", label: "Cần sửa" },
          { key: "approved", label: "Đã duyệt" },
          { key: "providerTimeout", label: "eKYC timeout" },
        ]}
      />

      <ContextBanner market={market} />

      {view === "submitted" && (
        <Card>
          <Badge kind="info">Đang chờ Ops duyệt</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>
            Hồ sơ đã gửi. Ops nước {market} sẽ duyệt trong thời gian sớm nhất. Bạn không cần làm
            gì thêm lúc này.
          </p>
        </Card>
      )}

      {view === "approved" && (
        <Card>
          <Badge kind="success">✓ Đã duyệt</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>
            Danh tính của bạn đã được xác minh. Bây giờ bạn có thể Join campaign.
          </p>
          <BtnRow>
            <Btn variant="primary">
              <Link href="/mockup/creator/discover" style={{ color: "#fff", textDecoration: "none" }}>
                Khám phá campaign →
              </Link>
            </Btn>
          </BtnRow>
        </Card>
      )}

      {view === "providerTimeout" && (
        <Card>
          <Badge kind="warn">eKYC không phản hồi</Badge>
          <p style={{ color: "#f0c674", fontSize: 14, marginTop: 10 }}>
            Dịch vụ eKYC (mock) chưa trả kết quả. Đây <strong>không phải</strong> là từ chối —
            hệ thống sẽ tự thử lại. Bạn không bị mất hồ sơ đã nộp.
          </p>
          <BtnRow>
            <Btn variant="ghost">↻ Kiểm tra lại</Btn>
          </BtnRow>
        </Card>
      )}

      {(view === "draft" || view === "needsChanges") && (
        <Card
          title="Thông tin định danh"
          sub={
            view === "needsChanges"
              ? "1 mục cần sửa. Các mục đã duyệt đã bị khoá — bạn không cần nhập lại."
              : "Điền các thông tin sau để nộp KYC."
          }
        >
          {KYC_FIELDS.map((f) => {
            // Ở trạng thái needsChanges: field NEEDS_CHANGES mở để sửa + hiện lý do;
            // field ACCEPTED bị khoá. Ở trạng thái draft: mọi field đều nhập được.
            const isRejected = f.state === "NEEDS_CHANGES";
            const locked = view === "needsChanges" && !isRejected;
            return (
              <div key={f.key}>
                <Field
                  label={f.label}
                  value={f.value}
                  placeholder={f.placeholder}
                  locked={locked}
                  error={view === "needsChanges" && isRejected ? f.reason : undefined}
                />
                {locked && <div style={{ marginTop: -8, marginBottom: 12 }}><Badge kind="success">✓ đã duyệt</Badge></div>}
              </div>
            );
          })}
          <BtnRow>
            <Btn variant="primary" onClick={() => setView("submitted")}>
              {view === "needsChanges" ? "Nộp lại mục đã sửa" : "Nộp KYC"}
            </Btn>
          </BtnRow>
        </Card>
      )}
    </Frame>
  );
}
