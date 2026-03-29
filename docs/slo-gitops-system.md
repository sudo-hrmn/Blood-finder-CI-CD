# SLO-Gated GitOps Platform (Phase 1)

This repository includes an end-to-end base for SLO-aware GitOps deployment control:

- **GitOps app manifests** under `gitops/apps/blood-finder`
- **Argo CD project/application** under `platform/argocd`
- **Pyrra SLO** under `gitops/slo/pyrra`
- **SLO gate webhook service** under `platform/slo-gate`
- **Alertmanager + ingress metrics wiring** under `platform/observability`

## Flow

1. Argo CD syncs `gitops/apps/blood-finder`.
2. A **PreSync Job hook** calls `POST /gate/check` on `slo-gate`.
3. SLO gate queries Prometheus and decides:
   - **2xx**: allow sync
   - **429/503**: block sync
4. Pyrra-generated `ErrorBudgetBurn` alerts go to Alertmanager.
5. Alertmanager forwards alerts to `POST /hooks/alertmanager`.
6. SLO gate triggers Argo CD rollback if a burn alert is firing.

## Key Files

- `gitops/apps/blood-finder/`
  - `deployment.yaml`, `service.yaml`, `ingress.yaml`
  - `presync-slo-gate-hook.yaml`
- `gitops/slo/pyrra/`
  - `blood-finder-availability-slo.yaml`
- `platform/argocd/`
  - `appproject.yaml`, `application-blood-finder.yaml`
  - `values-local.yaml` (lightweight local profile)
- `platform/observability/`
  - `alertmanagerconfig-slo-gate.yaml`
  - `service-ingress-nginx-metrics.yaml`
  - `servicemonitor-ingress-nginx-metrics.yaml`
  - `values-kube-prometheus-local.yaml` (lightweight local profile)
- `platform/slo-gate/`
  - `app/main.py`
  - `k8s/configmap.yaml`, `k8s/deployment.yaml`

## Bootstrap

```bash
scripts/bootstrap-slo-gitops.sh
```

Default profile is `local` (`BOOTSTRAP_PROFILE=local`) and installs low-memory values for minikube.

You can switch profiles:

```bash
BOOTSTRAP_PROFILE=default scripts/bootstrap-slo-gitops.sh
```

## Required Inputs

1. Build and publish the SLO gate image:
   - `scripts/build-slo-gate-image.sh <your-image>`
2. Provide `ARGOCD_TOKEN` in `slo-gate-secrets` (namespace `slo-gate`).
3. Optional notification webhook:
   - `NOTIFICATION_WEBHOOK_URL` in `slo-gate-secrets`

If `ARGOCD_TOKEN` is exported before bootstrap, the script creates the secret automatically.

## Local Notes

- `bootstrap-slo-gitops.sh` checks minikube memory and warns if it is too low.
- Use at least **4096MB** for stable local runs:
  - `minikube stop && minikube start --memory=4096 --cpus=2`
- App ingress host is `blood-finder.local`; map it to minikube IP in `/etc/hosts` when testing via browser.
- Ingress `ServiceMonitor` uses `honorLabels: true` so app labels (`namespace`, `service`) are preserved for SLO queries.

## SLO Query Model

- Current gate config evaluates a normalized 5m error-rate burn factor directly from live ingress request metrics:
  - `((5xx_rate / total_rate) / (1 - SLO target))`
- Query includes a safe fallback (`or on() vector(0)`) so a no-error state returns `0` instead of "no data".
- Default threshold is `14.0` (fast burn gate).
- Config source: `platform/slo-gate/k8s/configmap.yaml`

## Production Hardening

- Use TLS verification (`ARGOCD_INSECURE=false`) with trusted certs.
- Use least-privilege Argo CD token scope.
- Tune thresholds/windows per service instead of one global default.
