import Link from "next/link";
import s from "./portal.module.css";
import { Icon } from "./ui";

// Landing khu /portal: hero giới thiệu nền tảng + chọn vai để vào đúng dashboard.
// Server component (tĩnh) — chỉ điều hướng, không state.

export const metadata = { title: "Affiliate GLOBAL · Control Center" };

const ROLES = [
  { key: "creator", name: "Creator", color: "#6e7bff", icon: "spark",
    desc: "Hoàn tất KYC, tham gia chiến dịch, nộp nội dung và rút thu nhập theo từng thị trường." },
  { key: "ops", name: "Local Ops", color: "#5ab0f0", icon: "shield",
    desc: "Duyệt KYC và nội dung theo từng field; khoá đúng thị trường được phân công." },
  { key: "admin", name: "Local Admin", color: "#2dd4bf", icon: "sliders",
    desc: "Tạo & quản chiến dịch với quy tắc thưởng 3 trục; ngân sách = số suất × đơn giá." },
  { key: "finance", name: "Local Finance", color: "#35d08a", icon: "scale",
    desc: "Đối soát, khoá batch (bất biến) và xử lý payout 3 trạng thái an toàn tiền." },
  { key: "global", name: "Global Admin", color: "#f6b44c", icon: "globe",
    desc: "Vai duy nhất vượt biên giới: cấu hình nước, cờ tính năng và nhật ký audit toàn cục." },
] as const;

export default function PortalLanding() {
  return (
    <div className={s.app} data-market="VN">
      <div className={s.landing}>
        <div className={s.landTop}>
          <span className={s.logoMark}><Icon name="globe" size={19} /></span>
          <span className={s.brandName}>Affiliate GLOBAL<span>Control Center</span></span>
        </div>

        <div className={s.landWrap}>
          <section className={s.hero}>
            <span className={s.heroEyebrow}><Icon name="spark" size={13} /> Nền tảng affiliate đa quốc gia</span>
            <h1 className={s.heroTitle}>Một cỗ máy tiền, <em>hai thị trường</em> tách biệt tuyệt đối.</h1>
            <p className={s.heroSub}>
              Việt Nam và Philippines chạy trên cùng hệ thống nhưng dữ liệu, tiền tệ, thuế và mức rút
              không bao giờ trộn lẫn. Từ nội dung được duyệt tới lúc rút tiền — mọi trạng thái đều minh
              bạch, mọi quyết định đều để lại vết. Chọn vai để vào đúng bảng điều khiển.
            </p>
            <div className={s.heroStats}>
              <div className={s.heroStat}><b>2</b><span>thị trường · VND / PHP</span></div>
              <div className={s.heroStat}><b>5</b><span>vai điều hành</span></div>
              <div className={s.heroStat}><b>3</b><span>kết cục payout an toàn</span></div>
              <div className={s.heroStat}><b>100%</b><span>quyết định có audit</span></div>
            </div>
          </section>

          <div className={s.roleGridTitle}>Vào bảng điều khiển theo vai</div>
          <div className={s.roleGrid}>
            {ROLES.map((r) => (
              <Link key={r.key} href={`/portal/${r.key}`} className={s.roleCard} style={{ ["--rc" as string]: r.color }}>
                <span className={s.rcIcon}><Icon name={r.icon} size={22} /></span>
                <span className={s.rcName}>{r.name}</span>
                <span className={s.rcDesc}>{r.desc}</span>
                <span className={s.rcGo}>Mở dashboard <Icon name="arrow" size={15} /></span>
              </Link>
            ))}
          </div>

          <p className={s.disclose}>
            Môi trường demo · dữ liệu mẫu, không phải PII thật · SSO và OTP được mock có công bố.
            Tỷ giá USD chỉ để tham chiếu, không dùng để thanh toán.
          </p>
        </div>
      </div>
    </div>
  );
}
