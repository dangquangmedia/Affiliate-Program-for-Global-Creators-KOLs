"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Market } from "../../../../mockup/data";
import { Frame, Note, Card, Btn, BtnRow, Badge, Field, ContextBanner } from "../../../../mockup/ui";
import { usePrefs } from "../../../../mockup/prefs";
import { t } from "../../../../lib/i18n";
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
  const { lang } = usePrefs();

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
    <Frame screen="V06 Nộp content" title={c?.campaignTitle ?? t(lang, "submit.title")} market={market} setMarket={setMarket}>
      <Note>
        <strong>{t(lang, "submit.noteQ")}</strong> {t(lang, "submit.noteBody")} <em>{t(lang, "submit.noteHard")}</em>
      </Note>

      {status === "needLogin" && (
        <Card title={t(lang, "submit.needLoginTitle")}>
          <p style={{ fontSize: 13 }}>
            →{" "}
            <Link href="/mockup/creator/login" style={{ color: "#6aa6ff" }}>
              {t(lang, "nav.login")}
            </Link>
          </p>
        </Card>
      )}
      {status === "loading" && <p style={{ color: "#8b96a3" }}>{t(lang, "submit.loading")}</p>}
      {status === "missing" && (
        <Card title={t(lang, "submit.missingTitle")}>
          <p style={{ fontSize: 13 }}>
            {t(lang, "submit.missingBody1")}{" "}
            <Link href="/mockup/creator/my-campaigns" style={{ color: "#6aa6ff" }}>
              {t(lang, "submit.myCampaigns")}
            </Link>{" "}
            {t(lang, "submit.missingBody2")}
          </p>
        </Card>
      )}
      {status === "notFound" && (
        <Card>
          <Badge kind="danger">{t(lang, "submit.notFoundBadge", { market })}</Badge>
          <p style={{ fontSize: 13, marginTop: 10 }}>
            →{" "}
            <Link href="/mockup/creator/discover" style={{ color: "#6aa6ff" }}>
              {t(lang, "submit.discover")}
            </Link>
          </p>
        </Card>
      )}

      {status === "ready" && c && (
        <>
          <ContextBanner market={market} />

          {c.participationState === "CONTENT_SUBMITTED" && (
            <Card title={t(lang, "submit.pendingTitle")}>
              <Badge kind="info">{t(lang, "submit.pendingBadge", { n: latest?.attemptNo ?? "" })}</Badge>
              <p style={{ color: "#a9b6c4", fontSize: 13, marginTop: 10 }}>{t(lang, "submit.pendingBody")}</p>
              {latest && !latest.hashtagOk && (
                <p style={{ color: "#f0c674", fontSize: 13, marginTop: 6 }}>
                  {t(lang, "submit.hashtagWarn", { tag: c.requiredHashtag ?? "" })}
                </p>
              )}
            </Card>
          )}

          {c.participationState === "APPROVED" && (
            <Card title={t(lang, "submit.approvedTitle")}>
              <Badge kind="success">{t(lang, "submit.approvedBadge")}</Badge>
              <BtnRow>
                <Btn variant="primary">
                  <Link href="/mockup/creator/earnings" style={{ color: "#fff", textDecoration: "none" }}>
                    {t(lang, "submit.viewEarnings")}
                  </Link>
                </Btn>
              </BtnRow>
            </Card>
          )}

          {c.participationState === "EXPIRED" && (
            <Card title={t(lang, "submit.expiredTitle")}>
              <Badge kind="danger">{t(lang, "submit.expiredBadge")}</Badge>
            </Card>
          )}

          {canSubmit && (
            <Card
              title={c.participationState === "REJECTED" ? t(lang, "submit.editResubmitTitle") : t(lang, "submit.submitTitle")}
              sub={t(lang, "submit.submitSub", { platform: c.platform ?? "", tag: c.requiredHashtag ?? "" })}
            >
              {c.participationState === "REJECTED" && latest?.rejectReason && (
                <p style={{ color: "#ff9ba3", fontSize: 14, marginBottom: 10 }}>
                  <strong>{t(lang, "submit.rejectReason")}</strong> {latest.rejectReason}
                  {c.fixDeadlineAt && (
                    <span style={{ color: "#f0c674" }}>{t(lang, "submit.fixDeadline", { date: new Date(c.fixDeadlineAt).toLocaleString() })}</span>
                  )}
                </p>
              )}
              {err && (
                <div style={{ marginBottom: 10 }}>
                  <Badge kind="danger">{err}</Badge>
                </div>
              )}
              <Field
                label={t(lang, "submit.urlLabel")}
                placeholder={`https://${(c.platform ?? "tiktok").toLowerCase()}.com/@ban/video/...`}
                value={url}
                onChange={setUrl}
              />
              <Field
                label={t(lang, "submit.captionLabel", { tag: c.requiredHashtag ?? "" })}
                placeholder={t(lang, "submit.captionPlaceholder", { tag: c.requiredHashtag ?? "" })}
                value={caption}
                onChange={setCaption}
              />
              <BtnRow>
                <Btn variant="primary" disabled={busy || !url.trim()} onClick={doSubmit}>
                  {busy ? t(lang, "submit.sending") : c.participationState === "REJECTED" ? t(lang, "submit.resubmit") : t(lang, "submit.submitBtn")}
                </Btn>
              </BtnRow>
            </Card>
          )}

          {c.submissions.length > 0 && (
            <Card title={t(lang, "submit.historyTitle")} sub={t(lang, "submit.historySub")}>
              {c.submissions.map((s) => (
                <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderTop: "1px solid #1b2430", flexWrap: "wrap" }}>
                  <Badge kind={s.state === "APPROVED" ? "success" : s.state === "REJECTED" ? "danger" : "info"}>
                    #{s.attemptNo} · {s.state === "APPROVED" ? t(lang, "submit.stApproved") : s.state === "REJECTED" ? t(lang, "submit.stRejected") : t(lang, "submit.stPending")}
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
