#!/usr/bin/env bash
# Reclaim chạy bằng Cloud Run Job + Cloud Scheduler (OIDC), KHÔNG dùng timer trong API.
# Lý do: instance Cloud Run bị thu hồi khi rảnh, timer trong process sẽ chạy chập chờn và nhân bản
# theo số instance. `cmd/reclaim` cố ý chỉ quét đúng một lượt rồi exit.
set -euo pipefail
cd "$(dirname "$0")"
source ./env.sh

IMAGE="${1:-$(cat ./.last-image 2>/dev/null || true)}"
[ -n "$IMAGE" ] || { echo "Thiếu image. Chạy 10-build-push.sh trước, hoặc truyền image làm tham số." >&2; exit 1; }
INSTANCE_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

echo "== Deploy job $RECLAIM_JOB =="
gcloud run jobs deploy "$RECLAIM_JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --service-account="${JOBS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --set-cloudsql-instances="$INSTANCE_CONNECTION" \
  --set-secrets="DATABASE_URL=${DB_SECRET}:latest" \
  --command="/app/reclaim" \
  --max-retries=1 \
  --task-timeout=5m

echo "== Chạy thử một lượt =="
gcloud run jobs execute "$RECLAIM_JOB" --region="$REGION" --wait

RUN_URI="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${RECLAIM_JOB}:run"

echo "== Cloud Scheduler (xác thực OIDC, không public) =="
if gcloud scheduler jobs describe "$SCHEDULER_JOB" --location="$REGION" >/dev/null 2>&1; then
  ACTION=update
else
  ACTION=create
fi
gcloud scheduler jobs "$ACTION" http "$SCHEDULER_JOB" \
  --location="$REGION" \
  --schedule="$SCHEDULE_CRON" \
  --time-zone="$SCHEDULE_TZ" \
  --uri="$RUN_URI" \
  --http-method=POST \
  --oauth-service-account-email="${SCHEDULER_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --attempt-deadline=300s

echo "RECLAIM OK · lịch: $SCHEDULE_CRON ($SCHEDULE_TZ)"
