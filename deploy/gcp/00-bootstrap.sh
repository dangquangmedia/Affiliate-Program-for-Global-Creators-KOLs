#!/usr/bin/env bash
# Bật API, tạo Artifact Registry và 3 service account với quyền tối thiểu.
# Chạy MỘT LẦN cho mỗi project. An toàn khi chạy lại (mọi bước đều kiểm tra tồn tại trước).
set -euo pipefail
cd "$(dirname "$0")"
source ./env.sh

echo "== Project: $PROJECT_ID · Region: $REGION =="
gcloud config set project "$PROJECT_ID" >/dev/null

echo "-- bật API cần dùng --"
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudbuild.googleapis.com \
  monitoring.googleapis.com \
  logging.googleapis.com

echo "-- Artifact Registry --"
if ! gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker --location="$REGION" \
    --description="Affiliate GLOBAL container images"
fi

create_sa() {
  local name="$1" display="$2"
  if ! gcloud iam service-accounts describe "${name}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$name" --display-name="$display"
  fi
}

echo "-- service accounts --"
create_sa "$API_SA" "Affiliate Cloud Run API"
create_sa "$JOBS_SA" "Affiliate Cloud Run Jobs (migrate/reclaim)"
create_sa "$SCHEDULER_SA" "Affiliate Cloud Scheduler invoker"

grant() {
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$1@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="$2" --condition=None >/dev/null
}

echo "-- IAM tối thiểu --"
# API: mở kết nối Cloud SQL + đọc đúng secret DATABASE_URL (gán ở 20-database.sh, phạm vi secret).
grant "$API_SA" roles/cloudsql.client
# Jobs: cùng quyền, vì migrate/reclaim cũng chạm database.
grant "$JOBS_SA" roles/cloudsql.client
# Scheduler chỉ được phép kích hoạt job, không có quyền gì thêm.
grant "$SCHEDULER_SA" roles/run.invoker

echo "BOOTSTRAP OK"
