// Địa chỉ API mà TRÌNH DUYỆT dùng. Trước đây mỗi client lặp lại một dòng
// `process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"`; gom về một chỗ để đổi một lần.
//
// Mặc định là đường TƯƠNG ĐỐI `/api-proxy` — `next.config.mjs` rewrite nó về API Go (đích lấy từ
// `API_BASE_URL` lúc server khởi động). Hai lý do:
//   1. Người xem từ xa (mentor qua tunnel ngrok) không thấy `localhost` của máy dev; đường tương đối
//      luôn trỏ đúng về nơi họ đang mở, lại cùng origin nên không dính CORS.
//   2. `NEXT_PUBLIC_*` bị nhúng cứng vào bundle lúc biên dịch. Khi chạy E2E song song với `dev:web`,
//      hai tiến trình Next ghi chung `apps/web/.next` và bundle bị nhúng cổng của tiến trình kia
//      (đã xảy ra: trang phục vụ ra tunnel gọi `localhost:3101`). Không nhúng thì không hỏng được.
//
// Vẫn chừa lối thoát: đặt `NEXT_PUBLIC_API_BASE_URL` nếu cần gọi thẳng một API khác origin.

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api-proxy";
