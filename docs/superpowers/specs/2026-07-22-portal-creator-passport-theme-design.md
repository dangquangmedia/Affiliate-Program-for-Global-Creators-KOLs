# Thiết kế lại UI Creator dashboard — "Trạm điều hành biên giới" (Con dấu hộ chiếu)

> Trạng thái: đã brainstorm + duyệt thiết kế qua visual companion (2026-07-22). Bước tiếp theo:
> `superpowers:writing-plans` để tạo kế hoạch code chi tiết.

## Bối cảnh & mục tiêu

Anh Quang phản hồi UI `/portal` hiện tại (nền trắng/xám, card bo góc, tông xanh-tím) cho **cảm
giác "AI chung chung"** — nguyên nhân gốc không phải bố cục hay lỗi kỹ thuật, mà **thiếu cá
tính/câu chuyện riêng** khiến nó có thể là dashboard SaaS của bất kỳ sản phẩm nào, không đặc
trưng cho Affiliate GLOBAL.

Mục tiêu: thiết kế lại giao diện `/portal` với một **cá tính hình ảnh riêng, rõ ràng**, bắt đầu
thí điểm ở **Creator dashboard** trước khi áp dụng sang 4 dashboard còn lại (Local Ops/Admin/
Finance/Global Admin).

## Concept đã chọn: "Trạm điều hành biên giới" — Con dấu hộ chiếu

Ẩn dụ: mỗi creator có một **hồ sơ hộ chiếu cá nhân** tại một trạm kiểm soát song quốc gia
(VN/PH). Mọi trạng thái nghiệp vụ (KYC duyệt, content approved, tiền về ví) hiện ra như một
**con dấu đóng lên hồ sơ** — ẩn dụ này khớp thẳng với bất biến kỹ thuật thật đã có: audit trail
append-only nghĩa là mọi quyết định luôn để lại "dấu vết" không xoá được (xem
`docs/HARD_PROBLEMS.md` #8). Đây không phải trang trí tuỳ hứng — nó phản ánh đúng bản chất hệ
thống, nên khó nhầm với một dashboard AI-sinh chung chung.

Được chọn qua 3 hướng đề xuất (loại: "Sổ cái sống" — quá trừu tượng; "Tháp kiểm soát ban đêm" —
kịch tính nhưng xa cách với vai Creator hơn).

## Design tokens

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--ink-navy` | `#121B3A` | nền chính |
| `--ink-navy-deep` | `#0D142B` | nền card / rail / vùng đậm hơn 1 bậc |
| `--brass` | `#D9A441` | accent chính — viền dấu, số tiền nổi bật, tab đang chọn |
| `--paper` | `#EDE6D3` | chữ chính trên nền tối ("giấy ngà", không dùng trắng thuần `#FFFFFF`) |
| `--muted-blue` | `#8FA0C9` | label phụ, chữ mờ, icon rail chưa chọn |
| `--border` | `#2A3B66` | viền card, viền phân cách |
| `--ok-green` | `#4ADE80` | trạng thái tích cực (đã duyệt, đã nhận) — giữ tương phản đủ trên nền navy |

Được chọn qua 3 tông màu đề xuất (loại: "Tháp kiểm soát ban đêm" `#0B0F14`+cyan — quá lạnh/kịch
tính cho vai Creator; "Trạm hải quan song ngữ" giấy ấm — đẹp nhưng không tương phản đủ với 4
dashboard còn lại vốn cần một tông tối chung). Có tham khảo tinh thần "blue/teal-corporate" của
AccessTrade nhưng chủ động đi hướng ngược (ấm/navy-brass thay vì lạnh/blue-white) để không trùng
lặp.

**Typography:**
- Tiêu đề/tên riêng (tên creator, section title): **serif** — dùng font-stack hệ thống
  `Cambria, Georgia, 'Times New Roman', serif` (không thêm webfont/dependency mới) — gợi cảm giác
  văn bản chính thức/hộ chiếu. *(Cập nhật khi rollout 23/07: ưu tiên Cambria trước Georgia vì
  Georgia render kém dấu tiếng Việt chồng — "ầ/ằ/ẵ" bị tách dấu huyền ra lơ lửng; Cambria là font
  hệ thống Windows render đúng, fallback Georgia trên máy thiếu.)*
- Số tiền, mã hồ sơ, mã tham chiếu: **monospace** — gợi cảm giác tem/mã vạch/số seri.
- Thân bài, nhãn UI thông thường: giữ nguyên font sans hệ thống hiện có (không đổi, tránh phá
  vỡ độ dễ đọc của đoạn văn dài).

## Cấu trúc layout (kết hợp 2 hướng đã duyệt)

1. **Header "trang bìa hộ chiếu"** (thay cho top bar phẳng hiện tại): tên creator (serif) bên
   trái, nhãn "Hồ sơ Creator · <Quốc gia>" phía trên dạng uppercase letter-spacing, mã hồ sơ dạng
   monospace bên dưới; bên phải là một **con dấu tròn xoay nhẹ (-8deg)** hiển thị trạng thái KYC
   ("ĐÃ DUYỆT" / "CHỜ DUYỆT") thay cho avatar tròn vô hồn hiện tại.
2. **Tab ngang kiểu dấu mộc** cho 5 mục chính, giữ nguyên đúng nhãn hiện có: Trang chủ · Khám phá
   · Chiến dịch (badge số đếm) · Thu nhập · Ví & rút tiền. Tab đang chọn có gạch chân màu brass
   2px, không dùng pill bo tròn nền đặc như trước.
3. **Rail icon dọc thu nhỏ bên trái** (~52px, chỉ icon, nền `--ink-navy-deep`): logo/workspace
   switcher, đổi quốc gia (🌐), thông báo (🔔), đổi giao diện sáng/tối (🌙), và ở cuối rail là
   đổi vai/đăng xuất (⇄). Thay thế sidebar đầy chữ hiện tại — các mục điều hướng chính đã chuyển
   sang tab ngang ở #2.
4. **KPI card**: nền `--ink-navy-deep`, viền `--border`. Cụ thể 4 card trên Trang chủ: card
   **"Trạng thái KYC"** có tem xoay nghiêng (+6deg) màu `--ok-green` viền chữ "OK" khi đã duyệt,
   hoặc màu `--brass` chữ "CHỜ" khi chưa; card **"Thu nhập chờ đối soát"** có tem `--brass` chữ
   "CHỜ" khi giá trị > 0 (ẩn tem khi = 0); card **"Chiến dịch cần làm"** và **"Số dư ví (rút
   được)"** không có tem — chỉ số + label, không cần trạng thái nhị phân.
