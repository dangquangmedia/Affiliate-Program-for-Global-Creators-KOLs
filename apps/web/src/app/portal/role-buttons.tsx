"use client";

// SP-1 T1: nút chọn vai ở landing. Tách khỏi page.tsx (server component, export `metadata`)
// vì cần onClick -> enterAs (mockLogin thật) trước khi điều hướng. Giữ nguyên style .roleCard.
import { Icon } from "./ui";
import s from "./portal.module.css";
import { enterAs, type PortalRole } from "./session";

type IconName = Parameters<typeof Icon>[0]["name"];

export interface RoleCardData {
  key: PortalRole;
  name: string;
  color: string;
  icon: IconName;
  desc: string;
}

export function RoleGrid({ roles }: { roles: readonly RoleCardData[] }) {
  return (
    <div className={s.roleGrid}>
      {roles.map((r) => (
        <button
          key={r.key}
          type="button"
          data-testid={`enter-${r.key}`}
          onClick={() => void enterAs(r.key, "VN")}
          className={s.roleCard}
          style={{ ["--rc" as string]: r.color }}
        >
          <span className={s.rcIcon}><Icon name={r.icon} size={22} /></span>
          <span className={s.rcName}>{r.name}</span>
          <span className={s.rcDesc}>{r.desc}</span>
          <span className={s.rcGo}>Mở dashboard <Icon name="arrow" size={15} /></span>
        </button>
      ))}
    </div>
  );
}
