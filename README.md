# Blood Finder CI/CD

Blood Finder is a React + Vite application backed by a DevOps platform setup for CI/CD, GitOps, observability, and SLO-based deployment protection.

This repository contains:

- the Blood Finder frontend app
- a GitHub Actions pipeline for build, scan, image publish, and Kubernetes deploy
- GitOps manifests for Argo CD
- Prometheus + Alertmanager + Pyrra integration
- an `slo-gate` service that can block or roll back deploys when reliability risk is too high

## Architecture

Code change flows through this path:

`GitHub -> GitHub Actions -> Docker Hub -> Argo CD / Kubernetes -> Prometheus + Pyrra -> SLO Gate`

In simple words:

- GitHub Actions builds and scans the app
- Docker image is pushed to Docker Hub
- Kubernetes runs the app
- Prometheus collects metrics
- Pyrra turns SLO definitions into burn-rate rules and alerts
- `slo-gate` checks reliability before deploy and can block risky releases

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- GitHub Actions
- Docker
- Kubernetes / Minikube
- Argo CD
- Prometheus
- Alertmanager
- Pyrra
- FastAPI (`platform/slo-gate`)

## Repository Layout

- `src/` - frontend application
- `.github/workflows/node.js.yml` - CI/CD workflow
- `gitops/apps/blood-finder/` - app deployment manifests
- `gitops/slo/pyrra/` - Pyrra SLO definitions
- `platform/argocd/` - Argo CD project and application manifests
- `platform/observability/` - Prometheus and Alertmanager integration manifests
- `platform/pyrra/` - Pyrra Helm values
- `platform/slo-gate/` - SLO gate service and Kubernetes manifests
- `scripts/bootstrap-slo-gitops.sh` - local platform bootstrap script

## Local App Development

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

Lint the app:

```bash
npm run lint
```

## Docker

Build the image locally:

```bash
docker build -t blood-finder:local -f dockerfile .
```

## GitHub Actions Pipeline

The workflow file is:

- `.github/workflows/node.js.yml`

Current pipeline stages:

1. `ci`
2. `gitleaks-scan`
3. `trivy-fs-scan`
4. `sonarqube`
5. `docker`
6. `trivy-image-scan`
7. `deploy_to_kubernetes`

`deploy_to_kubernetes` runs on your self-hosted runner, while the earlier jobs run on GitHub-hosted Ubuntu runners.

## Required GitHub Configuration

Set these before running the full pipeline:

- `secrets.SONAR_TOKEN`
- `secrets.SONAR_HOST_URL`
- `secrets.DOCKERHUB_TOKEN`
- `vars.DOCKERHUB_USERNAME`

## GitOps + SLO Platform

This repo includes a working base for SLO-gated GitOps delivery.

Main pieces:

- Argo CD syncs the app from `gitops/apps/blood-finder`
- ingress-nginx metrics are scraped by Prometheus
- Pyrra reads the SLO in `gitops/slo/pyrra/blood-finder-availability-slo.yaml`
- Alertmanager forwards burn-rate alerts to `slo-gate`
- `slo-gate` can block deployment checks or trigger rollback logic

Detailed setup notes are in:

- `docs/slo-gitops-system.md`

## Bootstrap Local Platform

For a local Minikube-based platform setup:

```bash
scripts/bootstrap-slo-gitops.sh
```

This installs:

- Argo CD
- kube-prometheus-stack
- Pyrra
- `slo-gate`
- project observability manifests
- project SLO manifests

## Browser Access

### App

```bash
kubectl -n blood-finder port-forward svc/blood-finder 8081:80
```

Open:

- `http://127.0.0.1:8081`

### Argo CD

```bash
kubectl -n argocd port-forward svc/argocd-server 8090:443
```

Open:

- `https://127.0.0.1:8090`

### Prometheus

```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090:9090
```

Open:

- `http://127.0.0.1:9090`

### Pyrra

```bash
kubectl -n monitoring port-forward svc/pyrra 9099:9099
```

Open:

- `http://127.0.0.1:9099`

## Current SLO

The current Pyrra SLO tracks app availability using ingress request metrics:

- SLO name: `blood-finder-availability`
- target: `99.5%`
- window: `28d`
- error signal: `5xx` ingress responses

## Notes

- Local access is done with `kubectl port-forward` because services are not exposed publicly by default.
- The local Minikube setup is resource-sensitive; higher memory makes the observability stack more stable.
- The SLO gate currently evaluates live ingress request error rate before allowing deployment checks.
