/** @type {import('next').NextConfig} */

// Trình duyệt của người xem từ xa (mentor qua tunnel ngrok) KHÔNG thấy được `localhost:3001`.
// Vì vậy Next đảm nhiệm luôn vai trò reverse proxy: mọi request `/api-proxy/*` được chuyển tiếp
// sang API Go. Nhờ đó chỉ cần MỘT tunnel (trỏ vào web) và không dính CORS vì cùng origin.
// Dev/E2E cục bộ không đổi: client vẫn mặc định gọi thẳng `http://localhost:3001`.
const API_ORIGIN = process.env.API_BASE_URL ?? "http://localhost:3001";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api-proxy/:path*", destination: `${API_ORIGIN}/:path*` }];
  },
  // Next dev chặn request cross-origin từ host lạ; cho phép các domain tunnel của ngrok.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app", "*.ngrok-free.dev", "*.ngrok.io"],
};

export default nextConfig;
