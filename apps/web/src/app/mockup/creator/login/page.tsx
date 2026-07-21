"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Frame, Note, StateBar, Card, Btn, BtnRow, Badge } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { t } from "../../../../lib/i18n";
import {
  mockLogin,
  loadSession,
  saveSession,
  clearSession,
  AuthError,
  type StoredSession,
} from "../../../../lib/auth-client";

type View = "normal" | "oauthDown" | "sessionExpired";

// Mock SSO: mỗi "nhà cung cấp" ánh xạ 1 danh tính demo cố định (công bố là mock). Nhãn nút lấy
// từ i18n theo `labelKey` (giữ icon riêng để ghép trước chuỗi đã dịch).
const PROVIDERS = {
  google: { icon: "🔵", labelKey: "login.google", email: "creator.google@demo.affiliate.gl", name: "Creator (Google)" },
  tiktok: { icon: "⚫", labelKey: "login.tiktok", email: "creator.tiktok@demo.affiliate.gl", name: "Creator (TikTok)" },
} as const;
type Provider = keyof typeof PROVIDERS;

export default function LoginScreen() {
  const [view, setView] = useState<View>("normal");
  const [session, setSession] = useState<StoredSession | null>(null);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { lang, market, setMarket } = usePrefs();
  const router = useRouter();
  const NEXT = "/mockup/creator/country"; // bước tiếp theo sau đăng nhập: chọn quốc gia

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
      router.push(NEXT); // đăng nhập xong → tự chuyển sang bước chọn quốc gia
    } catch (e) {
      setError(e instanceof AuthError ? e.message : t(lang, "login.failed"));
    } finally {
      setBusy(null);
    }
  }

  function logout() {
    clearSession();
    setSession(null);
  }

  return (
    <Frame screen="V01 Login" title={t(lang, "login.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "login.noteQ")}</strong> {t(lang, "login.noteBody")}{" "}
        <em>{t(lang, "login.noteHard")}</em>
      </Note>

      <StateBar
        value={view}
        onChange={setView}
        options={[
          { key: "normal", label: t(lang, "login.stNormal") },
          { key: "oauthDown", label: t(lang, "login.stOauthDown") },
          { key: "sessionExpired", label: t(lang, "login.stExpired") },
        ]}
      />

      {view === "sessionExpired" && (
        <Card>
          <Badge kind="warn">{t(lang, "login.expiredBadge")}</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, marginTop: 10 }}>{t(lang, "login.expiredBody")}</p>
        </Card>
      )}

      {session && view === "normal" ? (
        <Card title={t(lang, "login.signedInTitle")} sub={t(lang, "login.signedInSub")}>
          <Badge kind="success">✓ {session.user.email}</Badge>
          <p style={{ color: "#a9b6c4", fontSize: 14, margin: "10px 0" }}>
            {t(lang, "login.hello", { name: session.user.displayName })}
          </p>
          <BtnRow>
            <Btn variant="primary" onClick={() => router.push(NEXT)}>
              {t(lang, "login.chooseCountry")} →
            </Btn>
            <Btn variant="ghost" onClick={logout}>
              {t(lang, "login.logout")}
            </Btn>
          </BtnRow>
        </Card>
      ) : (
        <Card title={t(lang, "login.welcomeTitle")} sub={t(lang, "login.welcomeSub")}>
          {view === "oauthDown" && (
            <div style={{ marginBottom: 12 }}>
              <Badge kind="danger">{t(lang, "login.oauthDownBadge")}</Badge>
              <p style={{ color: "#ff9ba3", fontSize: 13, marginTop: 8 }}>{t(lang, "login.oauthDownBody")}</p>
            </div>
          )}
          {error && view === "normal" && (
            <div style={{ marginBottom: 12 }}>
              <Badge kind="danger">{t(lang, "login.errorBadge")}</Badge>
              <p style={{ color: "#ff9ba3", fontSize: 13, marginTop: 8 }}>{error}</p>
            </div>
          )}
          <BtnRow>
            <Btn
              variant="primary"
              disabled={view === "oauthDown" || busy !== null}
              onClick={() => login("google")}
            >
              {busy === "google" ? t(lang, "login.signingIn") : `${PROVIDERS.google.icon} ${t(lang, PROVIDERS.google.labelKey)}`}
            </Btn>
            <Btn
              disabled={view === "oauthDown" || busy !== null}
              onClick={() => login("tiktok")}
            >
              {busy === "tiktok" ? t(lang, "login.signingIn") : `${PROVIDERS.tiktok.icon} ${t(lang, PROVIDERS.tiktok.labelKey)}`}
            </Btn>
          </BtnRow>
          {view === "oauthDown" && (
            <BtnRow>
              <Btn variant="ghost">{t(lang, "login.retry")}</Btn>
            </BtnRow>
          )}
          <p style={{ color: "#6b7684", fontSize: 12, marginTop: 16 }}>{t(lang, "login.consent")}</p>
        </Card>
      )}

      {view === "normal" && (
        <p style={{ fontSize: 13, color: "#8b96a3" }}>
          {session ? t(lang, "login.thenOk") : t(lang, "login.thenPending")}
          <Link href="/mockup/creator/country" style={{ color: "#6aa6ff" }}>
            {t(lang, "login.chooseCountry")}
          </Link>
        </p>
      )}
    </Frame>
  );
}
