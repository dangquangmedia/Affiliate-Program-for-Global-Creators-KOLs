import Link from "next/link";
import styles from "../../mockup/mockup.module.css";

// Index khu prototype (N2 Creator; N3 sẽ thêm Admin/Ops/Finance).
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

export default function MockupIndex() {
  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link href="/">← Về trang chủ</Link>
      </div>
      <h1 className={styles.title}>Prototype — luồng Creator (N2)</h1>
      <div className={styles.note}>
        <strong>Đây là bản vẽ product, không phải sản phẩm thật.</strong> Dữ liệu là mock, dùng để
        &quot;nghĩ&quot; luồng nghiệp vụ trước khi code thật (N6+). Mỗi màn có thanh chọn trạng
        thái (happy / chờ / lỗi / từ chối) và chú thích &quot;màn này trả lời câu hỏi gì&quot;.
        Đổi <b>VN / PH</b> ở góc phải mỗi màn để thấy cách ly dữ liệu &amp; tiền tệ theo nước.
      </div>

      <h2 style={{ fontSize: 15, color: "#8b96a3", margin: "20px 0 10px" }}>8 màn Creator</h2>
      <ul className={styles.indexList}>
        {CREATOR_SCREENS.map((s) => (
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

      <p style={{ fontSize: 13, color: "#6b7684", marginTop: 24 }}>
        Màn Admin/Ops/Finance (queue duyệt, campaign builder, đối soát + payout) sẽ được thêm ở
        N3.
      </p>
    </div>
  );
}
