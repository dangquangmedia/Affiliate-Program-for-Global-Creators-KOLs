"use client";

import { useState } from "react";
import Link from "next/link";
import { CONTENT_QUEUE, KYC_QUEUE, type Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge, Field, mk } from "../../../../mockup/ui";

type View = "queue" | "approve" | "reject" | "stale";

export default function OpsReviewScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("queue");

  // Ops chỉ thấy hàng đợi của NƯỚC MÌNH (bài toán khó #1) — lọc theo market.
  const kyc = KYC_QUEUE.filter((k) => k.market === market);
  const content = CONTENT_QUEUE.filter((c) => c.market === market);
  const sample = content[0];

  return (
    <Frame screen="V10 Ops review" title="Hàng đợi duyệt (Local Ops)" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> Ops duyệt KYC &amp; content thế nào, và từ chối ra sao?
        → Duyệt/từ chối phải có <strong>lý do</strong>; từ chối content → creator thấy lý do và
        nộp lại (nối sang màn V06). <em>Bài toán khó #7: 2 Ops cùng xử lý 1 item → người sau bị
        chặn (stale/409). Bài toán #3: 1 lần Approve tạo đúng 1 earning.</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "queue", label: "Hàng đợi" },
          { key: "approve", label: "Duyệt content" },
          { key: "reject", label: "Từ chối content" },
          { key: "stale", label: "Xung đột (409)" },
        ]}
      />

      <div style={{ fontSize: 12, color: "#8b96a3", marginBottom: 14 }}>
        Phạm vi: <b style={{ color: "#cfe0ff" }}>Ops {market}</b> — chỉ thấy hồ sơ &amp; content
        của nước {market}. Ops VN không mở được case PH (và ngược lại).
      </div>

      {view === "queue" && (
        <>
          <Card title={`Hàng đợi KYC (${kyc.length})`}>
            <table className={mk.table}>
              <thead>
                <tr><th>Creator</th><th>Nộp lúc</th><th>Trạng thái</th><th></th></tr>
              </thead>
              <tbody>
                {kyc.map((k) => (
                  <tr key={k.id}>
                    <td>{k.creatorName}</td>
                    <td>{k.submittedAt}</td>
                    <td>{k.state === "RESUBMITTED" ? <Badge kind="info">Nộp lại</Badge> : <Badge kind="warn">Chờ duyệt</Badge>}</td>
                    <td><Btn>Xem</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title={`Hàng đợi content (${content.length})`}>
            <table className={mk.table}>
              <thead>
                <tr><th>Creator</th><th>Campaign</th><th>Kiểm tự động</th><th></th></tr>
              </thead>
              <tbody>
                {content.map((c) => {
                  const ok = c.hashtagOk && c.platformOk;
                  return (
                    <tr key={c.id}>
                      <td>{c.creatorName}</td>
                      <td>{c.campaignTitle}</td>
                      <td>{ok ? <Badge kind="success">Đạt sơ bộ</Badge> : <Badge kind="danger">Cần xem</Badge>}</td>
                      <td><Btn onClick={() => setView(ok ? "approve" : "reject")}>Xem</Btn></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {sample && (view === "approve" || view === "reject" || view === "stale") && (
        <Card title={`Content: ${sample.campaignTitle}`} sub={`${sample.creatorName} · ${sample.platform}`}>
          <Field label="Link bài đăng" value={view === "reject" ? "facebook.com/photo/992" : sample.url} locked />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 14px" }}>
            <Badge kind={view === "reject" ? "danger" : "success"}>
              {view === "reject" ? "Sai nền tảng (cần TikTok)" : "Đúng nền tảng"}
            </Badge>
            <Badge kind={view === "reject" ? "danger" : "success"}>
              {view === "reject" ? "Thiếu hashtag" : "Có hashtag bắt buộc"}
            </Badge>
          </div>

          {view === "approve" && (
            <>
              <p style={{ fontSize: 13, color: "#a9b6c4" }}>
                Duyệt sẽ tạo <strong>đúng 1 khoản thu nhập PENDING</strong> cho creator. Bấm 2 lần
                cũng chỉ tạo 1 (idempotent).
              </p>
              <BtnRow>
                <Btn variant="primary">✓ Duyệt (tạo earning)</Btn>
                <Btn variant="ghost" onClick={() => setView("queue")}>Quay lại</Btn>
              </BtnRow>
              <p style={{ fontSize: 12, color: "#6b7684", marginTop: 10 }}>
                → Creator sẽ thấy khoản này ở{" "}
                <Link href="/mockup/creator/earnings" style={{ color: "#6aa6ff" }}>màn Thu nhập (V07)</Link>.
              </p>
            </>
          )}

          {view === "reject" && (
            <>
              <Field label="Lý do từ chối (bắt buộc)" value="Video chưa gắn hashtag bắt buộc trong 3 giây đầu; link không phải TikTok." />
              <BtnRow>
                <Btn variant="danger">Từ chối &amp; gửi lý do</Btn>
                <Btn variant="ghost" onClick={() => setView("queue")}>Quay lại</Btn>
              </BtnRow>
              <p style={{ fontSize: 12, color: "#6b7684", marginTop: 10 }}>
                → Creator sẽ thấy lý do và nộp lại ở{" "}
                <Link href="/mockup/creator/submit" style={{ color: "#6aa6ff" }}>màn Nộp content (V06)</Link>.
                Từ chối KHÔNG tạo earning.
              </p>
            </>
          )}

          {view === "stale" && (
            <>
              <Badge kind="warn">Đã bị xử lý bởi Ops khác</Badge>
              <p style={{ fontSize: 13, color: "#f0c674", marginTop: 10 }}>
                Content này vừa được một Ops khác duyệt/từ chối trước bạn vài giây. Thao tác của
                bạn bị chặn (409 — xung đột phiên bản) để tránh 2 quyết định chồng nhau / tạo tiền
                2 lần. Tải lại hàng đợi để thấy trạng thái mới nhất.
              </p>
              <BtnRow>
                <Btn onClick={() => setView("queue")}>↻ Tải lại hàng đợi</Btn>
              </BtnRow>
            </>
          )}
        </Card>
      )}
    </Frame>
  );
}
