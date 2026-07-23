#!/usr/bin/env bash
# Cloud Run Job chạy migration. PHẢI chạy trước khi chuyển traffic sang revision mới, và KHÔNG bao
# giờ chạy tự động trong startup của API (kế hoạch mục 5: forward-only, tách khỏi vòng đời service).
set -euo pipefail
cd "$(dirname "$0")"
source ./env.sh

IMAGE="${1:-$(cat ./.last-image 2>/dev/null || true)}"
[ -n "$IMAGE" ] || { echo "Thiếu image. Chạy 10-build-push.sh trước, hoặc truyền image làm tham số." >&2; exit 1; }
INSTANCE_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

echo "== Backup Cloud SQL trước khi migrate =="
gcloud sql backups create --instance="$SQL_INSTANCE" --description="pre-migrate $(date -u +%FT%TZ)"

echo "== Deploy job $MIGRATE_JOB ($IMAGE) =="
gcloud run jobs deploy "$MIGRATE_JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --service-account="${JOBS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --set-cloudsql-instances="$INSTANCE_CONNECTION" \
  --set-secrets="DATABASE_URL=${DB_SECRET}:latest" \
  --command="/app/migrate" \
  --args="up" \
  --max-retries=0 \
  --task-timeout=10m

echo "== Thực thi migration =="
gcloud run jobs execute "$MIGRATE_JOB" --region="$REGION" --wait

echo "== Xác nhận version schema =="
gcloud run jobs update "$MIGRATE_JOB" --region="$REGION" --args="version" >/dev/null
gcloud run jobs execute "$MIGRATE_JOB" --region="$REGION" --wait
gcloud run jobs update "$MIGRATE_JOB" --region="$REGION" --args="up" >/dev/null
echo "Xem dòng 'version=... dirty=false' trong log execution vừa rồi:"
echo "  gcloud run jobs executions list --job=$MIGRATE_JOB --region=$REGION --limit=1"

echo "MIGRATE OK"
