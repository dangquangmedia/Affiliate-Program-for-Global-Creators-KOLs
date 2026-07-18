"use client";

import { useState } from "react";
import Link from "next/link";
import type { Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge, Field, ContextBanner } from "../../../../mockup/ui";

type View = "empty" | "urlError" | "inReview" | "rejected" | "approved";

export default function SubmitScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("empty");

  return (
    <Frame screen="V06 Nộp content" title="Nộp & theo dõi nội dung" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> tôi nộp bài đã đăng ở đâu, và bài đang được duyệt tới
        đâu? → Dán link bài post, hệ thống kiểm cơ bản (đúng nền tảng, có hashtag), Ops duyệt.
        Nếu bị từ chối phải có <strong>lý do</strong> và cho nộp lại. <em>Bài toán khó #3 &amp;
        #7: 1 lần duyệt tạo đúng 1 khoản thu nhập; duyệt lại/nộp lại không nhân đôi tiền.</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "empty", label: "Chưa nộp" },
          { key: "urlError", label: "Link lỗi" },
          { key: "inReview", label: "Đang duyệt" },
          { key: "rejected", label: "Bị từ chối" },
          { key: "approved", label: "Đã duyệt" },
        ]}
      />

      <ContextBanner market={market} />

      {(view === "empty" || view === "urlError") && (
        <Card title="Nộp link bài đăng" sub="Bài phải công khai, đúng nền tảng, có hashtag bắt buộc #GlowUpHe2026.">
          <Field
            label="Link bài đăng"
            placeholder="https://tiktok.com/@ban/video/..."
            value={view === "urlError" ? "https://facebook.com/photo/123" : undefined}
            error={
              view === "urlError"
                ? "Link không đúng nền tảng yêu cầu (cần TikTok) hoặc thiếu hashtag #GlowUpHe2026."
                : undefined
            }
          />
          <BtnRow>
            <Btn variant="primary" onClick={() => setView("inReview")}>
              Nộp để duyệt
            </Btn>
          </BtnRow>
        </Card>
      )}

      {view === "inReview" && (
        <Card title="Đang chờ duyệt">
          <Badge kind="info">Ops đang xem xét</Badge>
          <Timeline
            steps={[
              { label: "Đã nộp", done: true },
              { label: "Đang duyệt", done: true, active: true },
              { label: "Kết quả", done: false },
            ]}
          />
        </Card>
      )}

      {view === "rejected" && (
        <Card title="Cần chỉnh sửa">
          <Badge kind="danger">Bị từ chối — có thể nộp lại</Badge>
          <p style={{ color: "#ff9ba3", fontSize: 14, marginTop: 10 }}>
            <strong>Lý do từ Ops:</strong> Video chưa gắn hashtag bắt buộc trong 3 giây đầu. Vui
            lòng chỉnh và nộp lại link mới.
          </p>
          <Timeline
            steps={[
              { label: "Đã nộp", done: true },
              { label: "Đã duyệt", done: true },
              { label: "Từ chối (có lý do)", done: true, danger: true },
            ]}
          />
          <BtnRow>
            <Btn variant="primary" onClick={() => setView("empty")}>
              Nộp lại
            </Btn>
          </BtnRow>
        </Card>
      )}

      {view === "approved" && (
        <Card title="Đã được duyệt 🎉">
          <Badge kind="success">Duyệt thành công</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>
            Nội dung được duyệt → hệ thống tạo <strong>1 khoản thu nhập PENDING</strong> (đúng 1
            lần). Xem ở màn Thu nhập.
          </p>
          <Timeline
            steps={[
              { label: "Đã nộp", done: true },
              { label: "Đã duyệt", done: true },
              { label: "Approved → +thu nhập", done: true, success: true },
            ]}
          />
          <BtnRow>
            <Btn variant="primary">
              <Link href="/mockup/creator/earnings" style={{ color: "#fff", textDecoration: "none" }}>
                Xem thu nhập →
              </Link>
            </Btn>
          </BtnRow>
        </Card>
      )}
    </Frame>
  );
}

function Timeline({
  steps,
}: {
  steps: { label: string; done: boolean; active?: boolean; danger?: boolean; success?: boolean }[];
}) {
  return (
    <div style={{ marginTop: 14 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: s.danger ? "#ff9ba3" : s.success ? "#6ee787" : s.done ? "#6aa6ff" : "#2b3644",
              boxShadow: s.active ? "0 0 0 3px #6aa6ff33" : undefined,
            }}
          />
          <span style={{ fontSize: 13, color: s.done ? "#e6edf3" : "#6b7684" }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}
