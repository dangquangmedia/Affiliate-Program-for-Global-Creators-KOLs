# Sao chép thành `deploy/gcp/env.sh` rồi sửa. File `env.sh` bị .gitignore vì chứa tên project thật.
#   cp deploy/gcp/env.example.sh deploy/gcp/env.sh
#
# Không đặt mật khẩu/secret ở đây. Mật khẩu database do `20-database.sh` sinh ngẫu nhiên và nạp
# thẳng vào Secret Manager; không bao giờ nằm trong repo hay biến môi trường của máy dev.

export PROJECT_ID="doi-ten-project-cua-ban"
export REGION="asia-southeast1"          # gần VN/PH nhất
export AR_REPO="affiliate"               # Artifact Registry repository
export SERVICE_NAME="affiliate-api"      # Cloud Run service
export MIGRATE_JOB="affiliate-migrate"   # Cloud Run Job chạy migration
export RECLAIM_JOB="affiliate-reclaim"   # Cloud Run Job quét reclaim
export SCHEDULER_JOB="affiliate-reclaim-schedule"
export SCHEDULE_CRON="*/15 * * * *"      # tần suất gọi reclaim
export SCHEDULE_TZ="Asia/Ho_Chi_Minh"

export SQL_INSTANCE="affiliate-pg"
export SQL_TIER="db-f1-micro"            # nhỏ nhất; nâng khi cần
export SQL_DB="affiliate_global"
export SQL_USER="affiliate_app"
export DB_SECRET="affiliate-database-url"

export API_SA="affiliate-api-sa"
export JOBS_SA="affiliate-jobs-sa"
export SCHEDULER_SA="affiliate-scheduler-sa"

# Origin của frontend staging — Go API dùng đúng giá trị này cho CORS.
export WEB_ORIGIN="https://affiliate-web-staging.example.com"

# Cloud Run: mỗi instance mở tối đa DB_MAX_CONNS kết nối. Tổng kết nối tối đa =
# DB_MAX_CONNS × MAX_INSTANCES và PHẢI nhỏ hơn max_connections của Cloud SQL (db-f1-micro ~25).
export DB_MAX_CONNS="5"
export MAX_INSTANCES="4"
export CONCURRENCY="40"
export CPU="1"
export MEMORY="512Mi"

# Email nhận alert (để trống thì 60-monitoring.sh bỏ qua bước tạo notification channel).
export ALERT_EMAIL=""
