#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${BOOTSTRAP_PROFILE:-local}"

for cmd in kubectl helm; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Error: required command '${cmd}' not found"
    exit 1
  fi
done

ARGO_NS="argocd"
MON_NS="monitoring"
ARGO_VALUES=()
PROM_VALUES=()
PYRRA_VALUES=()

if [[ "${PROFILE}" == "local" ]]; then
  ARGO_VALUES=(-f "${ROOT_DIR}/platform/argocd/values-local.yaml")
  PROM_VALUES=(-f "${ROOT_DIR}/platform/observability/values-kube-prometheus-local.yaml")
  PYRRA_VALUES=(-f "${ROOT_DIR}/platform/pyrra/values-local.yaml")
fi

helm repo add argo https://argoproj.github.io/argo-helm >/dev/null
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null
helm repo add pyrra https://pyrra-dev.github.io/helm-charts >/dev/null
helm repo update >/dev/null

CURRENT_CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
if [[ "${CURRENT_CONTEXT}" == "minikube" ]] && command -v minikube >/dev/null 2>&1; then
  echo "Detected minikube context. Ensuring ingress addon is enabled..."
  minikube addons enable ingress >/dev/null || true

  if kubectl -n ingress-nginx get deployment ingress-nginx-controller >/dev/null 2>&1; then
    INGRESS_ARGS="$(kubectl -n ingress-nginx get deploy ingress-nginx-controller -o jsonpath='{.spec.template.spec.containers[0].args[*]}')"
    if [[ "${INGRESS_ARGS}" != *"--enable-metrics=true"* ]]; then
      echo "Patching ingress-nginx controller to enable metrics..."
      kubectl -n ingress-nginx patch deploy ingress-nginx-controller \
        --type='json' \
        -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--enable-metrics=true"}]' >/dev/null
      kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=180s >/dev/null
    fi
  fi

  TOTAL_MEM_MB="$(minikube ssh -- "awk '/MemTotal/ {print int(\$2/1024)}' /proc/meminfo" 2>/dev/null || echo 0)"
  if [[ "${TOTAL_MEM_MB}" =~ ^[0-9]+$ ]] && (( TOTAL_MEM_MB < 3500 )); then
    cat <<EOF
Warning: minikube memory is ${TOTAL_MEM_MB}MB.
Recommended: restart minikube with at least 4096MB for stable SLO stack.
Example: minikube stop && minikube start --memory=4096 --cpus=2
EOF
  fi
fi

kubectl create namespace "${ARGO_NS}" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl create namespace "${MON_NS}" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
kubectl create namespace "slo-gate" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

helm upgrade --install argocd argo/argo-cd -n "${ARGO_NS}" --wait "${ARGO_VALUES[@]}"
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n "${MON_NS}" --wait "${PROM_VALUES[@]}"
helm upgrade --install pyrra pyrra/pyrra -n "${MON_NS}" --wait "${PYRRA_VALUES[@]}"

if [[ -n "${ARGOCD_TOKEN:-}" ]]; then
  kubectl -n slo-gate create secret generic slo-gate-secrets \
    --from-literal=ARGOCD_TOKEN="${ARGOCD_TOKEN}" \
    --dry-run=client -o yaml | kubectl apply -f -
else
  echo "Warning: ARGOCD_TOKEN not set. Apply platform/slo-gate/k8s/secret.example.yaml with a real token."
fi

kubectl apply -k "${ROOT_DIR}/platform/slo-gate/k8s"
kubectl apply -k "${ROOT_DIR}/platform/observability"
kubectl apply -k "${ROOT_DIR}/gitops/slo/pyrra"
kubectl apply -k "${ROOT_DIR}/platform/argocd"

echo
echo "Bootstrap completed (profile=${PROFILE})."
echo "Next:"
echo "1) Ensure slo-gate image exists and deployment image matches it."
echo "2) Verify ArgoCD app sync status: kubectl -n argocd get applications.argoproj.io"
echo "3) Verify SLO CR applied: kubectl -n monitoring get servicelevelobjectives.pyrra.dev"
