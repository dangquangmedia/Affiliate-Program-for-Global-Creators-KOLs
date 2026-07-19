"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Market } from "../../../../mockup/data";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge } from "../../../../mockup/ui";
import {
  mockLogin,
  loadSession,
  saveSession,
  clearSession,
  AuthError,
  type StoredSession,
} from "../../../../lib/auth-client";

type View = "normal" | "oauthDown" | "sessionExpired";

// Mock SSO: mỗi "nhà cung cấp" ánh xạ 1 danh tính demo cố định (công bố là mock).
const PROVIDERS = {
  google: { label: "🔵 Đăng nhập với Google", email: "creator.google@demo.affiliate.gl", name: "Creator (Google)" },
  tiktok: { label: "⚫ Đăng nhập với TikTok", email: "creator.tiktok@demo.affiliate.gl", name: "Creator (TikTok)" },
} as const;
type Provider = keyof typeof PROVIDERS;

export default function LoginScreen() {
  const [market, setMarket] = useState<Market>("VN");
  const [view, setView] = useState<View>("normal");
  const [session, setSession] = useState<StoredSession | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Đọc session đã lưu (nếu quay lại màn này mà chưa logout).
  useEffect(() => {
    setSession(loadSession());
  }, []);

  async function login(provider: Provider) {
    setBusy(provider);
    setError(null);
    try {
      const { email, name } = PROVIDERS[provider];
      const result = await mockLogin(email, name); // tạo user + session THẬT trong DB
      saveSession(result);
      setSession(result);
    } catch (e) {
      setError(
        e instanceof AuthError
          ? e.message
          : "Đăng nhập thất bại — thử lại sau.",
      );
    } finally {
      setBusy(null);
    }
  }

  function logout() {
    clearSession();
    setSession(null);
  }

  return (
    <Frame screen="V01 Login" title="Đăng nhập" market={market} setMarket={setMarket}>
      <Note>
        <strong>Màn này trả lời:</strong> làm sao creator vào hệ thống mà không phải tạo mật khẩu
        riêng? → Đăng nhập 1 chạm bằng SSO (mock). 1 tài khoản dùng chung cho nhiều nước; chọn
        nước ở màn kế tiếp. <em>SSO thật được mock có công bố — mentor hỏi thì đây là chỗ cắm
        OAuth Google/TikTok thật sau này. Nút bên dưới gọi API auth thật: tạo user + session
        trong DB, không còn là hình tĩnh.</em>
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

      {session && view === "normal" ? (
        <Card title="Đã đăng nhập" sub="Session thật đã tạo trong DB (bảng sessions).">
          <Badge kind="success">✓ {session.user.email}</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, margin: "10px 0" }}>
            Xin chào <strong>{session.user.displayName}</strong>. Bước tiếp theo: chọn quốc gia
            để tạo hồ sơ riêng cho nước đó.
          </p>
          <BtnRow>
            <Btn variant="ghost" onClick={logout}>
              Đăng xuất
            </Btn>
          </BtnRow>
        </Card>
      ) : (
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
          {error && view === "normal" && (
            <div style={{ marginBottom: 12 }}>
              <Badge kind="danger">Đăng nhập lỗi</Badge>
              <p style={{ color: "#ff9ba3", fontSize: 13, marginTop: 8 }}>{error}</p>
            </div>
          )}
          <BtnRow>
            <Btn
              variant="primary"
              disabled={view === "oauthDown" || busy !== null}
              onClick={() => login("google")}
            >
              {busy === "google" ? "Đang đăng nhập…" : PROVIDERS.google.label}
            </Btn>
            <Btn
              disabled={view === "oauthDown" || busy !== null}
              onClick={() => login("tiktok")}
            >
              {busy === "tiktok" ? "Đang đăng nhập…" : PROVIDERS.tiktok.label}
            </Btn>
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
      )}

      {view === "normal" && (
        <p style={{ fontSize: 13, color: "#8b96a3" }}>
          {session ? "Đăng nhập thành công → " : "Đăng nhập xong sẽ → "}
          <Link href="/mockup/creator/country" style={{ color: "#6aa6ff" }}>
            chọn quốc gia
          </Link>
        </p>
      )}
    </Frame>
  );
}
