# Security and secrets policy

## Rule bắt buộc

- Không commit secret, access token, OAuth client secret, OTP seed, private key, database password hoặc dữ liệu KYC thật.
- Repo chỉ chứa `.env.example` với tên biến và giá trị giả an toàn.
- Secret local nằm trong `.env.local`/`.env.*`; các file này đã bị `.gitignore` chặn.
- Seed và ảnh KYC/content chỉ dùng dữ liệu synthetic, không dùng PII thật.
- Log/evidence phải redact token, cookie, OTP, bank account, tax identifier và signed URL.
- Nếu secret từng xuất hiện trong Git: revoke/rotate ngay; xóa khỏi working tree là chưa đủ.
- Production secret phải dùng secret manager của môi trường triển khai; không truyền qua chat hoặc tài liệu.

## Kiểm tra trước commit

1. Chạy `git status --short` và xem từng file mới.
2. Chạy `git diff --cached` trước khi commit.
3. Tìm dấu hiệu secret bằng `rg -n "(SECRET|TOKEN|PASSWORD|PRIVATE_KEY|CLIENT_SECRET)"` và xác nhận mọi kết quả chỉ là placeholder.
4. Không stage `Plan/00_PROJECT_EXECUTION_LOG.md` hoặc evidence private.

## Xử lý sự cố

1. Dừng sử dụng credential bị lộ.
2. Rotate/revoke tại provider.
3. Ghi incident không chứa giá trị secret.
4. Làm sạch history bằng quy trình được review riêng; không tự ý force-push.

