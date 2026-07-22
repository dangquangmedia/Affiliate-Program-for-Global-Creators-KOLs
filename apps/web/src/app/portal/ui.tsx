"use client";

// Bộ component dùng chung cho khu /portal (UI thật). Icon là SVG outline (không emoji),
// Shell dựng sidebar + topbar + bottom-nav mobile, đọc màu bản sắc nước qua data-market.
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import s from "./portal.module.css";
import { MARKETS, type Market } from "../../mockup/data";

/* ----------------------------- Icons -------------------------------- */
type IconName =
  | "home" | "compass" | "layers" | "wallet" | "chart" | "shield" | "fileCheck"
  | "sliders" | "scale" | "globe" | "check" | "clock" | "alert" | "lock" | "coins"
  | "users" | "flag" | "bell" | "arrow" | "logout" | "info" | "plus" | "search"
  | "spark" | "ban" | "refresh" | "eye" | "hold" | "menu" | "sun" | "moon";

const P: Record<IconName, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5" />,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="2.5" /><path d="M3 10h18M16 14h2" /></>,
  chart: <path d="M4 20V4M4 20h16M8 20v-6M12 20V9M16 20v-4M20 20V7" />,
  shield: <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" />,
  fileCheck: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 14l2 2 4-4" /></>,
  sliders: <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M18 18h2M14 4v4M8 10v4M16 16v4" />,
  scale: <path d="M12 3v18M7 21h10M5 7h14M5 7 3 13a3 3 0 0 0 6 0L7 7M19 7l-2 6a3 3 0 0 0 6 0l-2-6M6 7l6-2 6 2" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9Z" /></>,
  check: <path d="m5 12 5 5L20 7" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  alert: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3M15 10.5c0-1.7 2.7-3 6-3s6 1.3 6 3" /><ellipse cx="15" cy="13.5" rx="6" ry="3" /><path d="M9 12c0 1.7 2.7 3 6 3M15 13.5v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 6a3 3 0 0 1 0 6M17 15c2.5.4 4.5 2.3 4.5 5" /></>,
  flag: <path d="M5 21V4M5 4h11l-1.5 4L16 12H5" />,
  bell: <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
  refresh: <path d="M4 12a8 8 0 0 1 13.5-5.8L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.5 5.8L4 16M4 20v-4h4" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  hold: <><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}

/* --------------------------- Theme ---------------------------------- */
// Áp data-theme lên MỌI gốc portal đang có trên trang (landing hoặc dashboard).
function applyTheme(light: boolean) {
  document.querySelectorAll("[data-portal-root]").forEach((el) =>
    el.setAttribute("data-theme", light ? "light" : "dark"),
  );
}
export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("ag_theme") === "light";
    setLight(saved);
    applyTheme(saved);
  }, []);
  const toggle = () => {
    const next = !light;
    setLight(next);
    localStorage.setItem("ag_theme", next ? "light" : "dark");
    applyTheme(next);
  };
  return (
    <button className={s.themeBtn} onClick={toggle} aria-label={light ? "Chuyển nền tối" : "Chuyển nền sáng"}
      title={light ? "Chuyển nền tối" : "Chuyển nền sáng"}>
      <Icon name={light ? "moon" : "sun"} size={17} />
    </button>
  );
}

/* --------------------------- Shell ---------------------------------- */
export interface Role {
  key: string;
  name: string;
  scope: string; // dòng nhỏ dưới tên vai (VD "Local Ops · VN")
  color: string;
}
export interface NavItem { key: string; label: string; icon: IconName; badge?: number }