5. **Panel nội dung** ("Việc cần làm tiếp theo", "Dòng tiền của bạn") giữ đúng bố cục 2 cột hiện
   tại (list bên trái rộng hơn, progress bar bên phải), chỉ đổi màu/font sang token ở trên.

## Nội dung & nhãn — KHÔNG đổi

Toàn bộ text/label nghiệp vụ tiếng Việt hiện có ("Trạng thái KYC", "Chiến dịch cần làm", "Thu
nhập chờ đối soát", "Số dư ví (rút được)", "Việc cần làm tiếp theo", "Dòng tiền của bạn", tên các
tab...) **giữ nguyên y hệt** — đây là redesign lớp trình bày (presentation layer), không phải
viết lại nội dung/copy.

## Ràng buộc kỹ thuật bắt buộc

1. **Không đổi bất kỳ `data-testid` nào.** Toàn bộ Playwright E2E hiện có
   (`apps/web/e2e/creator-login.spec.ts`, `portal-cross-link.spec.ts`, `earnings-flow.spec.ts`,
   `payout-flow.spec.ts`, `payout-fail-flow.spec.ts`, `join-flow.spec.ts`, `content-flow.spec.ts`,
   `kyc-flow.spec.ts`, `campaign-flow.spec.ts`, `waitlist-flow.spec.ts`,
   `reconciliation-flow.spec.ts`) chạy dựa vào các id này để tìm phần tử. Redesign chỉ đổi
   className/CSS/cấu trúc JSX bao quanh, **không đổi/xoá/đổi tên** thuộc tính `data-testid`.
2. **Không đổi logic nghiệp vụ, fetch, hay state** trong `apps/web/src/app/portal/creator/
   page.tsx` — chỉ đổi phần trình bày (JSX cấu trúc bao ngoài + CSS module). Toàn bộ luồng gọi
   API Go, xử lý lỗi, tính toán `withdrawable`/`paidOut` giữ nguyên y hệt logic hiện tại.
3. **Dark/light toggle hiện có phải tiếp tục hoạt động** — đổi cả 2 theme sang cặp "navy đậm /
   navy nhạt hơn + giấy ngà" thay vì cặp trắng-tím mặc định hiện tại, không bỏ tính năng toggle.
4. **`Modal` component dùng chung** (`apps/web/src/app/portal/ui.tsx`, dùng cho form nộp nội
   dung) phải được restyle theo token mới, không tạo component Modal riêng cho Creator.
5. Thay đổi giới hạn trong `apps/web/src/app/portal/creator/page.tsx`,
   `apps/web/src/app/portal/portal.module.css` (hoặc file CSS module mới nếu tách riêng theme
   token), và `apps/web/src/app/portal/ui.tsx` (phần dùng chung). Không đụng
   `apps/web/src/app/mockup/**` (khu vực 13 màn prototype, tách biệt theo
   [[project_portal_ui]] — nguyên tắc đã ghi nhớ: không build khi đang dev khu vực này, và giữ
   `/mockup` tách biệt hoàn toàn khỏi `/portal`).

## Phạm vi phiên này: chỉ Creator dashboard

Sau khi Creator dashboard hoàn thành + duyệt qua trải nghiệm thật (không chỉ mockup tĩnh), áp
dụng cùng token/motif (rail icon, tab dấu mộc, tem trạng thái, header hộ chiếu — đổi "Hồ sơ
Creator" thành nhãn vai tương ứng) sang Local Ops/Admin/Finance/Global Admin ở phiên kế tiếp,
không thiết kế lại từ đầu.

## Test plan

- Chạy `apps/web/e2e/creator-login.spec.ts` + `portal-cross-link.spec.ts` sau khi restyle —
  phải xanh nguyên vẹn không sửa spec (chứng minh ràng buộc #1/#2 ở trên được tôn trọng).
- Kiểm tra thủ công bằng Playwright MCP: đổi quốc gia VN/PH, đổi dark/light, mở modal nộp nội
  dung — xác nhận theme mới áp dụng nhất quán ở mọi trạng thái, không có nền trắng "sót lại" từ
  theme cũ.
