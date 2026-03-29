# SLO Gate Service

FastAPI service that implements two controls:

1. `POST /gate/check`
   - Called by ArgoCD PreSync hook
   - Queries Prometheus burn rate
   - Allows or blocks deployment

2. `POST /hooks/alertmanager`
   - Called by Alertmanager webhook
   - Triggers ArgoCD rollback when burn-rate alerts fire

## Local Run

```bash
cd platform/slo-gate
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

## Config

Rules are loaded from `SLO_RULES_PATH` (default `/etc/slo-gate/rules.yaml`).

Kubernetes default config is in:
- `platform/slo-gate/k8s/configmap.yaml`

Rule templates support variables:
- `{{application}}`
- `{{namespace}}`
- `{{service}}`
- `{{slo_name}}`
- `{{slo_target}}`

## Environment Variables

- `PROMETHEUS_URL`
- `PROMETHEUS_TIMEOUT_SECONDS`
- `SLO_RULES_PATH`
- `ARGOCD_SERVER`
- `ARGOCD_TOKEN`
- `ARGOCD_INSECURE`
- `NOTIFICATION_WEBHOOK_URL` (optional)
- `NOTIFICATION_TIMEOUT_SECONDS`
- `LOG_LEVEL`
