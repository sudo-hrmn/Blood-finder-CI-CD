import logging
import os
from pathlib import Path
from typing import Any

import httpx
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

LOGGER = logging.getLogger("slo-gate")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

app = FastAPI(title="slo-gate", version="0.1.0")


class GateRequest(BaseModel):
    application: str = Field(..., min_length=1)
    service: str | None = None
    namespace: str | None = None
    slo_name: str | None = None


class AlertmanagerAlert(BaseModel):
    status: str
    labels: dict[str, str] = Field(default_factory=dict)
    annotations: dict[str, str] = Field(default_factory=dict)


class AlertmanagerWebhook(BaseModel):
    receiver: str | None = None
    status: str | None = None
    alerts: list[AlertmanagerAlert] = Field(default_factory=list)


def _rules_path() -> Path:
    return Path(os.getenv("SLO_RULES_PATH", "/etc/slo-gate/rules.yaml"))


def load_rules() -> dict[str, Any]:
    path = _rules_path()
    if not path.exists():
        raise HTTPException(status_code=500, detail=f"rules file not found: {path}")

    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}

    if not isinstance(data, dict):
        raise HTTPException(status_code=500, detail="invalid rules file format")

    return data


def render_query(template: str, values: dict[str, Any]) -> str:
    query = template
    for key, value in values.items():
        safe_value = "" if value is None else str(value)
        query = query.replace(f"{{{{{key}}}}}", safe_value)
    return query


def parse_bool(value: Any, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return bool(value)

    normalized = str(value).strip().lower()
    return normalized in {"1", "true", "yes", "on"}


async def query_prometheus(query: str) -> float | None:
    base_url = os.getenv(
        "PROMETHEUS_URL",
        "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090",
    )
    timeout_seconds = float(os.getenv("PROMETHEUS_TIMEOUT_SECONDS", "5"))

    url = f"{base_url.rstrip('/')}/api/v1/query"
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        response = await client.get(url, params={"query": query})
        response.raise_for_status()
        payload = response.json()

    if payload.get("status") != "success":
        raise HTTPException(status_code=503, detail="prometheus query did not succeed")

    results = payload.get("data", {}).get("result", [])
    if not results:
        return None

    value = results[0].get("value")
    if not value or len(value) < 2:
        return None

    return float(value[1])


def _resolve_rule(raw_rules: dict[str, Any], gate_request: GateRequest) -> dict[str, Any]:
    applications = raw_rules.get("applications", {})
    defaults = raw_rules.get("defaults", {})

    app_rule = applications.get(gate_request.application)
    if not app_rule:
        raise HTTPException(
            status_code=404,
            detail=f"no rule found for application '{gate_request.application}'",
        )

    if not isinstance(app_rule, dict):
        raise HTTPException(status_code=500, detail="invalid application rule")

    rule = {**defaults, **app_rule}
    return rule


def _application_from_alert(alert: AlertmanagerAlert) -> str | None:
    labels = alert.labels
    return (
        labels.get("application")
        or labels.get("argocd_app")
        or labels.get("app")
        or labels.get("service")
    )


def _should_trigger_rollback(alert: AlertmanagerAlert) -> bool:
    if alert.status.lower() != "firing":
        return False

    alert_name = alert.labels.get("alertname", "").lower()
    keywords = ("burn", "errorbudget", "slo")
    return any(word in alert_name for word in keywords)


async def _trigger_argocd_rollback(application: str) -> dict[str, Any]:
    server = os.getenv("ARGOCD_SERVER", "").rstrip("/")
    token = os.getenv("ARGOCD_TOKEN", "")
    insecure = os.getenv("ARGOCD_INSECURE", "true").lower() == "true"

    if not server or not token:
        LOGGER.warning(
            "rollback skipped for app=%s because ARGOCD_SERVER/TOKEN is not configured",
            application,
        )
        return {"application": application, "rollback": "skipped", "reason": "argocd credentials missing"}

    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=10, verify=not insecure) as client:
        app_response = await client.get(f"{server}/api/v1/applications/{application}", headers=headers)
        app_response.raise_for_status()
        app_payload = app_response.json()

        history = app_payload.get("status", {}).get("history", [])
        if len(history) < 2:
            return {
                "application": application,
                "rollback": "skipped",
                "reason": "not enough deployment history",
            }

        history_by_id = sorted(history, key=lambda item: int(item.get("id", 0)))
        rollback_to = history_by_id[-2]
        rollback_id = int(rollback_to.get("id", 0))

        rollback_response = await client.post(
            f"{server}/api/v1/applications/{application}/rollback",
            headers=headers,
            json={"id": rollback_id},
        )
        rollback_response.raise_for_status()

    LOGGER.warning("rollback triggered for app=%s to history id=%s", application, rollback_id)
    return {"application": application, "rollback": "triggered", "id": rollback_id}


