# Redesign landing `/portal` — "Bảng điều khiển trạm" (passport console)

> Trạng thái: đã brainstorm + chốt hướng (2026-07-23). Nối tiếp
> [passport theme](2026-07-22-portal-creator-passport-theme-design.md) đã áp cho cả 5 dashboard con.

## Bối cảnh & vấn đề

Trang landing `/portal` (`portal/page.tsx` — server component chọn vai) hiện có 2 vấn đề Anh Quang nêu:
1. **Vẫn dùng theme cũ (xanh-tím)** — chưa passport, lạc tông với 5 dashboard con vừa đổi.
2. **Hero quá to** (tiêu đề 42px gradient cầu vồng + đoạn văn ~62ch + 4 ô thống kê giãn 30px) đẩy
   5 thẻ vai xuống dưới fold → **phải lăn chuột mới thấy hết 5 vai**.

Mục tiêu: làm landing gọn như **một trung tâm điều khiển thực thụ** — 5 lối vào vai hiện gọn trong
1 khung, không cần scroll — và đồng bộ passport (navy/brass, bản sắc "Trạm điều hành biên giới").

## Quyết định thiết kế

1. **Palette passport**: thêm `data-shell-variant="passport"` lên gốc `.app` của landing → mọi token
   (nền, chữ, viền, brass) tự đổi, tái dùng đúng block đã có trong `portal.module.css`.
2. **Header gọn**: giữ logo + brand trái, `ThemeToggle` + "Xem prototype" phải — restyle brass. Giữ
   `data-testid="link-mockup"`.
3. **Hero thu gọn tối đa**:
   - Bỏ tiêu đề 42px gradient cầu vồng → **tiêu đề serif "Trạm điều hành biên giới"** (font-stack
     `Cambria, Georgia, ...` như header hộ chiếu, ~30px) — dứt khoát bỏ cảm giác "AI chung chung".
   - Đoạn văn dài → **1 dòng phụ ngắn**.
   - 4 số liệu (2 nước / 5 vai / 3 kết cục payout / 100% audit) → **1 dải mảnh ngang**, cỡ nhỏ.
4. **5 thẻ vai — hàng 5 quầy ngang** (Anh Quang chọn): `.roleGrid` → `repeat(5, 1fr)`, `.roleCard`
   nén lại (padding/icon/gap nhỏ hơn). Mỗi thẻ giữ **màu bản sắc vai** (`--rc`: creator tím / ops
   xanh dương / admin ngọc / finance lục / global hổ phách) làm dải màu + nền icon → 5 quầy phân biệt
   rõ trên nền navy. **Mô tả mỗi vai rút còn 1 dòng ngắn** (đổi copy — Anh Quang đã đồng ý ở bước chọn
   bố cục): 
   - Creator: "KYC → chiến dịch → nộp nội dung → rút tiền"
   - Local Ops: "Duyệt KYC & nội dung theo từng nước"
   - Local Admin: "Tạo & quản chiến dịch, quy tắc thưởng"
   - Local Finance: "Đối soát, khoá batch & payout an toàn"
   - Global Admin: "Cấu hình nước, cờ tính năng, audit toàn cục"
5. **Footer mảnh** giữ nguyên: dòng disclose demo + link `/vn` `/ph`.
6. Toàn bộ khung canh vừa ~1 màn (không ép cứng `height:100vh` gây tràn ở màn thấp — chỉ nén padding/
   margin để nội dung desktop bình thường không phải scroll).

## Ràng buộc kỹ thuật bắt buộc

1. **Không đổi bất kỳ `data-testid`**: `enter-{creator,ops,admin,finance,global}` (trong `RoleGrid`),
   `link-mockup`, `link-vn`, `link-ph`. E2E `portal-role-entry.spec.ts`, `portal-cross-link.spec.ts`,
   `creator-login.spec.ts`… tìm phần tử qua các id/tên này.
2. **Không đổi logic vào phiên**: `role-buttons.tsx` giữ nguyên `enterAs(role, "VN")` — chỉ đổi
   className/cấu trúc trình bày, không đụng luồng `mockLogin`.
3. **Dark/light vẫn chạy**: token passport đã có cả 2 theme; landing dùng biến token, không hardcode.
4. Thay đổi giới hạn trong `portal/page.tsx`, `portal/role-buttons.tsx` (nếu cần), `portal.module.css`
   (khối landing). Không đụng `/mockup`, không đụng 5 dashboard con (đã xong).

## Phạm vi

Chỉ trang landing `/portal`. Không đụng dashboard con. Không thêm webfont/dependency.

## Test plan

- `portal-role-entry.spec.ts` + `portal-cross-link.spec.ts` (dùng `enter-*` từ landing) phải xanh
  nguyên vẹn không sửa spec → chứng minh testid/luồng vào phiên còn đúng.
- Kiểm tra thủ công Playwright MCP ở khung desktop chuẩn (≥ 900px cao): xác nhận **thấy đủ 5 thẻ vai
  không scroll**, dark/light đều đúng palette, đổi VN/PH không áp dụng (landing tĩnh VN).