export function Shell({
  role, market, setMarket, marketLocked, nav, active, setActive,
  title, subtitle, user, showUsd, setShowUsd, children, variant, kycOk,
}: {
  role: Role;
  market: Market;
  setMarket: (m: Market) => void;
  marketLocked?: boolean;
  nav: NavItem[];
  active: string;
  setActive: (k: string) => void;
  title: string;
  subtitle?: string;
  user: { name: string; sub: string };
  showUsd: boolean;
  setShowUsd: (v: boolean) => void;
  children: ReactNode;
  variant?: "passport";
  kycOk?: boolean;
}) {
  const initials = user.name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
  const mobileNav = nav.slice(0, 5);

  if (variant === "passport") {
    return (
      <div className={s.app} data-market={market} data-portal-root data-shell-variant="passport">
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <aside className={s.passportRail}>
            <span className={s.logoMark} style={{ width: 28, height: 28 }}><Icon name="globe" size={16} /></span>
            <button className={s.passportRailBtn} aria-label="Đổi quốc gia" title="Đổi quốc gia">
              <Icon name="globe" size={17} />
            </button>
            <button className={s.passportRailBtn} aria-label="Thông báo" title="Thông báo">
              <Icon name="bell" size={17} />
            </button>
            <ThemeToggle />
            <div className={s.passportRailFoot}>
              <Link href="/portal" className={s.passportRailBtn} style={{ textDecoration: "none" }} aria-label="Đổi vai / Đăng xuất" title="Đổi vai / Đăng xuất">
                <Icon name="logout" size={17} />
              </Link>
            </div>
          </aside>

          <div className={s.main} style={{ flex: 1, minWidth: 0 }}>
            <header className={s.passportHeader}>
              <div>
                <div className={s.passportEyebrow}>{role.scope} · {MARKETS[market].name}</div>
                <div className={s.passportName}>{user.name}</div>
                <div className={s.passportId}>HỒ SƠ #{role.key.toUpperCase()}-{market}-{initials}</div>
              </div>
              <div className={`${s.passportStamp} ${kycOk ? s.passportStampOk : ""}`}>
                {kycOk ? "ĐÃ\nDUYỆT" : "CHỜ\nDUYỆT"}
              </div>
            </header>

            <nav className={s.passportTabs} aria-label="Điều hướng">
              {nav.map((n) => (
                <button key={n.key} onClick={() => setActive(n.key)}
                  className={`${s.passportTab} ${active === n.key ? s.passportTabActive : ""}`}>
                  {n.label}
                  {n.badge ? <span className={s.passportTabBadge}>{n.badge}</span> : null}
                </button>
              ))}
            </nav>

            <main className={s.content}>{children}</main>
          </div>
        </div>

        <nav className={s.mobileNav} aria-label="Điều hướng">
          {mobileNav.map((n) => (
            <button key={n.key} onClick={() => setActive(n.key)}
              className={`${s.mNavItem} ${active === n.key ? s.mNavActive : ""}`}>
              <Icon name={n.icon} size={21} />
              {n.label.split(" ")[0]}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className={s.app} data-market={market} data-portal-root>
      <div className={s.shell}>
        {/* sidebar */}
        <aside className={s.sidebar}>
          <Link href="/portal" className={s.brandRow} style={{ textDecoration: "none", color: "inherit" }}>
            <span className={s.logoMark}><Icon name="globe" size={19} /></span>
            <span className={s.brandName}>Affiliate GLOBAL<span>Control Center</span></span>
          </Link>
          <div className={s.roleTag}>
            <span className={s.roleDot} style={{ color: role.color }} />
            <span><b>{role.name}</b><small>{role.scope}</small></span>
          </div>
          <div className={s.navLabel}>Không gian làm việc</div>
          {nav.map((n) => (
            <button key={n.key} onClick={() => setActive(n.key)}
              className={`${s.navItem} ${active === n.key ? s.navItemActive : ""}`}>
              <Icon name={n.icon} size={18} />
              {n.label}
              {n.badge ? <span className={s.navBadge}>{n.badge}</span> : null}
            </button>
          ))}
          <div className={s.sideFoot}>
            <Link href="/portal" className={s.navItem} style={{ textDecoration: "none" }}>
              <Icon name="logout" size={18} /> Đổi vai / Đăng xuất
            </Link>
          </div>
        </aside>

        {/* main */}
        <div className={s.main}>
          <header className={s.topbar}>
            <div className={s.topTitle}>{title}{subtitle && <small>{subtitle}</small>}</div>
            <div className={s.topSpacer} />
            <div className={s.topControls}>
              {marketLocked ? (
                <span className={s.mktLock}><Icon name="lock" size={13} /> {MARKETS[market].flag} {market} · khoá theo vai</span>
              ) : (
                <div className={s.marketSwitch} role="tablist" aria-label="Chọn thị trường">
                  {(Object.keys(MARKETS) as Market[]).map((m) => (
                    <button key={m} role="tab" aria-selected={m === market}
                      className={`${s.mktBtn} ${m === market ? s.mktBtnActive : ""}`} onClick={() => setMarket(m)}>
                      {MARKETS[m].flag} {m}
                    </button>
                  ))}
                </div>
              )}
              <button className={`${s.pillBtn} ${showUsd ? s.pillBtnOn : ""}`} onClick={() => setShowUsd(!showUsd)}
                title="Hiện USD tham chiếu (demo, không dùng thanh toán)">$ USD</button>
              <ThemeToggle />
              <button className={s.iconBtn} aria-label="Thông báo"><Icon name="bell" size={17} /></button>
              <div className={s.userChip}>
                <span className={s.userName}>{user.name}<small>{user.sub}</small></span>
                <span className={s.avatar}>{initials}</span>
              </div>
            </div>
          </header>
          <main className={s.content}>{children}</main>
        </div>
      </div>

      {/* mobile bottom nav */}
      <nav className={s.mobileNav} aria-label="Điều hướng">
        {mobileNav.map((n) => (
          <button key={n.key} onClick={() => setActive(n.key)}
            className={`${s.mNavItem} ${active === n.key ? s.mNavActive : ""}`}>
            <Icon name={n.icon} size={21} />
            {n.label.split(" ")[0]}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* --------------------------- Market strip --------------------------- */
export function MarketStrip({ market, note }: { market: Market; note?: string }) {
  const m = MARKETS[market];
  return (
    <div className={s.mktStrip}>
      <span className={s.flag}>{m.flag}</span>
      <b>{m.name}</b>
      <span className={s.mktSep} />
      <span className={s.dim}>Ngôn ngữ dữ liệu <b style={{ color: "var(--text)" }}>{m.locale}</b></span>
      <span className={s.mktSep} />
      <span className={s.dim}>Tiền tệ <b style={{ color: "var(--text)" }}>{m.currency}</b></span>
      {note && <><span className={s.mktSep} /><span className={s.dim}>{note}</span></>}
    </div>
  );
}

/* --------------------------- Primitives ----------------------------- */
type Tone = "brand" | "ok" | "warn" | "danger" | "info" | "hold" | "neutral" | "mkt";
const toneVar: Record<Tone, string> = {
  brand: "var(--brand)", ok: "var(--ok)", warn: "var(--warn)", danger: "var(--danger)",
  info: "var(--info)", hold: "var(--hold)", neutral: "var(--text-mute)", mkt: "var(--mkt)",
};

export function SectionHead({ title, hint, more }: { title: string; hint?: string; more?: ReactNode }) {
  return (
    <div className={s.sectionHead}>
      <h2>{title}</h2>
      {hint && <span className={s.hint}>{hint}</span>}
      {more && <span style={{ marginLeft: "auto" }}>{more}</span>}
    </div>
  );
}

export function Kpi({ label, icon, value, cur, sub, usd, tone = "mkt", stamp }: {
  label: string; icon: IconName; value: string; cur?: string; sub?: ReactNode; usd?: string; tone?: Tone;
  stamp?: { text: string; ok?: boolean };
}) {
  return (
    <div className={s.kpi} style={{ ["--tone" as string]: toneVar[tone] }}>
      {stamp && (
        <span className={`${s.kpiStamp} ${stamp.ok ? s.kpiStampOk : ""}`}>{stamp.text}</span>
      )}
      <div className={s.kpiTop}><Icon name={icon} size={15} /> {label}</div>
      <div className={s.kpiVal}>{value}{cur && <span className={s.cur}>{cur}</span>}</div>
      {usd && <div className={s.kpiUsd}>{usd}</div>}
      {sub && <div className={s.kpiSub}>{sub}</div>}
    </div>
  );
}

export function Panel({ title, sub, action, children, className }: {
  title?: string; sub?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`${s.panel} ${className ?? ""}`}>
      {(title || action) && (
        <div className={s.panelHead}>
          {title && <h3>{title}</h3>}
          {sub && <span className={s.sub}>{sub}</span>}
          {action && <span className={s.act}>{action}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

const chipCls: Record<Tone, string> = {
  brand: s.cBrand, ok: s.cOk, warn: s.cWarn, danger: s.cDanger, info: s.cInfo, hold: s.cHold, neutral: s.cNeutral, mkt: s.cBrand,
};
export function Chip({ tone = "neutral", icon, children }: { tone?: Tone; icon?: IconName; children: ReactNode }) {
  return <span className={`${s.chip} ${chipCls[tone]}`}>{icon && <Icon name={icon} size={12} />}{children}</span>;
}

export function Btn({ children, variant = "default", onClick, href, disabled, block, sm, testId }: {
  children: ReactNode; variant?: "default" | "primary" | "ghost" | "danger";
  onClick?: () => void; href?: string; disabled?: boolean; block?: boolean; sm?: boolean; testId?: string;
}) {
  const cls = `${s.btn} ${variant === "primary" ? s.btnPrimary : variant === "ghost" ? s.btnGhost : variant === "danger" ? s.btnDanger : ""} ${block ? s.btnBlock : ""} ${sm ? s.btnSm : ""}`;
  if (href) return <Link href={href} className={cls} data-testid={testId}>{children}</Link>;
  return <button className={cls} onClick={onClick} disabled={disabled} data-testid={testId}>{children}</button>;
}

export function Meter({ taken, total }: { taken: number; total: number }) {
  const pct = Math.min(100, Math.round((taken / total) * 100));
  return <div className={s.meter}><div className={s.meterFill} style={{ width: `${pct}%` }} /></div>;
}

/* Money-state spine — motif tiền xuyên các dashboard */
export function MoneySpine({ segments }: { segments: { label: string; amount: string; value: number; color: string }[] }) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div className={s.spine}>
      <div className={s.spineBar}>
        {segments.map((seg) => (
          <div key={seg.label} className={s.spineSeg} style={{ width: `${(seg.value / total) * 100}%`, background: seg.color }} title={seg.label} />
        ))}
      </div>
      <div className={s.spineLegend}>
        {segments.map((seg) => (
          <div key={seg.label} className={s.legItem}>
            <span className={s.legDot} style={{ background: seg.color }} />
            <span><b>{seg.amount}</b>{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Note({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return <div className={`${s.note} ${warn ? s.noteWarn : ""}`}><Icon name={warn ? "alert" : "info"} size={16} /><div>{children}</div></div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className={s.emptyState}><Icon name="compass" size={30} /><div>{children}</div></div>;
}

/* --------------------------- Modal ---------------------------------- */
// Dialog nổi giữa màn: hiện ngay bất kể vị trí nút đã bấm (không bị đẩy khuất dưới bảng dài).
// Đóng khi bấm nền mờ hoặc Esc. Nội dung không đóng khi click (stopPropagation).
export function Modal({ title, sub, onClose, children }: {
  title: string; sub?: string; onClose: () => void; children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={s.modalScrim} onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={s.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <h3>{title}</h3>
          <button className={s.modalClose} onClick={onClose} aria-label="Đóng" type="button">✕</button>
        </div>
        {sub && <p className={s.modalSub}>{sub}</p>}
        {children}
      </div>
    </div>
  );
}

export { s as css };
