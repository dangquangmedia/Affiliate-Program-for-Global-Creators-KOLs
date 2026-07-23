#!/usr/bin/env bash
# Rollback traffic Cloud Run về một revision đã lành.
#
#   ./90-rollback.sh            # liệt kê revision rồi quay về revision lành gần nhất (áp chót)
#   ./90-rollback.sh REVISION   # quay về đúng revision chỉ định
#
# QUY TẮC (kế hoạch mục 10): rollback traffic CHỈ an toàn khi schema còn backward-compatible.
# Nếu nghi ngờ hỏng dữ liệu: DỪNG mọi thao tác tiền, không chạy down-migration, dùng restore/PITR
# theo docs/RUNBOOK_STAGING.md.
set -euo pipefail
cd "$(dirname "$0")"
source ./env.sh

echo "== Revision hiện có =="
gcloud run revisions list --service="$SERVICE_NAME" --region="$REGION" \
  --format='table(metadata.name, status.conditions[0].status, metadata.creationTimestamp)' --limit=10

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  TARGET="$(gcloud run revisions list --service="$SERVICE_NAME" --region="$REGION" \
    --format='value(metadata.name)' --sort-by='~metadata.creationTimestamp' --limit=2 | tail -n1)"
fi
[ -n "$TARGET" ] || { echo "Không tìm được revision đích." >&2; exit 1; }

echo "== Chuyển 100% traffic về $TARGET =="
gcloud run services update-traffic "$SERVICE_NAME" --region="$REGION" --to-revisions="${TARGET}=100"

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')"
echo "== Smoke lại sau rollback =="
node "$(cd ../.. && pwd)/scripts/smoke.mjs" "$SERVICE_URL"

echo "ROLLBACK OK · đang phục vụ bởi $TARGET · $SERVICE_URL"
