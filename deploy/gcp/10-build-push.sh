#!/usr/bin/env bash
# Build image production và đẩy lên Artifact Registry theo COMMIT SHA.
# Không bao giờ dùng tag `latest` để cutover: revision phải trỏ vào một image bất biến, xác định được.
set -euo pipefail
cd "$(dirname "$0")"
source ./env.sh
repo_root="$(cd ../.. && pwd)"

if [ -n "$(git -C "$repo_root" status --porcelain)" ]; then
  echo "CẢNH BÁO: working tree còn thay đổi chưa commit — image sẽ không khớp đúng commit SHA." >&2
fi

SHA="$(git -C "$repo_root" rev-parse --short=12 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/api:${SHA}"

echo "== Build $IMAGE =="
# Context là apps/api-go: Dockerfile COPY go.mod/db theo đường dẫn tương đối của module Go.
docker build -f "$repo_root/apps/api-go/Dockerfile" -t "$IMAGE" "$repo_root/apps/api-go"

echo "== Push =="
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
docker push "$IMAGE"

echo "$IMAGE" > ./.last-image
echo "IMAGE=$IMAGE (đã ghi vào deploy/gcp/.last-image cho các script sau)"
