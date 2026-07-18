"use client";

import { useState } from "react";
import Link from "next/link";
import type { Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge } from "../../../../mockup/ui";

type View = "normal" | "oauthDown" | "sessionExpired";

export default function LoginScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("normal");

  return (
    <Frame screen="V01 Login" title="Đăng nhập" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> làm sao creator vào hệ thống mà không phải tạo mật khẩu
        riêng? → Đăng nhập 1 chạm bằng SSO (mock). 1 tài khoản dùng chung cho nhiều nước; chọn
        nước ở màn kế tiếp. <em>SSO thật được mock có công bố — mentor hỏi thì đây là chỗ cắm
        OAuth Google/TikTok thật sau này.</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "normal", label: "Bình thường" },
          { key: "oauthDown", label: "SSO lỗi" },
          { key: "sessionExpired", label: "Phiên hết hạn" },
        ]}
      />

      {view === "sessionExpired" && (
        <Card>
          <Badge kind="warn">Phiên đã hết hạn</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>
            Bạn đã đăng nhập trước đó nhưng phiên hết hạn. Đăng nhập lại để tiếp tục — không mất
            dữ liệu hồ sơ.
          </p>
        </Card>
      )}

      <Card title="Chào mừng đến Affiliate GLOBAL" sub="Kiếm thu nhập từ nội dung của bạn.">
        {view === "oauthDown" && (
          <div style={{ marginBottom: 12 }}>
            <Badge kind="danger">Không kết nối được nhà cung cấp SSO</Badge>
            <p style={{ color: "#ff9ba3", fontSize: 13, marginTop: 8 }}>
              Dịch vụ đăng nhập đang tạm gián đoạn. Thử lại sau ít phút — đây là lỗi phía nhà
              cung cấp, không phải tài khoản của bạn.
            </p>
          </div>
        )}
        <BtnRow>
          <Btn variant="primary" disabled={view === "oauthDown"}>
            🔵 Đăng nhập với Google
          </Btn>
          <Btn disabled={view === "oauthDown"}>⚫ Đăng nhập với TikTok</Btn>
        </BtnRow>
        {view === "oauthDown" && (
          <BtnRow>
            <Btn variant="ghost">↻ Thử lại</Btn>
          </BtnRow>
        )}
        <p style={{ color: "#6b7684", fontSize: 12, marginTop: 16 }}>
          Bằng việc đăng nhập, bạn đồng ý với điều khoản. (Phase 1: SSO là mock, hiển thị công
          khai để minh bạch.)
        </p>
      </Card>

      {view === "normal" && (
        <p style={{ fontSize: 13, color: "#8b96a3" }}>
          Đăng nhập thành công →{" "}
          <Link href="/mockup/creator/country" style={{ color: "#6aa6ff" }}>
            chọn quốc gia
          </Link>
        </p>
      )}
    </Frame>
  );
}
