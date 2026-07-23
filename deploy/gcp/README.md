# Deploy Go API lên Google Cloud (staging)

Bộ script cho Tuần 7 của `Plan/GO_BACKEND_REWRITE_PLAN.md`. Tất cả tham số hoá qua `env.sh`, không
hard-code project, và **idempotent** — chạy lại không hỏng thứ đã tạo.

> Trạng thái: **chưa chạy trên project thật** (chưa bật billing). Trình tự đã được diễn tập trọn vẹn
> trên máy bằng đúng image production — xem `scripts/staging-rehearsal.mjs` và
> `Report/GO_WEEK7_COMPLETION.md`.

## Chuẩn bị một lần

```bash
gcloud auth login
cp deploy/gcp/env.example.sh deploy/gcp/env.sh   # sửa PROJECT_ID, WEB_ORIGIN, ALERT_EMAIL
bash deploy/gcp/00-bootstrap.sh                  # bật API, Artifact Registry, 3 service account
bash deploy/gcp/20-database.sh                   # Cloud SQL + user + DATABASE_URL vào Secret Manager
```

## Mỗi lần release

```bash
bash deploy/gcp/10-build-push.sh    # image gắn commit SHA (không dùng tag latest)
bash deploy/gcp/30-migrate.sh      # backup → migration job → kiểm tra version
bash deploy/gcp/35-seed.sh         # reference (country VN/PH) + demo (tài khoản, campaign mẫu)
bash deploy/gcp/40-deploy-api.sh   # revision no-traffic → smoke → mới chuyển traffic
bash deploy/gcp/50-reclaim.sh      # job reclaim + Cloud Scheduler (OIDC)
bash deploy/gcp/60-monitoring.sh   # alert 5xx / latency / kết nối SQL / job failure
```

Hỏng thì:

```bash
bash deploy/gcp/90-rollback.sh     # quay traffic về revision lành + smoke lại
```

## Vì sao chia đúng các bước này

| Quyết định | Lý do |
|---|---|
| Seed là **job riêng**, chạy sau migration và trước khi smoke | Schema rỗng không có country VN/PH → mọi request có country context trả 404; không có `role_assignment` → smoke chết ở bước Ops duyệt KYC (403). Seed idempotent nên chạy lại vô hại. `SEED_DEMO=0` để bỏ dữ liệu demo ở môi trường thật |
| Migration là **Cloud Run Job**, không chạy trong startup API | Nhiều instance khởi động song song sẽ đua nhau migrate; và một migration hỏng không được phép làm chết service |
| Image gắn **commit SHA**, không `latest` | Revision phải trỏ vào một artifact bất biến thì rollback mới xác định được |
| Deploy `--no-traffic` rồi mới smoke | Lỗi bị chặn trước khi chạm người dùng; smoke chạy trên đúng revision ứng viên qua tag `candidate` |
| Reclaim là **job + Scheduler**, không phải timer trong API | Instance Cloud Run bị thu hồi khi rảnh; timer sẽ chạy chập chờn và nhân bản theo số instance |
| DSN nằm trong **Secret Manager**, chỉ 2 service account đọc được | Mật khẩu không bao giờ nằm trong repo, biến môi trường của máy dev, hay log |
| `DB_MAX_CONNS × MAX_INSTANCES` < `max_connections` | Cloud Run scale ngang; pool nhân theo instance là cách cạn kết nối Cloud SQL nhanh nhất |
| Backup trước mỗi migration | Forward-only: sửa sai bằng restore, không bằng down-migration phá dữ liệu |

## File sinh ra khi chạy (đã .gitignore)

- `env.sh` — cấu hình thật, có tên project.
- `.last-image` — image tag của lần build gần nhất, để các script sau dùng lại.
