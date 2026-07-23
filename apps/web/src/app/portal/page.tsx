import Link from "next/link";
import s from "./portal.module.css";
import { Icon, ThemeToggle } from "./ui";
import { RoleGrid } from "./role-buttons";

// Landing khu /portal: một khung liền mạch — header (logo + prototype ở góc phải) → hero thân
// thiện → chọn vai → footer (kiểm chứng country-context /vn /ph). Server component (tĩnh).

export const metadata = { title: "Affiliate GLOBAL · Control Center" };

const ROLES = [
  { key: "creator", name: "Creator", color: "#6e7bff", icon: "spark",
    desc: "KYC → chiến dịch → nộp nội dung → rút tiền" },
  { key: "ops", name: "Local Ops", color: "#5ab0f0", icon: "shield",
    desc: "Duyệt KYC & nội dung theo từng nước" },
  { key: "admin", name: "Local Admin", color: "#2dd4bf", icon: "sliders",
    desc: "Tạo & quản chiến dịch, quy tắc thưởng" },
  { key: "finance", name: "Local Finance", color: "#35d08a", icon: "scale",
    desc: "Đối soát, khoá batch & payout an toàn" },
  { key: "global", name: "Global Admin", color: "#f6b44c", icon: "globe",
    desc: "Cấu hình nước, cờ tính năng, audit toàn cục" },
] as const;

export default function PortalLanding() {
  return (
    <div className={s.app} data-market="VN" data-portal-root data-shell-variant="passport">
      <div className={s.landing}>
        <div className={s.landFrame}>
          {/* header: brand trái · theme + prototype góc phải */}
          <header className={s.landHeader}>
            <span className={s.logoMark}><Icon name="globe" size={19} /></span>
            <span className={s.brandName}>Affiliate GLOBAL<span>Control Center</span></span>
            <div className={s.landHeaderRight}>
              <ThemeToggle />
              <Link href="/mockup" className={s.cornerBtn} data-testid="link-mockup">
                <Icon name="eye" size={16} /> Xem prototype
              </Link>
            </div>
          </header>

          {/* hero gọn: bản sắc trạm + 1 dòng phụ + dải số liệu mảnh */}
          <section className={s.hero}>
            <div className={s.heroMain}>
              <div>
                <span className={s.heroEyebrow}>Nền tảng affiliate đa quốc gia · VN &amp; PH</span>
                <h1 className={s.heroTitle}>Trạm điều hành biên giới</h1>
                <p className={s.heroSub}>
                  Chọn quầy để mở đúng bảng điều khiển — mỗi nước tách biệt dữ liệu, tiền tệ và quy trình.
                </p>
              </div>
              <div className={s.heroStats}>
                <div className={s.heroStat}><b>2</b><span>thị trường · VND / PHP</span></div>
                <div className={s.heroStat}><b>5</b><span>vai điều hành</span></div>
                <div className={s.heroStat}><b>3</b><span>kết cục payout an toàn</span></div>
                <div className={s.heroStat}><b>100%</b><span>quyết định có audit</span></div>
              </div>
            </div>
          </section>

          <RoleGrid roles={ROLES} />

          <div className={s.landFoot}>
            <span>Môi trường demo · dữ liệu mẫu, không phải PII thật · SSO/OTP mock có công bố · USD chỉ tham chiếu.</span>
            <span className={s.footLinks}>
              Kiểm chứng country-context:
              <Link href="/vn" className={s.footLink} data-testid="link-vn">/vn</Link>
              <Link href="/ph" className={s.footLink} data-testid="link-ph">/ph</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
