# RUNBOOK — STAGING GOOGLE CLOUD (GO API)

> Đối tượng: người trực vận hành staging. Mục tiêu: release được, phát hiện được sự cố, và quay lui
> được — không phải đọc lại code mới biết làm gì.
> Kế hoạch gốc: `Plan/GO_BACKEND_REWRITE_PLAN.md` (Tuần 7–8). Script: `deploy/gcp/`.

## 1. Kiến trúc chạy thật

```text
Next.js Web  ──HTTP/JSON + Bearer──▶  Cloud Run: affiliate-api  ──unix socket──▶  Cloud SQL (PostgreSQL 17)
                                            ▲                                          ▲
Cloud Scheduler ──OIDC──▶ Cloud Run Job: affiliate-reclaim ───────────────────────────┘
                          Cloud Run Job: affiliate-migrate  (chạy tay trước mỗi release)
Secret Manager: affiliate-database-url   ·   Artifact Registry: api:<commit-sha>
```

Nguyên tắc bất di bất dịch:

- **Migration không chạy trong startup API.** Chỉ chạy bằng job, trước khi chuyển traffic.
- **Reclaim không dùng timer trong API.** Cloud Scheduler gọi job; job quét đúng một lượt rồi exit.
- **Image gắn commit SHA.** Không dùng `latest` để cutover.
- **Forward-only migration.** Sửa sai bằng restore, không bằng down-migration.

## 2. Release (thứ tự bắt buộc)

```bash
bash deploy/gcp/10-build-push.sh    # → deploy/gcp/.last-image
bash deploy/gcp/30-migrate.sh       # backup Cloud SQL → migrate → in version
bash deploy/gcp/35-seed.sh          # reference (VN/PH) + demo; SEED_DEMO=0 nếu không muốn dữ liệu demo
bash deploy/gcp/40-deploy-api.sh    # revision --no-traffic → smoke → chuyển traffic → smoke lại
```

Bỏ bước seed thì smoke ở bước 40 sẽ fail: không có country → 404, không có `role_assignment` → Ops
duyệt KYC trả 403. Seed idempotent nên các release sau chạy lại vô hại.

Điều kiện dừng: **migration hỏng thì DỪNG**, không deploy API mới. Smoke trên revision ứng viên hỏng
thì cũng dừng — traffic chưa hề chuyển, chỉ cần xoá revision.

## 3. Deploy frontend trỏ vào API staging

Trình duyệt **không** gọi thẳng Cloud Run: `apps/web/src/lib/api-base.ts` luôn gọi đường tương đối
`/api-proxy/*`, và `apps/web/next.config.mjs` rewrite đường đó sang `API_BASE_URL` — biến **phía
server**, đọc lúc khởi động. Vì vậy chỉ cần đặt một biến khi deploy web:

```bash
API_BASE_URL=https://affiliate-api-xxxxx.a.run.app   # URL Cloud Run
```

Và đặt `WEB_ORIGIN` của API bằng đúng origin của web (biến trong `deploy/gcp/env.sh`) để CORS khớp.
Đổi `WEB_ORIGIN` phải deploy lại API mới có hiệu lực.

## 4. Kiểm chứng sau mỗi lần release

```bash
node scripts/smoke.mjs https://<api-url>      # 26 bước: KYC → campaign → content → earning
                                              # → đối soát → ví → OTP → payout → PAID → audit
```

Smoke cố ý bao gồm cả các khẳng định âm tính: thiếu session → 401, sai vai → 403, lock lần hai → 409,
settle lần hai → 409. Xanh hết mới coi là release thành công.

## 5. Bảng xử lý sự cố

| Triệu chứng | Kiểm tra đầu tiên | Xử lý |
|---|---|---|
| Alert **5xx cao** | `gcloud run services logs read affiliate-api --region=$REGION --limit=100` | Lỗi do revision mới → `bash deploy/gcp/90-rollback.sh`. Lỗi do database → xem hàng dưới. |
| **Latency p95 cao** | Metric `num_backends` của Cloud SQL | Pool cạn: giảm `MAX_INSTANCES` hoặc `DB_MAX_CONNS`, hoặc nâng tier. Nhớ `DB_MAX_CONNS × MAX_INSTANCES < max_connections`. |
| **Job migrate failed** | `gcloud run jobs executions list --job=affiliate-migrate --region=$REGION` | DỪNG release. Không chuyển traffic. Đọc log; nếu schema đã sửa dở → restore từ backup vừa tạo ở bước 30. |
| **Job reclaim failed** | Log execution gần nhất | Job idempotent, chạy lại an toàn: `gcloud run jobs execute affiliate-reclaim --region=$REGION --wait`. |
| **Payout treo ở `UNKNOWN_HOLD`** | `GET /ops/{market}/payouts/holds` | **Không** tự release tiền. Đối chiếu với provider rồi mới `POST /ops/{market}/payouts/{id}/resolve` với `SUCCESS` hoặc `FAIL`. Release vội = nguy cơ trả tiền hai lần. |
| **Nghi ngờ hỏng dữ liệu tiền** | So `SUM(ledger_entries)` với `payout_requests` | DỪNG mọi thao tác tiền (đặt `MAX_INSTANCES=0` để chặn traffic), rồi restore theo mục 6. Tuyệt đối không chạy down-migration. |
| **Không đăng nhập được** | `GET /health` | 503 = mất database. Kiểm tra Cloud SQL đang chạy và secret còn đúng. |

## 6. Rollback và restore

**Rollback traffic** (an toàn khi schema còn backward-compatible):

```bash
bash deploy/gcp/90-rollback.sh              # về revision lành gần nhất + smoke lại
bash deploy/gcp/90-rollback.sh <REVISION>   # về đúng revision chỉ định
```

**Restore database** (chỉ khi hỏng dữ liệu, luôn phải diễn tập trước khi cần thật):

```bash
gcloud sql backups list --instance=$SQL_INSTANCE
gcloud sql backups restore <BACKUP_ID> --restore-instance=$SQL_INSTANCE   # ghi đè, cân nhắc kỹ
# hoặc PITR sang instance mới rồi đổi DSN trong Secret Manager:
gcloud sql instances clone $SQL_INSTANCE ${SQL_INSTANCE}-pitr --point-in-time=<RFC3339>
```

Sau restore: chạy lại `30-migrate.sh` (version phải khớp) rồi `node scripts/smoke.mjs` trước khi mở
lại traffic.

**Giữ đường lui:** không xoá revision/image cũ ngay sau cutover. Bản NestJS vẫn còn trong repo làm
oracle differential và fallback cho tới khi staging ổn định qua cửa sổ soak đã chốt (Tuần 8).

## 7. Diễn tập trên máy (không tốn tiền cloud)

Toàn bộ trình tự trên chạy được bằng đúng image production, database riêng, không cần GCP:

```bash
node scripts/staging-rehearsal.mjs          # 7 hạng mục, tự dọn
node scripts/staging-rehearsal.mjs --keep   # giữ stack lại để xem tay
```

Diễn tập kiểm: image non-root · migration job trên DB rỗng · service healthy · smoke money-spine ·
reclaim job chạy hai lần · log không lộ bí mật · graceful shutdown khi nhận SIGTERM.
