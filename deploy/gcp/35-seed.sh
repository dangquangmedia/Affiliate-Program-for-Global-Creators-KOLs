#!/usr/bin/env bash
# Nạp dữ liệu tham chiếu (+ demo nếu là staging) bằng Cloud Run Job dùng ĐÚNG image production.
#
# VÌ SAO PHẢI CÓ BƯỚC NÀY: migration chỉ tạo schema rỗng. `reference.sql` mới tạo country VN/PH +
# country_config — thiếu nó thì mọi request có country context trả 404. `demo.sql` tạo thêm
# app_user + role_assignment cho ops/admin/finance/global admin — thiếu nó thì smoke của
# `40-deploy-api.sh` sẽ chết ở bước Ops duyệt KYC (403), và deploy bị chặn lại ngay.
#
# Mặc định nạp CẢ HAI (staging cần tài khoản demo). Với môi trường thật:
#   SEED_DEMO=0 bash deploy/gcp/35-seed.sh      # chỉ reference.sql, KHÔNG có tài khoản demo
#
# Cả hai seed đều idempotent (ON CONFLICT), chạy lại nhiều lần không nhân đôi dữ liệu.
set -euo pipefail
cd "$(dirname "$0")"
source ./env.sh

IMAGE="${1:-$(cat ./.last-image 2>/dev/null || true)}"
[ -n "$IMAGE" ] || { echo "Thiếu image. Chạy 10-build-push.sh trước, hoặc truyền image làm tham số." >&2; exit 1; }
INSTANCE_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
SEED_JOB="${SEED_JOB:-affiliate-seed}"
SEED_DEMO="${SEED_DEMO:-1}"

echo "== Deploy job $SEED_JOB ($IMAGE) =="
gcloud run jobs deploy "$SEED_JOB" \
  --image="$IMAGE" \
  --region="$REGION" \
  --service-account="${JOBS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --set-cloudsql-instances="$INSTANCE_CONNECTION" \
  --set-secrets="DATABASE_URL=${DB_SECRET}:latest" \
  --command="/app/seed" \
  --args="reference.sql" \
  --max-retries=0 \
  --task-timeout=5m

echo "== Nạp reference.sql (country VN/PH + country_config) =="
gcloud run jobs execute "$SEED_JOB" --region="$REGION" --wait

if [ "$SEED_DEMO" = "1" ]; then
  echo "== Nạp demo.sql (tài khoản demo + campaign mẫu) =="
  gcloud run jobs update "$SEED_JOB" --region="$REGION" --args="demo.sql" >/dev/null
  gcloud run jobs execute "$SEED_JOB" --region="$REGION" --wait
  # Trả job về mặc định an toàn: lần chạy tay tiếp theo không vô tình nạp dữ liệu demo.
  gcloud run jobs update "$SEED_JOB" --region="$REGION" --args="reference.sql" >/dev/null
else
  echo "== BỎ QUA demo.sql (SEED_DEMO=0) — sẽ KHÔNG có tài khoản demo, smoke sẽ fail ở bước cần role =="
fi

echo "SEED OK"
