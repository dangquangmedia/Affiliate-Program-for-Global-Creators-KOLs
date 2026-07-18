"use client";

import { useState } from "react";
import Link from "next/link";
import { MARKETS, RECON_LINES, formatMoney, type Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge, KV, mk } from "../../../../mockup/ui";

type View = "recon" | "locked" | "payout" | "paid" | "failed" | "unknown";

export default function FinanceWorkbenchScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("recon");
  const currency = MARKETS[market].currency;

  const lines = RECON_LINES;
  const total = lines.filter((l) => !l.anomaly).reduce((s, l) => s + l.netMinor, 0);

  return (
    <Frame screen="V12 Finance workbench" title="Đối soát & chi trả (Local Finance)" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> Finance chốt số &amp; trả tiền thế nào, lỗi thì xử lý
        ra sao? → Tạo batch đối soát → khoá (lock) để tiền thành &quot;rút được&quot; → xử lý
        payout. <em>Bài toán #6: batch đã khoá là bất biến, sửa bằng bút toán đảo. Bài toán #4:
        payout có 3 kết cục (paid / fail-hoàn / unknown-giữ).</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "recon", label: "Đối soát" },
          { key: "locked", label: "Đã khoá" },
          { key: "payout", label: "Hàng đợi payout" },
          { key: "paid", label: "Paid" },
          { key: "failed", label: "Fail → hoàn" },
          { key: "unknown", label: "Unknown → giữ" },
        ]}
      />

      {(view === "recon" || view === "locked") && (
        <Card
          title={`Batch đối soát kỳ 07/2026 · ${market}`}
          sub={view === "locked" ? "Đã khoá — bất biến. Muốn sửa phải tạo điều chỉnh (bút toán đảo)." : "Kiểm tra từng dòng, xử lý bất thường, rồi khoá."}
        >
          <table className={mk.table}>
            <thead>
              <tr><th>Creator</th><th>Campaign</th><th>Net</th><th>Ghi chú</th></tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.creatorName}</td>
                  <td>{l.campaignTitle}</td>
                  <td>{formatMoney(l.netMinor, l.currency)}</td>
                  <td>{l.anomaly ? <Badge kind="danger">{l.anomaly}</Badge> : <Badge kind="success">OK</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12 }}>
            <KV k="Tổng hợp lệ (loại dòng bất thường)" strong>{formatMoney(total, currency)}</KV>
          </div>
          {view === "recon" ? (
            <BtnRow>
              <Btn variant="primary" onClick={() => setView("locked")}>Khoá batch (chuyển tiền → Rút được)</Btn>
            </BtnRow>
          ) : (
            <>
              <div style={{ marginTop: 10 }}><Badge kind="info">🔒 LOCKED — không sửa trực tiếp</Badge></div>
              <p style={{ fontSize: 13, color: "#a9b6c4", marginTop: 8 }}>
                Các khoản hợp lệ đã chuyển sang <b>AVAILABLE</b> — creator thấy &quot;rút được&quot;
                ở{" "}
                <Link href="/mockup/creator/earnings" style={{ color: "#6aa6ff" }}>màn Thu nhập (V07)</Link>.
              </p>
            </>
          )}
        </Card>
      )}

      {view === "payout" && (
        <Card title="Hàng đợi lệnh rút" sub="Mỗi lệnh đã giữ chỗ (reserve) số tiền. Chọn kết cục provider ở thanh trạng thái.">
          <table className={mk.table}>
            <thead>
              <tr><th>Creator</th><th>Số tiền</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Nguyễn Minh Anh</td>
                <td>{formatMoney(450000, currency)}</td>
                <td><Badge kind="info">Đã giữ chỗ</Badge></td>
                <td><Btn onClick={() => setView("paid")}>Xử lý</Btn></td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {(view === "paid" || view === "failed" || view === "unknown") && (
        <Card title="Xử lý lệnh chi trả · Nguyễn Minh Anh">
          <KV k="Số tiền (đã giữ chỗ)" strong>{formatMoney(450000, currency)}</KV>
          <div style={{ height: 10 }} />

          {view === "paid" && (
            <>
              <Badge kind="success">✓ PAID</Badge>
              <p style={{ fontSize: 13, color: "#a9b6c4", marginTop: 10 }}>
                Provider (mock) xác nhận đã chuyển. Ghi vào lịch sử, không sửa đè. Hoàn tiền sau
                này (nếu có) là <b>bút toán đảo liên kết</b>, không xoá lịch sử (bài toán #6).
              </p>
            </>
          )}
          {view === "failed" && (
            <>
              <Badge kind="danger">Thất bại → hoàn về ví 1 lần</Badge>
              <p style={{ fontSize: 13, color: "#ff9ba3", marginTop: 10 }}>
                Provider xác nhận <b>chắc chắn</b> thất bại. Số tiền giữ chỗ hoàn về &quot;rút
                được&quot; đúng 1 lần. Creator có thể sửa thông tin và rút lại (lệnh mới, không
                ghi đè lệnh cũ).
              </p>
            </>
          )}
          {view === "unknown" && (
            <>
              <Badge kind="warn">KHÔNG RÕ → giữ tiền, chờ đối soát</Badge>
              <p style={{ fontSize: 13, color: "#f0c674", marginTop: 10 }}>
                Provider timeout / không phản hồi rõ. <b>KHÔNG hoàn tiền vội</b> — vì có thể tiền
                đã chuyển thật; hoàn = trả 2 lần. Giữ nguyên reserve tới khi Finance đối soát với
                provider rồi mới quyết PAID hay hoàn. Đây là khác biệt cốt lõi với &quot;Thất
                bại&quot; (bài toán #4).
              </p>
            </>
          )}

          <BtnRow>
            <Btn variant="ghost" onClick={() => setView("payout")}>← Về hàng đợi</Btn>
          </BtnRow>
        </Card>
      )}
    </Frame>
  );
}
