import Link from "next/link";
import styles from "../../mockup/mockup.module.css";

// Index khu prototype. N2 = 8 màn Creator; N3 = 4 màn Staff + 2 kịch bản click end-to-end.
// Mỗi dòng ghi kèm "câu hỏi màn đó trả lời" để mentor thấy tư duy product, không chỉ là UI.

const CREATOR_SCREENS = [
  { code: "V01", href: "/mockup/creator/login", title: "Đăng nhập", q: "Vào hệ thống thế nào? SSO 1 chạm (mock)." },
  { code: "V02", href: "/mockup/creator/country", title: "Chọn quốc gia", q: "1 tài khoản, hồ sơ riêng từng nước — không trộn dữ liệu." },
  { code: "V03", href: "/mockup/creator/kyc", title: "KYC", q: "Duyệt/từ chối theo từng field; chỉ sửa field bị từ chối." },
  { code: "V04", href: "/mockup/creator/discover", title: "Khám phá campaign", q: "Chỉ thấy campaign nước mình; còn suất không?" },
  { code: "V05", href: "/mockup/creator/campaign", title: "Chi tiết + Join", q: "Điều khoản, KYC guard, snapshot lúc Join." },
  { code: "V06", href: "/mockup/creator/submit", title: "Nộp nội dung", q: "Nộp link, theo dõi duyệt, từ chối có lý do." },
  { code: "V07", href: "/mockup/creator/earnings", title: "Thu nhập", q: "Gross–Thuế–Net; PENDING → AVAILABLE → PAID." },
  { code: "V08", href: "/mockup/creator/wallet", title: "Ví & rút tiền", q: "OTP, reserve, 3 kết cục provider (paid/fail/unknown)." },
];

const STAFF_SCREENS = [
  { code: "V09", href: "/mockup/admin/config", title: "Cấu hình quốc gia", q: "Global Admin — vai duy nhất vượt biên giới nước; audit." },
  { code: "V10", href: "/mockup/ops/review", title: "Hàng đợi duyệt (Ops)", q: "Duyệt KYC+content, từ chối có lý do, xung đột 409." },
  { code: "V11", href: "/mockup/admin/campaign-builder", title: "Tạo campaign", q: "Quy tắc thưởng 3 trục sống trong UI; ngân sách = suất × đơn giá." },
  { code: "V12", href: "/mockup/finance/workbench", title: "Đối soát & chi trả", q: "Khoá batch (immutable) + payout 3 trạng thái." },
];

// 2 kịch bản click xuyên màn — chứng minh luồng đi được, không dead-end.
const HAPPY = [
  { label: "Join (V05)", href: "/mockup/creator/campaign" },
  { label: "Nộp content (V06)", href: "/mockup/creator/submit" },
  { label: "Ops duyệt (V10)", href: "/mockup/ops/review" },
  { label: "Thu nhập (V07)", href: "/mockup/creator/earnings" },
  { label: "Finance khoá (V12)", href: "/mockup/finance/workbench" },
  { label: "Rút tiền (V08)", href: "/mockup/creator/wallet" },
];
const REJECT = [
  { label: "Nộp content (V06)", href: "/mockup/creator/submit" },
  { label: "Ops từ chối + lý do (V10)", href: "/mockup/ops/review" },
  { label: "Creator sửa & nộp lại (V06)", href: "/mockup/creator/submit" },
  { label: "Ops duyệt (V10)", href: "/mockup/ops/review" },
];

function ScreenList({ items }: { items: { code: string; href: string; title: string; q: string }[] }) {
  return (
    <ul className={styles.indexList}>
      {items.map((s) => (
        <li key={s.code}>
          <Link href={s.href} className={styles.indexItem}>
            <span className={styles.indexCode}>{s.code}</span>
            <span>
              <div>{s.title}</div>
              <div className={styles.indexQ}>{s.q}</div>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Flow({ title, steps }: { title: string; steps: { label: string; href: string }[] }) {
  return (
    <div className={styles.flowBox}>
      <div style={{ fontSize: 14, color: "#cfe0ff", fontWeight: 600 }}>{title}</div>
      <div className={styles.flowSteps}>
        {steps.map((s, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Link href={s.href} className={styles.flowStep}>{s.label}</Link>
            {i < steps.length - 1 && <span className={styles.flowArrow}>→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MockupIndex() {
  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link href="/">← Về trang chủ</Link>
      </div>
      <h1 className={styles.title}>Prototype — luồng product (N2 + N3)</h1>
      <div className={styles.note}>
        <strong>Đây là bản vẽ product, không phải sản phẩm thật.</strong> Dữ liệu là mock, dùng để
        &quot;nghĩ&quot; luồng nghiệp vụ trước khi code thật (N6+). Mỗi màn có thanh chọn trạng
        thái (happy / chờ / lỗi / từ chối) và chú thích &quot;màn này trả lời câu hỏi gì&quot;.
        Đổi <b>VN / PH</b> ở góc phải mỗi màn để thấy cách ly dữ liệu &amp; tiền tệ theo nước.
      </div>

      <h2 style={{ fontSize: 15, color: "#8b96a3", margin: "20px 0 10px" }}>2 kịch bản click xuyên màn</h2>
      <Flow title="① Happy path — từ Join tới nhận tiền" steps={HAPPY} />
      <Flow title="② Từ chối & nộp lại — Ops reject → creator resubmit → duyệt" steps={REJECT} />

      <h2 style={{ fontSize: 15, color: "#8b96a3", margin: "24px 0 10px" }}>8 màn Creator</h2>
      <ScreenList items={CREATOR_SCREENS} />

      <h2 style={{ fontSize: 15, color: "#8b96a3", margin: "24px 0 10px" }}>4 màn Admin / Ops / Finance</h2>
      <ScreenList items={STAFF_SCREENS} />
    </div>
  );
}
