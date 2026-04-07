#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash ./rehearse-local.sh [strict|real-chain] [--env-file .env.strict.local] [--base-url http://127.0.0.1:18000] [--report-dir .artifacts/staging] [--keep-redis]

Behavior:
  1. Builds backend-ts
  2. Starts docker compose redis
  3. Starts local API with node --env-file=<env file>
  4. Runs staging-check in strict or real-chain mode
  5. Stops the API process and, unless --keep-redis is set, stops redis
EOF
}

mode="${1:-strict}"
shift || true

env_file=""
base_url="http://127.0.0.1:18000"
report_dir=".artifacts/staging"
keep_redis=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      env_file="$2"
      shift 2
      ;;
    --base-url)
      base_url="$2"
      shift 2
      ;;
    --report-dir)
      report_dir="$2"
      shift 2
      ;;
    --keep-redis)
      keep_redis=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backend_root="$repo_root/backend-ts"
if [[ -z "$env_file" ]]; then
  if [[ "$mode" == "real-chain" ]]; then
    env_file=".env.real-chain.local"
  else
    env_file=".env.strict.local"
  fi
fi
resolved_env_file="$env_file"
if [[ ! "$resolved_env_file" = /* ]]; then
  resolved_env_file="$repo_root/$env_file"
fi
resolved_report_dir="$report_dir"
if [[ ! "$resolved_report_dir" = /* ]]; then
  resolved_report_dir="$repo_root/$report_dir"
fi

if [[ ! -f "$resolved_env_file" ]]; then
  echo "Env file not found: $resolved_env_file" >&2
  if [[ "$mode" == "real-chain" ]]; then
    echo "Hint: copy .env.real-chain.local.example to .env.real-chain.local first." >&2
  else
    echo "Hint: copy .env.strict.local.example to .env.strict.local first." >&2
  fi
  exit 2
fi

api_key="$(grep -E '^API_KEY=' "$resolved_env_file" | head -n 1 | cut -d '=' -f 2-)"
api_key="${api_key%\"}"
api_key="${api_key#\"}"
if [[ -z "${api_key// }" ]]; then
  echo "API_KEY must be present in $resolved_env_file" >&2
  exit 2
fi

if [[ "$mode" == "real-chain" ]]; then
  required_keys=(BILIBILI_ENABLED BILIBILI_PUBLISH_ENABLED BILIBILI_SESSDATA BILIBILI_BILI_JCT BILIBILI_BUVID3 CREDENTIAL_ENCRYPTION_KEY)
  missing=()
  placeholders=()
  for key in "${required_keys[@]}"; do
    value="$(grep -E "^${key}=" "$resolved_env_file" | head -n 1 | cut -d '=' -f 2-)"
    value="${value%\"}"
    value="${value#\"}"
    if [[ -z "${value// }" ]]; then
      missing+=("$key")
      continue
    fi
    if [[ "$value" == replace-with-* || "$value" == *placeholder* ]]; then
      placeholders+=("$key")
    fi
  done

  enabled="$(grep -E '^BILIBILI_ENABLED=' "$resolved_env_file" | head -n 1 | cut -d '=' -f 2-)"
  publish_enabled="$(grep -E '^BILIBILI_PUBLISH_ENABLED=' "$resolved_env_file" | head -n 1 | cut -d '=' -f 2-)"
  if [[ "$enabled" != "true" || "$publish_enabled" != "true" ]]; then
    echo "real-chain rehearsal requires BILIBILI_ENABLED=true and BILIBILI_PUBLISH_ENABLED=true in $resolved_env_file" >&2
    exit 2
  fi
  if (( ${#missing[@]} > 0 || ${#placeholders[@]} > 0 )); then
    [[ ${#missing[@]} -gt 0 ]] && echo "missing: ${missing[*]}" >&2
    [[ ${#placeholders[@]} -gt 0 ]] && echo "placeholder values: ${placeholders[*]}" >&2
    echo "real-chain rehearsal requires real native credential inputs in $resolved_env_file" >&2
    exit 2
  fi
fi

mkdir -p "$resolved_report_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
report_path="$resolved_report_dir/$mode-local-$timestamp.json"
base_without_scheme="${base_url#http://}"
base_without_scheme="${base_url#https://}"
host_port="${base_without_scheme%%/*}"
host_name="${host_port%%:*}"
port="${host_port##*:}"
if [[ "$host_name" == "$port" ]]; then
  port="18000"
fi

echo "[rehearse-local] building backend"
npm --prefix "$backend_root" run build

echo "[rehearse-local] ensuring redis is available"
(cd "$repo_root" && docker compose up -d redis)

tmp_dir="${TMPDIR:-/tmp}/bili-pet-rehearse-local"
mkdir -p "$tmp_dir"
stdout_path="$tmp_dir/$mode-$timestamp-stdout.log"
stderr_path="$tmp_dir/$mode-$timestamp-stderr.log"

cleanup() {
  if [[ -n "${api_pid:-}" ]] && kill -0 "$api_pid" >/dev/null 2>&1; then
    kill "$api_pid" >/dev/null 2>&1 || true
  fi
  if [[ "$keep_redis" -eq 0 ]]; then
    (cd "$repo_root" && docker compose stop redis >/dev/null 2>&1) || true
  fi
}
trap cleanup EXIT

echo "[rehearse-local] starting local API on $base_url"
(cd "$backend_root" && HOST="$host_name" PORT="$port" node "--env-file=$resolved_env_file" dist/index.js >"$stdout_path" 2>"$stderr_path") &
api_pid=$!

healthy=0
for _ in $(seq 1 30); do
  sleep 1
  if curl -fsS "$base_url/health" >/dev/null 2>&1; then
    healthy=1
    break
  fi
done

if [[ "$healthy" -ne 1 ]]; then
  echo "Local API did not become healthy at $base_url/health" >&2
  cat "$stderr_path" >&2 || true
  exit 1
fi

check_args=(--base-url "$base_url" --api-key "$api_key" --env-file "$resolved_env_file" --report "$report_path")
if [[ "$mode" == "strict" ]]; then
  check_args=(--strict "${check_args[@]}")
elif [[ "$mode" == "real-chain" ]]; then
  check_args=(--strict --pre-release-real-chain "${check_args[@]}")
else
  echo "Mode must be strict or real-chain" >&2
  exit 2
fi

echo "[rehearse-local] running staging-check ($mode)"
node "$backend_root/scripts/staging-check.mjs" "${check_args[@]}"
echo "[rehearse-local] report: $report_path"
