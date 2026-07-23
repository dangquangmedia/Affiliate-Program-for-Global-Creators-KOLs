# BÁO CÁO TUẦN 7 — GO BACKEND REWRITE (GOOGLE CLOUD STAGING)

> Dự án: Affiliate GLOBAL
> Ngày kiểm chứng: 23/07/2026
> Kế hoạch đối chiếu: `Plan/GO_BACKEND_REWRITE_PLAN.md` — Tuần 7
> Kết luận: **PASS PHẦN THỰC THI ĐƯỢC TRÊN MÁY (7/7 hạng mục diễn tập) — 1/4 gate ĐẠT TRỌN,
> 3/4 gate ĐẠT PHẦN KIỂM CHỨNG ĐƯỢC, phần còn lại CHỜ project Google Cloud có billing.**

## 0. Ranh giới trung thực của báo cáo này

Tuần 7 theo kế hoạch là dựng **staging thật trên Google Cloud**. Việc đó cần một project có
**billing** (Cloud SQL là dịch vụ tính tiền) và một lần `gcloud auth login` của chủ tài khoản.
Quyết định của Anh Quang: **chuẩn bị đầy đủ, chưa tốn tiền**.

Vì vậy báo cáo phân biệt rõ hai loại kết quả:

- **ĐÃ CHẠY THẬT** — diễn tập trọn trình tự release trên máy, bằng **đúng image production** sẽ đẩy
  lên Artifact Registry, với database riêng, cùng entrypoint và cùng biến môi trường Cloud Run dùng.
- **ĐÃ VIẾT, CHƯA CHẠY TRÊN GCP** — script `deploy/gcp/*.sh` (đã kiểm cú pháp `bash -n`, tham số hoá,
  idempotent) và alert policy. Không có emulator nào cho Cloud Run/Cloud SQL/Scheduler, nên không thể
  giả lập; sẽ chạy khi có billing.

Không có dòng nào trong báo cáo này khẳng định đã deploy lên Google Cloud.

## 1. Phạm vi đã triển khai

| Hạng mục | Sản phẩm |
|---|---|
| Image production | `apps/api-go/Dockerfile` — multi-stage, distroless `nonroot`, 4 binary (`api`/`migrate`/`seed`/`reclaim`), `PORT=8080` theo quy ước Cloud Run |
| Diễn tập release | `compose.staging.yaml` + `scripts/staging-rehearsal.mjs` — 7 hạng mục, một lệnh, tự dọn |
| Smoke money-spine | `scripts/smoke.mjs` — 26 bước qua HTTP thuần, chạy với **bất kỳ** base URL (container local hoặc Cloud Run) |
| Script deploy GCP | `deploy/gcp/` — bootstrap, build/push theo commit SHA, Cloud SQL + Secret Manager, migration job, deploy no-traffic → smoke → chuyển traffic, reclaim job + Scheduler OIDC, alert policy, rollback |
| Runbook | `docs/RUNBOOK_STAGING.md` — kiến trúc, trình tự release, deploy frontend, bảng xử lý sự cố, rollback/restore |
| Hardening code | Config nhận DSN Cloud SQL unix socket; test chống lộ secret trong log |

## 2. Hai khiếm khuyết THẬT phát hiện khi chuẩn bị deploy

Đây là giá trị chính của việc diễn tập trước khi bấm deploy — cả hai đều sẽ làm hỏng lần deploy đầu:

**(a) API không kết nối được Cloud SQL.** Cloud Run nối Cloud SQL qua **unix socket**, nên DSN không
có host TCP: `postgresql://user:pass@/db?host=/cloudsql/PROJECT:REGION:INSTANCE`.
`internal/config.normalizeDatabaseURL` đang **từ chối** mọi URL có `Host == ""` → API sẽ chết ngay ở
`config_invalid` trên revision đầu tiên. Đã sửa: chấp nhận DSN dạng socket (và chỉ dạng đó), tự đặt
`sslmode=disable` vì TLS vô nghĩa trên unix socket, vẫn **không** đụng tới DSN remote để không âm
thầm hạ cấp bảo mật. Khoá lại bằng `TestCloudSQLUnixSocketDSNIsAccepted` và
`TestDatabaseURLWithoutHostOrSocketIsRejected`.

**(b) Image lệch cổng.** Dockerfile `EXPOSE 8080` nhưng không đặt `PORT`, mà mặc định trong code là
`3001` → container tự chạy sẽ nghe sai cổng so với khai báo. Cloud Run tự tiêm `PORT` nên sẽ không lộ
ra ở đó, nhưng mọi lần chạy image tại chỗ (kể cả diễn tập này) đều sai. Đã đặt `ENV PORT=8080`.

Ngoài ra, khi dựng diễn tập còn phát hiện `Dockerfile` production phải build với **context
`apps/api-go`** (không phải gốc repo); build sai context chỉ "qua" khi còn cache của lần build đúng
trước đó. Đã ghi rõ trong `scripts/staging-rehearsal.mjs` và `deploy/gcp/10-build-push.sh`.

## 3. Bằng chứng diễn tập — ĐÃ CHẠY THẬT

`node scripts/staging-rehearsal.mjs` → **REHEARSAL PASS (7/7)**:

| # | Hạng mục | Kết quả thật |
|---:|---|---|
| 1 | Image non-root | `USER=nonroot:nonroot` (đọc từ `docker image inspect`) |
| 2 | Migration job trên DB rỗng | `version=3 dirty=false` — chạy bằng **job riêng**, không nằm trong startup API |
| 3 | Service healthy | `PORT=8080` → `{"db":"up","status":"ok"}` |
| 4 | Smoke money-spine VN | **26 bước xanh** qua container |
| 5 | Reclaim job chạy hai lần | cả hai lần `reclaim_sweep_complete reclaimed=0 promoted=0` — không side effect sai |
| 6 | Log sạch bí mật | 31 dòng `http_request`, **0/7** mẫu cấm khớp |
| 7 | Graceful shutdown | nhận SIGTERM → `api_stopped`, không bị kill cứng |

