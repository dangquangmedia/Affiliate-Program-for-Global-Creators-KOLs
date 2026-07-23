#!/usr/bin/env bash
# Deploy revision KHÔNG nhận traffic → smoke đúng revision đó → mới chuyển traffic.
# Đây là bước "deploy Go revision không nhận traffic → smoke test revision → chuyển traffic có kiểm
# soát" của trình tự release trong kế hoạch mục 10.
set -euo pipefail
cd "$(dirname "$0")"
source ./env.sh
repo_root="$(cd ../.. && pwd)"

IMAGE="${1:-$(cat ./.last-image 2>/dev/null || true)}"
[ -n "$IMAGE" ] || { echo "Thiếu image. Chạy 10-build-push.sh trước, hoặc truyền image làm tham số." >&2; exit 1; }
INSTANCE_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

echo "== Deploy revision (no-traffic) =="
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --service-account="${API_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --set-cloudsql-instances="$INSTANCE_CONNECTION" \
  --set-secrets="DATABASE_URL=${DB_SECRET}:latest" \
  --set-env-vars="WEB_ORIGIN=${WEB_ORIGIN},DB_MAX_CONNS=${DB_MAX_CONNS}" \
  --cpu="$CPU" --memory="$MEMORY" \
  --min-instances=0 --max-instances="$MAX_INSTANCES" \
  --concurrency="$CONCURRENCY" \
  --timeout=60s \
  --allow-unauthenticated \
  --no-traffic \
  --tag=candidate

CANDIDATE_URL="$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" \
  --format='value(status.traffic.filter(tag:candidate).extract(url))' | tr -d '[]')"
echo "Revision ứng viên: $CANDIDATE_URL"

echo "== Smoke money-spine trên revision ứng viên (chưa nhận traffic) =="
node "$repo_root/scripts/smoke.mjs" "$CANDIDATE_URL"

echo "== Smoke xanh → chuyển 100% traffic =="
gcloud run services update-traffic "$SERVICE_NAME" --region="$REGION" --to-latest

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')"
echo "== Smoke lại trên URL chính thức =="
node "$repo_root/scripts/smoke.mjs" "$SERVICE_URL"

echo "DEPLOY OK · $SERVICE_URL"
echo "Frontend: đặt API_BASE_URL=$SERVICE_URL rồi build/deploy lại web (xem docs/RUNBOOK_STAGING.md)."
