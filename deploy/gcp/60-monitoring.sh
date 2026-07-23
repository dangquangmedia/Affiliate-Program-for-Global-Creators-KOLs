#!/usr/bin/env bash
# Log-based metric + alert policy tối thiểu để phát hiện sự cố: 5xx, latency, kết nối Cloud SQL
# gần cạn, và job (migrate/reclaim) chạy hỏng. Policy được sinh tại chỗ để nhúng đúng tên service.
set -euo pipefail
cd "$(dirname "$0")"
source ./env.sh

CHANNEL_ARG=()
if [ -n "${ALERT_EMAIL:-}" ]; then
  echo "== Notification channel (email) =="
  CHANNEL="$(gcloud beta monitoring channels list \
    --filter="type=email AND labels.email_address=${ALERT_EMAIL}" \
    --format='value(name)' | head -n1)"
  if [ -z "$CHANNEL" ]; then
    CHANNEL="$(gcloud beta monitoring channels create \
      --display-name="Affiliate alerts" --type=email \
      --channel-labels="email_address=${ALERT_EMAIL}" --format='value(name)')"
  fi
  CHANNEL_ARG=(--notification-channels="$CHANNEL")
else
  echo "ALERT_EMAIL trống — tạo policy nhưng chưa gắn kênh nhận thông báo."
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

cat > "$tmp/5xx.yaml" <<YAML
displayName: "Affiliate API · tỉ lệ 5xx cao"
documentation:
  content: "API trả 5xx liên tục. Xem log Cloud Run và cân nhắc rollback theo deploy/gcp/90-rollback.sh."
  mimeType: text/markdown
combiner: OR
conditions:
  - displayName: "Hơn 5 request 5xx trong 5 phút"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="${SERVICE_NAME}" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"'
      aggregations:
        - alignmentPeriod: 300s
          perSeriesAligner: ALIGN_SUM
          crossSeriesReducer: REDUCE_SUM
      comparison: COMPARISON_GT
      thresholdValue: 5
      duration: 0s
      trigger:
        count: 1
YAML

cat > "$tmp/latency.yaml" <<YAML
displayName: "Affiliate API · latency p95 cao"
documentation:
  content: "p95 vượt 2s trong 10 phút. Thường do pool database cạn hoặc truy vấn bị khoá."
  mimeType: text/markdown
combiner: OR
conditions:
  - displayName: "p95 > 2000ms trong 10 phút"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="${SERVICE_NAME}" AND metric.type="run.googleapis.com/request_latencies"'
      aggregations:
        - alignmentPeriod: 300s
          perSeriesAligner: ALIGN_PERCENTILE_95
          crossSeriesReducer: REDUCE_MAX
      comparison: COMPARISON_GT
      thresholdValue: 2000
      duration: 600s
      trigger:
        count: 1
YAML

cat > "$tmp/sql-connections.yaml" <<YAML
displayName: "Cloud SQL · kết nối gần cạn"
documentation:
  content: "Số kết nối chạm ngưỡng. Kiểm tra DB_MAX_CONNS × MAX_INSTANCES so với max_connections."
  mimeType: text/markdown
combiner: OR
conditions:
  - displayName: "Kết nối > 40"
    conditionThreshold:
      filter: 'resource.type="cloudsql_database" AND resource.labels.database_id="${PROJECT_ID}:${SQL_INSTANCE}" AND metric.type="cloudsql.googleapis.com/database/postgresql/num_backends"'
      aggregations:
        - alignmentPeriod: 300s
          perSeriesAligner: ALIGN_MAX
      comparison: COMPARISON_GT
      thresholdValue: 40
      duration: 300s
      trigger:
        count: 1
YAML

cat > "$tmp/job-failure.yaml" <<YAML
displayName: "Cloud Run Jobs · task thất bại"
documentation:
  content: "Job migrate hoặc reclaim thất bại. Migration hỏng thì DỪNG release, không chuyển traffic."
  mimeType: text/markdown
combiner: OR
conditions:
  - displayName: "Có task failed"
    conditionThreshold:
      filter: 'resource.type="cloud_run_job" AND metric.type="run.googleapis.com/job/completed_task_attempt_count" AND metric.labels.result="failed"'
      aggregations:
        - alignmentPeriod: 300s
          perSeriesAligner: ALIGN_SUM
          crossSeriesReducer: REDUCE_SUM
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 0s
      trigger:
        count: 1
YAML

for policy in 5xx latency sql-connections job-failure; do
  echo "== Alert policy: $policy =="
  gcloud alpha monitoring policies create --policy-from-file="$tmp/$policy.yaml" "${CHANNEL_ARG[@]}"
done

echo "MONITORING OK"
