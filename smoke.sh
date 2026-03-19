#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
API_KEY="${API_KEY:-}"

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

echo "== Smoke check start =="
echo "BASE_URL=${BASE_URL}"

check_contains "health" "${BASE_URL}/health" '"ok":true'
check_http_200 "static admin.css" "${BASE_URL}/static/admin/admin.css"
check_http_200 "static admin.js" "${BASE_URL}/static/admin/admin.js"

if [[ -z "$API_KEY" ]]; then
  warn "API_KEY is empty. Running degraded smoke checks only (health + static + /admin reachability)."
  check_http_one_of "admin page reachable (no auth assertion)" "${BASE_URL}/admin" "200,401"
  echo "== SMOKE PARTIAL PASS (degraded mode) =="
  exit 0
fi

check_readiness "readiness" "${BASE_URL}/readiness"

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
