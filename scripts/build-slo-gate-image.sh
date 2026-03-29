#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -n "${1:-}" ]]; then
  IMAGE="${1}"
elif [[ -n "${DOCKERHUB_USERNAME:-}" ]]; then
  IMAGE="${DOCKERHUB_USERNAME}/blood-finder-slo-gate:latest"
else
  echo "Usage: $0 <image>"
  echo "Or set DOCKERHUB_USERNAME to use <username>/blood-finder-slo-gate:latest"
  exit 1
fi

echo "Building ${IMAGE} ..."
docker build -t "${IMAGE}" -f "${ROOT_DIR}/platform/slo-gate/Dockerfile" "${ROOT_DIR}/platform/slo-gate"

echo "Pushing ${IMAGE} ..."
docker push "${IMAGE}"

echo "Done."
