#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:18000}"
API_KEY="${API_KEY:-}"
STRICT_SMOKE="${STRICT_SMOKE:-false}"
PRE_RELEASE_REAL_CHAIN="${PRE_RELEASE_REAL_CHAIN:-false}"

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; exit 1; }
warn() { echo "[WARN] $1"; }

check_http_200() {
  local name="$1"
  local url="$2"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" "$url")"
  [[ "$code" == "200" ]] || fail "${name} -> HTTP ${code} (${url})"
  pass "${name}"
}

check_http_200_with_key() {
  local name="$1"
  local url="$2"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" -H "x-api-key: ${API_KEY}" "$url")"
  [[ "$code" == "200" ]] || fail "${name} -> HTTP ${code} (${url})"
  pass "${name}"
}

check_http_one_of() {
  local name="$1"
  local url="$2"
  local allowed_codes_csv="$3"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" "$url")"
  [[ ",${allowed_codes_csv}," == *",${code},"* ]] || fail "${name} -> HTTP ${code} (allowed: ${allowed_codes_csv}) (${url})"
  pass "${name}"
}

check_json_ok_true() {
  local name="$1"
  local url="$2"
  local body
  body="$(curl -sS -H "x-api-key: ${API_KEY}" "$url")"
  python - <<'PY' "$body" >/dev/null 2>&1 || exit 1
import json, sys
payload = json.loads(sys.argv[1])
assert payload.get("ok") is True
PY
  [[ $? -eq 0 ]] || fail "${name} -> ok != true (${url})"
  pass "${name}"
}

check_contains() {
  local name="$1"
  local url="$2"
  local needle="$3"
  local body
  body="$(curl -sS "$url")"
  echo "$body" | grep -F "$needle" >/dev/null || fail "${name} -> missing: ${needle}"
  pass "${name}"
}

check_readiness() {
  local name="$1"
  local url="$2"
  local body
  body="$(curl -sS "$url")"
  python - <<'PY' "$body" >/dev/null 2>&1 || exit 1
import json, sys
payload = json.loads(sys.argv[1])
assert payload.get("ready") is True
PY
  [[ $? -eq 0 ]] || fail "${name} -> ready != true (${url})"
  pass "${name}"
}

check_bilibili_diagnostics_ready() {
  local name="$1"
  local url="$2"
  local body
  local details
  body="$(curl -sS -H "x-api-key: ${API_KEY}" "$url")"
  details="$(
    python - "$body" <<'PY' 2>&1
import json
import sys

payload = json.loads(sys.argv[1])
diagnostics = payload.get("diagnostics")
if not isinstance(diagnostics, dict):
    raise SystemExit("missing diagnostics")

if diagnostics.get("ready") is True:
    print("diagnostics.ready=true")
    raise SystemExit(0)

blocking = diagnostics.get("blocking_reasons")
if isinstance(blocking, list) and blocking:
    raise SystemExit("diagnostics.ready=false; blocking_reasons=" + ",".join(str(item) for item in blocking))

raise SystemExit("diagnostics.ready=false")
PY
  )" || fail "${name} -> ${details}"
  pass "${name}"
}

check_release_gates_for_real_chain() {
  local name="$1"
  local url="$2"
  local body
  local details
  body="$(curl -sS -H "x-api-key: ${API_KEY}" "$url")"
  details="$(
    python - "$body" <<'PY' 2>&1
import json
import sys

payload = json.loads(sys.argv[1])
diagnostics = payload.get("diagnostics")
if not isinstance(diagnostics, dict):
    raise SystemExit("missing diagnostics")

release_gates = diagnostics.get("release_gates")
if not isinstance(release_gates, dict):
    raise SystemExit("missing diagnostics.release_gates")

required_true_fields = (
    "pre_release_real_chain_ready",
    "real_auth_ready",
    "dependency_ready",
    "worker_or_publish_ready",
    "native_publish_enabled",
    "credential_present",
    "credential_complete",
)
errors = []
for field in required_true_fields:
    if release_gates.get(field) is not True:
        errors.append(f"{field}={release_gates.get(field)!r}")

effective_publish_mode = release_gates.get("effective_publish_mode")
if effective_publish_mode != "native_bilibili":
    errors.append(f"effective_publish_mode={effective_publish_mode!r}")

blocking_reasons = release_gates.get("blocking_reasons")
if isinstance(blocking_reasons, list) and blocking_reasons:
    errors.append("blocking_reasons=" + ",".join(str(item) for item in blocking_reasons))

if errors:
    raise SystemExit("; ".join(errors))
PY
  )" || fail "${name} -> ${details}"
  pass "${name}"
}

