"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./mockup.module.css";
import { MARKETS, type Market } from "./data";

/** Khung chung mọi màn Creator: brand + market switcher + breadcrumb + tiêu đề. */
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
  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <Link href="/mockup" className={styles.brand}>
          Affiliate GLOBAL <span className={styles.brandDim}>· prototype</span>
        </Link>
        <div className={styles.marketPills}>
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
        <Link href="/mockup">← Tất cả màn</Link>
      </div>
      <h1 className={styles.title}>
        {title} <span className={styles.screenCode}>· {screen}</span>
      </h1>
      {children}
    </div>
  );
}

/** Banner luôn hiển thị đang ở nước nào — trả lời "câu hỏi 1" mỗi màn phải trả lời. */
export function ContextBanner({ market }: { market: Market }) {
  const info = MARKETS[market];
  return (
    <div className={styles.ctxBanner}>
      Ngữ cảnh: <b>{info.flag} {info.name}</b> · ngôn ngữ <b>{info.locale}</b> · tiền tệ{" "}
      <b>{info.currency}</b>
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
  return (
    <div className={styles.stateBar}>
      <span className={styles.stateBarLabel}>Trạng thái</span>
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
  return <div className={styles.usdRef}>≈ {children} (tỷ giá tham chiếu, demo)</div>;
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
