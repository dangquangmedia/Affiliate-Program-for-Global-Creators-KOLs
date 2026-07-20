"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./mockup.module.css";
import { MARKETS, type Market } from "./data";
import { usePrefs } from "./prefs";
import { t, type Lang } from "../lib/i18n";

const LANGS: Lang[] = ["vi", "en"];

/** Khung chung mọi màn: brand + công tắc ngôn ngữ/USD + market switcher + breadcrumb + tiêu đề. */
export function Frame({
  screen,
  title,
  market,
  setMarket,
  children,
}: {
  screen: string;
  title: string;
  market: Market;
  setMarket: (m: Market) => void;
  children: ReactNode;
}) {
  const { lang, setLang, showUsd, toggleUsd } = usePrefs();
  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <Link href="/mockup" className={styles.brand}>
          Affiliate GLOBAL <span className={styles.brandDim}>· prototype</span>
        </Link>
        <div className={styles.marketPills}>
          {/* Công tắc ngôn ngữ UI (độc lập với nước) — chứng minh i18n đổi ngôn ngữ chạy thật. */}
          {LANGS.map((l) => (
            <button
              key={l}
              className={`${styles.pill} ${l === lang ? styles.pillActive : ""}`}
              onClick={() => setLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
          {/* Toggle hiện USD tham chiếu bên cạnh tiền local (CP-06). */}
          <button
            className={`${styles.pill} ${showUsd ? styles.pillActive : ""}`}
            onClick={toggleUsd}
            title={t(lang, "usd.show")}
          >
            $ USD
          </button>
          {(Object.keys(MARKETS) as Market[]).map((m) => (
            <button
              key={m}
              className={`${styles.pill} ${m === market ? styles.pillActive : ""}`}
              onClick={() => setMarket(m)}
            >
              {MARKETS[m].flag} {m}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.crumb}>
        <Link href="/mockup">{t(lang, "nav.allScreens")}</Link>
      </div>
      <h1 className={styles.title}>
        {title} <span className={styles.screenCode}>· {screen}</span>
      </h1>
      {children}
    </div>
  );
}

/** Banner luôn hiển thị đang ở nước nào — trả lời "câu hỏi 1" mỗi màn phải trả lời.
 *  Locale hiển thị là SỰ THẬT của nước (data); nhãn xung quanh theo ngôn ngữ UI người dùng chọn. */
export function ContextBanner({ market }: { market: Market }) {
  const { lang } = usePrefs();
  const info = MARKETS[market];
  return (
    <div className={styles.ctxBanner}>
      {t(lang, "ctx.label")}: <b>{info.flag} {info.name}</b> · {t(lang, "ctx.language")} <b>{info.locale}</b> ·{" "}
      {t(lang, "ctx.currency")} <b>{info.currency}</b>
    </div>
  );
}

/** Chú thích mục tiêu màn — đây là "phần nghĩ" của mockup, cho mentor thấy tư duy product. */
export function Note({ children }: { children: ReactNode }) {
  return <div className={styles.note}>{children}</div>;
}

/** Thanh chọn trạng thái (dev tool) để xem nhanh happy/loading/error/... */
export function StateBar<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { lang } = usePrefs();
  return (
    <div className={styles.stateBar}>
      <span className={styles.stateBarLabel}>{t(lang, "common.state")}</span>
      {options.map((o) => (
        <button
          key={o.key}
          className={`${styles.stateBtn} ${o.key === value ? styles.stateBtnActive : ""}`}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Card({ title, sub, children }: { title?: string; sub?: string; children: ReactNode }) {
  return (
    <div className={styles.card}>
      {title && <h2 className={styles.cardTitle}>{title}</h2>}
      {sub && <p className={styles.cardSub}>{sub}</p>}
      {children}
    </div>
  );
}

type BadgeKind = "neutral" | "info" | "success" | "warn" | "danger";
const badgeClass: Record<BadgeKind, string> = {
  neutral: styles.badgeNeutral,
  info: styles.badgeInfo,
  success: styles.badgeSuccess,
  warn: styles.badgeWarn,
  danger: styles.badgeDanger,
};
export function Badge({ kind = "neutral", children }: { kind?: BadgeKind; children: ReactNode }) {
  return <span className={`${styles.badge} ${badgeClass[kind]}`}>{children}</span>;
}

export function Btn({
  children,
  variant = "default",
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant?: "default" | "primary" | "ghost" | "danger";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const cls =
    variant === "primary"
      ? styles.btnPrimary
      : variant === "ghost"
        ? styles.btnGhost
        : variant === "danger"
          ? styles.btnDanger
          : "";
  return (
    <button className={`${styles.btn} ${cls}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function BtnRow({ children }: { children: ReactNode }) {
  return <div className={styles.btnRow}>{children}</div>;
}

export function Field({
  label,
  value,
  placeholder,
  locked,
  error,
  onChange,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  locked?: boolean;
  error?: string;
  onChange?: (v: string) => void; // có onChange -> controlled input (form thật)
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        className={`${styles.input} ${locked ? styles.inputLocked : ""} ${error ? styles.inputError : ""}`}
        {...(onChange ? { value: value ?? "", onChange: (e) => onChange(e.target.value) } : { defaultValue: value })}
        placeholder={placeholder}
        readOnly={locked}
      />
      {error && <div className={styles.fieldError}>{error}</div>}
    </div>
  );
}

export function KV({ k, children, strong }: { k: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvKey}>{k}</span>
      <span className={strong ? styles.kvStrong : ""}>{children}</span>
    </div>
  );
}

export function UsdRef({ children }: { children: ReactNode }) {
  const { lang } = usePrefs();
  return <div className={styles.usdRef}>≈ {children} ({t(lang, "usd.refNote")})</div>;
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.skeleton} style={{ width: `${90 - i * 12}%` }} />
      ))}
    </>
  );
}

export function Empty({ icon = "📭", children }: { icon?: string; children: ReactNode }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>{icon}</div>
      {children}
    </div>
  );
}

export { styles as mk };