async def _send_notification(event: str, payload: dict[str, Any]) -> None:
    webhook_url = os.getenv("NOTIFICATION_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return

    timeout_seconds = float(os.getenv("NOTIFICATION_TIMEOUT_SECONDS", "5"))
    body = {"event": event, **payload}

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(webhook_url, json=body)
            response.raise_for_status()
    except httpx.HTTPError:
        LOGGER.exception("notification webhook failed for event=%s", event)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/gate/check")
async def gate_check(gate_request: GateRequest) -> JSONResponse:
    raw_rules = load_rules()
    rule = _resolve_rule(raw_rules, gate_request)

    namespace = gate_request.namespace or rule.get("namespace")
    service = gate_request.service or rule.get("service")
    slo_name = gate_request.slo_name or rule.get("sloName")
    slo_target = rule.get("sloTarget", 0.995)

    query_template = rule.get("prometheusQueryTemplate")
    if not query_template:
        raise HTTPException(
            status_code=500,
            detail=f"missing prometheusQueryTemplate for '{gate_request.application}'",
        )

    query = render_query(
        str(query_template),
        {
            "application": gate_request.application,
            "namespace": namespace,
            "service": service,
            "slo_name": slo_name,
            "slo_target": slo_target,
        },
    )

    threshold = float(rule.get("threshold", 1.0))
    block_on_no_data = parse_bool(rule.get("blockOnNoData", True), True)

    try:
        burn_rate = await query_prometheus(query)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"prometheus query failed: {exc}") from exc

    if burn_rate is None:
        if block_on_no_data:
            payload = {
                "allow": False,
                "application": gate_request.application,
                "reason": "no burn-rate data returned",
                "query": query,
            }
            await _send_notification("deployment_blocked_no_data", payload)
            return JSONResponse(
                status_code=503,
                content=payload,
            )

        return JSONResponse(
            status_code=200,
            content={
                "allow": True,
                "application": gate_request.application,
                "reason": "no data, allowed by rule",
                "query": query,
            },
        )

    allow = burn_rate <= threshold
    payload = {
        "allow": allow,
        "application": gate_request.application,
        "burnRate": burn_rate,
        "threshold": threshold,
        "query": query,
    }

    if allow:
        return JSONResponse(status_code=200, content=payload)

    await _send_notification("deployment_blocked_slo_breach", payload)
    return JSONResponse(status_code=429, content=payload)


@app.post("/hooks/alertmanager")
async def alertmanager_hook(body: AlertmanagerWebhook) -> dict[str, Any]:
    raw_rules = load_rules()
    apps_config = raw_rules.get("applications", {})

    rollbacks: list[dict[str, Any]] = []

    for alert in body.alerts:
        if not _should_trigger_rollback(alert):
            continue

        application = _application_from_alert(alert)
        if not application:
            LOGGER.info("alert skipped: application label not found")
            continue

        app_rule = apps_config.get(application, {})
        rollback_cfg = app_rule.get("rollback", {}) if isinstance(app_rule, dict) else {}
        target_app = rollback_cfg.get("argoApp", application)

        try:
            result = await _trigger_argocd_rollback(target_app)
        except httpx.HTTPError as exc:
            LOGGER.exception("rollback request failed for app=%s", target_app)
            result = {
                "application": target_app,
                "rollback": "failed",
                "error": str(exc),
            }

        rollbacks.append(result)

    if rollbacks:
        await _send_notification("rollback_actions", {"received": len(body.alerts), "rollbacks": rollbacks})

    return {"received": len(body.alerts), "rollbacks": rollbacks}