echo "== Smoke check start =="
echo "BASE_URL=${BASE_URL}"
echo "Override target with BASE_URL, e.g. BASE_URL=http://127.0.0.1:8080 bash smoke.sh"

check_contains "health" "${BASE_URL}/health" '"ok":true'
check_http_200 "static admin.css" "${BASE_URL}/static/admin/admin.css"
check_http_200 "static admin.js" "${BASE_URL}/static/admin/admin.js"

if [[ -z "$API_KEY" ]]; then
  if [[ "$PRE_RELEASE_REAL_CHAIN" == "true" ]]; then
    fail "PRE_RELEASE_REAL_CHAIN=true requires API_KEY for /api/admin/bilibili/status checks"
  fi
  warn "API_KEY is empty. Running degraded smoke checks only (health + static + /admin reachability)."
  check_http_one_of "admin page reachable (no auth assertion)" "${BASE_URL}/admin" "200,401"
  echo "== SMOKE PARTIAL PASS (degraded mode) =="
  exit 0
fi

check_readiness "readiness" "${BASE_URL}/readiness"

# Optional strict verification (production-like checks)
# Set STRICT_SMOKE=true to enable comprehensive dependency and config checks
if [[ "$STRICT_SMOKE" == "true" ]]; then
  echo "== STRICT MODE: Production-like verification =="

  # Check Bilibili integration status if enabled
  if [[ -n "$API_KEY" ]]; then
    check_json_ok_true "bilibili integration status" "${BASE_URL}/api/admin/bilibili/status"
    check_bilibili_diagnostics_ready "bilibili publish readiness" "${BASE_URL}/api/admin/bilibili/status"
  fi

  echo "== STRICT MODE COMPLETE =="
fi

if [[ "$PRE_RELEASE_REAL_CHAIN" == "true" ]]; then
  [[ "$STRICT_SMOKE" == "true" ]] || fail "PRE_RELEASE_REAL_CHAIN=true requires STRICT_SMOKE=true"
  echo "== PRE-RELEASE REAL CHAIN CONTRACT =="
  check_release_gates_for_real_chain "pre-release real chain readiness" "${BASE_URL}/api/admin/bilibili/status"
  echo "== PRE-RELEASE REAL CHAIN CONTRACT PASS =="
fi

check_contains "admin page has css" "${BASE_URL}/admin?api_key=${API_KEY}" "/static/admin/admin.css"
check_contains "admin page has js" "${BASE_URL}/admin?api_key=${API_KEY}" "/static/admin/admin.js"

check_json_ok_true "admin metrics overview" "${BASE_URL}/api/admin/overview"
check_json_ok_true "admin jobs" "${BASE_URL}/api/admin/jobs?limit=5&offset=0"
check_json_ok_true "admin audit summary" "${BASE_URL}/api/admin/audit/summary?days=7"
check_json_ok_true "admin gateway logs" "${BASE_URL}/api/admin/gateway/logs?limit=5"

check_json_ok_true "legacy metrics overview" "${BASE_URL}/api/metrics/overview"
check_json_ok_true "legacy jobs" "${BASE_URL}/api/jobs?limit=5"
check_json_ok_true "legacy audit summary" "${BASE_URL}/api/audit-logs/summary?days=7"
check_json_ok_true "legacy gateway logs" "${BASE_URL}/gateway/publish-logs?limit=5"

check_http_200_with_key "admin page with key" "${BASE_URL}/admin?api_key=${API_KEY}"

echo "== SMOKE PASS =="
