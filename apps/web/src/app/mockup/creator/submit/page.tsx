"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, Field, ContextBanner } from "../../../../mockup/ui";
import { loadSession } from "../../../../lib/auth-client";
import { myContent, submitContent, type MyContent } from "../../../../lib/content-client";

function isMarket(v: string | null): v is Market {
  return v === "VN" || v === "PH";
}

function SubmitInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const initialMarket = isMarket(params.get("m")) ? (params.get("m") as Market) : "VN";

  const [market, setMarket] = useState<Market>(initialMarket);
  const [status, setStatus] = useState<"loading" | "needLogin" | "missing" | "notFound" | "ready">("loading");
  const [c, setC] = useState<MyContent | null>(null);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setStatus("missing");
      return;
    }
    const d = await myContent(market, id);
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

  async function doSubmit() {
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await submitContent(market, id, url, caption);
      if (res.ok) {
        setC(res.content);
        setUrl("");
        setCaption("");
      } else {
        setErr(res.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const latest = c?.submissions[0] ?? null;
  const canSubmit = c && (c.participationState === "JOINED" || c.participationState === "REJECTED");

  return (
    <Frame screen="V06 Nộp content" title={c?.campaignTitle ?? "Nộp & theo dõi nội dung"} market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> tôi nộp bài đã đăng ở đâu, bài đang duyệt tới đâu? →
        Dán link bài post (đúng nền tảng — kiểm tự động), Ops duyệt; từ chối phải có{" "}
        <strong>lý do</strong> và cho nộp lại. <em>Bài toán khó #7: 1 lần duyệt tạo đúng 1 khoản
        thu nhập — duyệt trùng/nộp lại không nhân đôi tiền (UNIQUE + transaction, N11).</em>
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
            <Link href="/mockup/creator/my-campaigns" style={{ color: "#6aa6ff" }}>
              Chiến dịch của tôi
            </Link>{" "}
            và bấm &quot;Nộp nội dung&quot; trên campaign đang giữ suất.
          </p>
        </Card>
      )}
      {status === "notFound" && (
        <Card>
          <Badge kind="danger">Bạn chưa tham gia campaign này ở nước {market}</Badge>
          <p style={{ fontSize: 13, marginTop: 10 }}>
            →{" "}
            <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
              Khám phá campaign
            </Link>
          </p>
        </Card>
      )}

      {status === "ready" && c && (
        <>
          <ContextBanner market={market} />

          {c.participationState === "CONTENT_SUBMITTED" && (
            <Card title="Đang chờ duyệt">
              <Badge kind="info">Ops đang xem xét (attempt #{latest?.attemptNo})</Badge>
              <p style={{ color: "#a9b6c4", fontSize: 13, marginTop: 10 }}>
                Trong lúc chờ Ops, đồng hồ thu hồi suất DỪNG (QĐ-4) — bạn không bị phạt vì Ops chậm.
              </p>
              {latest && !latest.hashtagOk && (
                <p style={{ color: "#f0c674", fontSize: 13, marginTop: 6 }}>
                  ⚠ Caption chưa thấy hashtag {c.requiredHashtag} — Ops sẽ kiểm kỹ hơn.
                </p>
              )}
            </Card>
          )}

          {c.participationState === "APPROVED" && (
            <Card title="Đã được duyệt 🎉">
              <Badge kind="success">Duyệt thành công — đã tạo 1 khoản thu nhập PENDING (đúng 1 lần)</Badge>
              <BtnRow>
                <Btn variant="primary">
                  <Link href="/mockup/creator/earnings" style={{ color: "#fff", textDecoration: "none" }}>
                    Xem thu nhập →
                  </Link>
                </Btn>
              </BtnRow>
            </Card>
          )}

          {c.participationState === "EXPIRED" && (
            <Card title="Suất đã bị thu hồi">
              <Badge kind="danger">Quá hạn xử lý — suất được trả cho creator khác (QĐ-4)</Badge>
            </Card>
          )}

          {canSubmit && (
            <Card
              title={c.participationState === "REJECTED" ? "Sửa & nộp lại" : "Nộp link bài đăng"}
              sub={`Bài công khai trên ${c.platform}, kèm hashtag bắt buộc ${c.requiredHashtag}.`}
            >
              {c.participationState === "REJECTED" && latest?.rejectReason && (
                <p style={{ color: "#ff9ba3", fontSize: 14, marginBottom: 10 }}>
                  <strong>Lý do từ Ops:</strong> {latest.rejectReason}
                  {c.fixDeadlineAt && (
                    <span style={{ color: "#f0c674" }}>
                      {" "}
                      · hạn sửa: {new Date(c.fixDeadlineAt).toLocaleString()}
                    </span>
                  )}
                </p>
              )}
              {err && (
                <div style={{ marginBottom: 10 }}>
                  <Badge kind="danger">{err}</Badge>
                </div>
              )}
              <Field
                label="Link bài đăng"
                placeholder={`https://${(c.platform ?? "tiktok").toLowerCase()}.com/@ban/video/...`}
                value={url}
                onChange={setUrl}
              />
              <Field
                label={`Caption (để kiểm hashtag ${c.requiredHashtag})`}
                placeholder={`Nội dung caption có ${c.requiredHashtag}…`}
                value={caption}
                onChange={setCaption}
              />
              <BtnRow>
                <Btn variant="primary" disabled={busy || !url.trim()} onClick={doSubmit}>
                  {busy ? "Đang nộp…" : c.participationState === "REJECTED" ? "Nộp lại để duyệt" : "Nộp để duyệt"}
                </Btn>
              </BtnRow>
            </Card>
          )}

          {c.submissions.length > 0 && (
            <Card title="Lịch sử nộp" sub="Mỗi lần nộp là 1 bản ghi — bản sau trỏ về bản bị từ chối (chuỗi attempt).">
              {c.submissions.map((s) => (
                <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderTop: "1px solid #1b2430", flexWrap: "wrap" }}>
                  <Badge kind={s.state === "APPROVED" ? "success" : s.state === "REJECTED" ? "danger" : "info"}>
                    #{s.attemptNo} · {s.state === "APPROVED" ? "Đã duyệt" : s.state === "REJECTED" ? "Từ chối" : "Chờ duyệt"}
                  </Badge>
                  <span style={{ fontSize: 12, color: "#8b96a3", wordBreak: "break-all" }}>{s.url}</span>
                  {s.rejectReason && <span style={{ fontSize: 12, color: "#ff9ba3" }}>({s.rejectReason})</span>}
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </Frame>
  );
}

export default function SubmitScreen() {
  return (
    <Suspense fallback={<p style={{ padding: 32, color: "#8b96a3" }}>Đang tải…</p>}>
      <SubmitInner />
    </Suspense>
  );
}
