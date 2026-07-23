#!/usr/bin/env bash
# Cloud SQL PostgreSQL + user + DATABASE_URL nạp vào Secret Manager.
# Mật khẩu sinh ngẫu nhiên tại chỗ, KHÔNG in ra màn hình, KHÔNG lưu vào repo.
set -euo pipefail
cd "$(dirname "$0")"
source ./env.sh

INSTANCE_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

echo "== Cloud SQL instance =="
if ! gcloud sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1; then
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_17 \
    --tier="$SQL_TIER" \
    --region="$REGION" \
    --storage-auto-increase \
    --backup \
    --backup-start-time=18:00 \
    --retained-backups-count=7 \
    --database-flags=max_connections=50
else
  echo "instance $SQL_INSTANCE đã tồn tại"
fi

echo "== Database =="
gcloud sql databases describe "$SQL_DB" --instance="$SQL_INSTANCE" >/dev/null 2>&1 \
  || gcloud sql databases create "$SQL_DB" --instance="$SQL_INSTANCE"

echo "== User + secret =="
if gcloud secrets describe "$DB_SECRET" >/dev/null 2>&1; then
  echo "secret $DB_SECRET đã tồn tại — giữ nguyên mật khẩu hiện tại."
else
  PASSWORD="$(openssl rand -base64 30 | tr -d '/+=' | cut -c1-28)"
  gcloud sql users create "$SQL_USER" --instance="$SQL_INSTANCE" --password="$PASSWORD" >/dev/null 2>&1 \
    || gcloud sql users set-password "$SQL_USER" --instance="$SQL_INSTANCE" --password="$PASSWORD"

  # Cloud Run nối Cloud SQL qua unix socket, nên DSN không có host TCP; `?host=/cloudsql/...`.
  # `internal/config` chấp nhận đúng dạng này (xem TestCloudSQLUnixSocketDSNIsAccepted).
  DSN="postgresql://${SQL_USER}:${PASSWORD}@/${SQL_DB}?host=/cloudsql/${INSTANCE_CONNECTION}"
  printf '%s' "$DSN" | gcloud secrets create "$DB_SECRET" --data-file=- --replication-policy=automatic
  unset PASSWORD DSN
fi

echo "== Chỉ hai service account được đọc secret này =="
for sa in "$API_SA" "$JOBS_SA"; do
  gcloud secrets add-iam-policy-binding "$DB_SECRET" \
    --member="serviceAccount:${sa}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role=roles/secretmanager.secretAccessor --condition=None >/dev/null
done

echo "DATABASE OK · instance connection name: $INSTANCE_CONNECTION"