Chi tiết 26 bước smoke (chạy trên `http://127.0.0.1:8081` — container image production):
health → catalog → market context → login 5 vai → session Bearer → **thiếu session 401** → tạo
country profile → KYC submit → **creator vào queue Ops 403** → Ops duyệt KYC (APPROVED) → Admin tạo
campaign → join (JOINED) → **join lặp không nhân đôi suất** → nộp content → Ops duyệt → earning
(gross 1.000.000, tax 100.000, net 900.000 VND, `net = gross − tax`, số nguyên minor units) → tạo
batch đối soát → lock (LOCKED) → **lock lần hai 409** → ví `withdrawable=900000 VND` → OTP → tạo lệnh
rút → settle SUCCESS (**PAID**) → **settle lần hai 409** → audit 6 sự kiện → **sai vai xem audit 403**.

## 4. Kiểm chứng bằng test tự động (chạy trong phiên này)

| Kiểm tra | Lệnh | Kết quả |
|---|---|---|
| `gofmt -l apps/api-go` | — | sạch |
| `go vet ./...` + ESLint | `corepack pnpm run lint` | PASS |
| Toàn bộ test Go | `corepack pnpm run test:api` | PASS |
| Test cấu hình Cloud SQL DSN | `go test ./internal/config/...` | PASS (2 test mới) |
| Test chống lộ secret trong log | `go test ./internal/httpapi/...` | PASS (2 test mới) |
| Cú pháp 9 script deploy | `bash -n deploy/gcp/*.sh` | PASS |

`TestAccessLogDoesNotLeakSecrets` gửi request có `Authorization: Bearer …`, body chứa mã OTP và
`idNumber`/`bankAccount`/`taxId`, rồi khẳng định log **không** chứa bất kỳ giá trị nào trong số đó mà
vẫn giữ đủ `method`/`path`/`status`. `TestRecoveryReturnsErrorEnvelopeWithoutRequestData` khẳng định
panic trả đúng error envelope và không rò token ra response lẫn log.

## 5. Đối chiếu 4 gate cuối Tuần 7

| Gate kế hoạch | Trạng thái | Căn cứ |
|---|---|---|
| Migration job thành công trên DB staging rỗng **và bản restore** | **ĐẠT PHẦN** | DB rỗng: ĐÃ CHẠY THẬT (`version=3 dirty=false`, job riêng). Bản restore: **CHƯA** — cần Cloud SQL backup thật. Quy trình đã viết ở runbook mục 6. |
| API/Web staging chạy **trọn money-spine** | **ĐẠT PHẦN** | API: ĐÃ CHẠY THẬT trọn money-spine qua image production (26 bước). Web trên staging: **CHƯA deploy**; đường nối đã sẵn (`API_BASE_URL` → rewrite `/api-proxy`), hướng dẫn ở runbook mục 3. |
| Reclaim Scheduler **authenticated**, không dùng timer trong API | **ĐẠT PHẦN** | Không timer trong API: ĐẠT (kiểm bằng code — `cmd/reclaim` quét một lượt rồi exit; API không có scheduler). Job idempotent: ĐÃ CHẠY THẬT (hai lần). Scheduler OIDC: **đã viết** `50-reclaim.sh` với service account riêng chỉ có `roles/run.invoker`, **chưa tạo** trên project thật. |
| Log **không lộ** token, OTP hoặc dữ liệu KYC | **ĐẠT** | Kiểm hai tầng: test Go (`TestAccessLogDoesNotLeakSecrets`) và soát log container thật trong diễn tập (0/7 mẫu cấm khớp trên 31 dòng `http_request`). |

## 6. Việc còn lại để đóng Tuần 7 trên Google Cloud

Khi có project + billing, đúng 5 lệnh (chi tiết ở `deploy/gcp/README.md`):

```bash
gcloud auth login && cp deploy/gcp/env.example.sh deploy/gcp/env.sh   # sửa PROJECT_ID, WEB_ORIGIN
bash deploy/gcp/00-bootstrap.sh && bash deploy/gcp/20-database.sh
bash deploy/gcp/10-build-push.sh && bash deploy/gcp/30-migrate.sh
bash deploy/gcp/40-deploy-api.sh && bash deploy/gcp/50-reclaim.sh
bash deploy/gcp/60-monitoring.sh
```

Chi phí chính là Cloud SQL (`db-f1-micro` ~10–25 USD/tháng); Cloud Run/Scheduler ở mức demo gần như
miễn phí. Xoá instance sau khi demo mentor thì chi phí gần bằng không.

Sau khi chạy xong, phần **chưa kiểm chứng được ở local** cần verify thật: alert policy có bắn đúng
không, Scheduler gọi job có được xác thực OIDC không, và restore backup có ra đúng schema không.

## 7. Ranh giới bàn giao

Tuần 7 đóng ở: **image production + toàn bộ trình tự release đã diễn tập trọn vẹn trên máy, script
deploy và runbook đã sẵn sàng, hai khiếm khuyết chặn deploy đã được tìm và sửa trước khi tốn tiền
cloud**. Chưa có staging thật trên Google Cloud, chưa soak/rollback rehearsal trên hạ tầng thật
(Tuần 8). Đây là ranh giới đúng với quyết định phạm vi của Anh Quang, không phải thiếu sót bị bỏ qua.
