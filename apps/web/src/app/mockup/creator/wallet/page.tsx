"use client";

import { useState } from "react";
import { MARKETS, availableBalanceMinor, formatMoney, PAYOUT_MIN_MINOR, type Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge, KV, Field, ContextBanner } from "../../../../mockup/ui";

type View = "balance" | "minGuard" | "otp" | "processing" | "paid" | "failedReleased" | "unknownHold";

export default function WalletScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("balance");
  const currency = MARKETS[market].currency;
  const balance = availableBalanceMinor(currency);
  const min = PAYOUT_MIN_MINOR[currency];

  return (
    <Frame screen="V08 Wallet + Payout" title="Ví & rút tiền" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> tôi rút tiền thế nào và nếu lỗi thì tiền có mất không?
        → Rút cần OTP; số tiền được <strong>giữ chỗ (reserve)</strong> khi gửi lệnh. <em>Bài toán
        khó #4 — 3 kết cục của cổng thanh toán: Thành công → PAID; Lỗi xác nhận → hoàn về ví đúng
        1 lần; KHÔNG RÕ (timeout) → GIỮ tiền, không hoàn vội (vì có thể provider thật đã chuyển →
        hoàn = trả 2 lần).</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "balance", label: "Số dư" },
          { key: "minGuard", label: "Dưới mức tối thiểu" },
          { key: "otp", label: "Nhập OTP" },
          { key: "processing", label: "Đang xử lý" },
          { key: "paid", label: "Đã trả" },
          { key: "failedReleased", label: "Lỗi → hoàn" },
          { key: "unknownHold", label: "Không rõ → giữ" },
        ]}
      />

      <ContextBanner market={market} />

      <Card title="Số dư khả dụng">
        <KV k={`Rút được (${currency})`} strong>
          {formatMoney(balance, currency)}
        </KV>
        <KV k="Tối thiểu mỗi lần rút">{formatMoney(min, currency)}</KV>
      </Card>

      {view === "balance" && (
        <BtnRow>
          <Btn variant="primary" onClick={() => setView("otp")} disabled={balance < min}>
            Yêu cầu rút tiền
          </Btn>
        </BtnRow>
      )}

      {view === "minGuard" && (
        <Card>
          <Badge kind="warn">Chưa đủ mức tối thiểu</Badge>
          <p style={{ color: "#f0c674", fontSize: 14, marginTop: 10 }}>
            Số dư khả dụng phải ≥ {formatMoney(min, currency)} mới rút được. Tiếp tục làm content
            để tích luỹ thêm.
          </p>
        </Card>
      )}

      {view === "otp" && (
        <Card title="Xác thực rút tiền" sub="Nhập mã OTP để xác nhận. Ngay khi xác nhận, số tiền được giữ chỗ khỏi số dư.">
          <Field label="Mã OTP (mock hiển thị: 123456)" placeholder="6 chữ số" />
          <BtnRow>
            <Btn variant="primary" onClick={() => setView("processing")}>
              Xác nhận rút
            </Btn>
            <Btn variant="ghost" onClick={() => setView("balance")}>
              Huỷ
            </Btn>
          </BtnRow>
        </Card>
      )}

      {view === "processing" && (
        <Card title="Đang xử lý chi trả">
          <Badge kind="info">Đã giữ chỗ số tiền · chờ cổng thanh toán</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>
            Số tiền đã bị trừ khỏi &quot;khả dụng&quot; và đang chờ provider (mock). Bấm rút nhiều
            lần cũng chỉ tạo 1 lệnh (idempotent). Chọn 1 kết cục bên trên để xem hệ thống xử lý.
          </p>
        </Card>
      )}

      {view === "paid" && (
        <Card title="Chi trả thành công">
          <Badge kind="success">✓ PAID</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>
            Provider xác nhận đã chuyển. Lệnh chuyển sang PAID và ghi vào lịch sử — không thể sửa
            đè. Nếu sau này có hoàn tiền, hệ thống tạo <strong>bút toán đảo</strong> liên kết,
            không xoá lịch sử cũ (bài toán khó #6).
          </p>
        </Card>
      )}

      {view === "failedReleased" && (
        <Card title="Chi trả thất bại">
          <Badge kind="danger">Thất bại → đã hoàn về ví</Badge>
          <p style={{ color: "#ff9ba3", fontSize: 14, marginTop: 10 }}>
            Provider xác nhận <strong>chắc chắn</strong> thất bại (sai số tài khoản). Số tiền giữ
            chỗ được <strong>hoàn về &quot;khả dụng&quot; đúng 1 lần</strong>. Bạn có thể sửa
            thông tin và rút lại — lần rút mới là một lệnh riêng, không ghi đè lệnh cũ.
          </p>
        </Card>
      )}

      {view === "unknownHold" && (
        <Card title="Chưa rõ kết quả">
          <Badge kind="warn">KHÔNG RÕ → đang giữ tiền, chờ đối soát</Badge>
          <p style={{ color: "#f0c674", fontSize: 14, marginTop: 10 }}>
            Provider timeout / không phản hồi rõ ràng. Hệ thống <strong>KHÔNG hoàn tiền vội</strong>
            — vì rất có thể tiền đã được chuyển thật. Số tiền tiếp tục bị giữ chỗ cho tới khi
            Finance đối soát với provider rồi mới quyết định PAID hay hoàn. Đây là điểm khác biệt
            quan trọng nhất với trạng thái &quot;Thất bại&quot; ở trên: hoàn vội = nguy cơ trả 2
            lần.
          </p>
        </Card>
      )}
    </Frame>
  );
}
