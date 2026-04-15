#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/backend-ts/scripts/staging-check.mjs"

usage() {
  cat <<'EOF'
Usage:
  bash smoke.sh [preflight|expanded-preflight|strict|real-chain|qq-onebot|qq-e2e] [args...]

Modes:
  preflight   => --preflight-only
  expanded-preflight => --preflight-only --expanded-scope-trial
  strict      => --strict
  real-chain  => --strict --pre-release-real-chain
  qq-onebot   => npm --prefix qq-sidecar run smoke:onebot [-- --report <path>]
  qq-e2e      => npm --prefix backend-ts run smoke:qq-sidecar [-- --report <path>]

Report behavior:
  If mode is preflight/expanded-preflight/strict/real-chain/qq-onebot/qq-e2e and no --report is provided,
  smoke.sh auto-writes JSON evidence to:
    ./.artifacts/staging/<mode>-<UTC timestamp>.json
  Override directory via SMOKE_REPORT_DIR.

Examples:
  bash smoke.sh preflight --report ./preflight.json
  bash smoke.sh strict --base-url http://127.0.0.1:18000 --api-key "$API_KEY"
  bash smoke.sh real-chain --base-url "$BASE_URL" --api-key "$API_KEY"
  bash smoke.sh qq-onebot --report ./.artifacts/staging/qq-onebot-local.json
  bash smoke.sh qq-e2e --report ./.artifacts/staging/qq-e2e-local.json
EOF
}

display_path() {
  local raw="$1"
  if command -v wslpath >/dev/null 2>&1 && [[ "$raw" == /mnt/* ]]; then
    wslpath -w "$raw"
  else
    printf '%s\n' "$raw"
  fi
}

args=("$@")
mode=""
case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
  preflight)
    mode="preflight"
    shift
    args=(--preflight-only "$@")
    ;;
  expanded-preflight)
    mode="expanded-preflight"
    shift
    args=(--preflight-only --expanded-scope-trial "$@")
    ;;
  strict)
    mode="strict"
    shift
    args=(--strict "$@")
    ;;
  real-chain)
    mode="real-chain"
    shift
    args=(--strict --pre-release-real-chain "$@")
    ;;
  qq-onebot)
    prefix_path="$SCRIPT_DIR/qq-sidecar"
    if command -v wslpath >/dev/null 2>&1; then
      prefix_path="$(wslpath -w "$prefix_path")"
    fi
    shift
    qq_args=("$@")
    has_report_arg=0
    for arg in "${qq_args[@]}"; do
      case "$arg" in
        --report|--report=*)
          has_report_arg=1
          break
          ;;
      esac
    done
    if [[ "$has_report_arg" -eq 0 ]]; then
      report_dir="${SMOKE_REPORT_DIR:-$SCRIPT_DIR/.artifacts/staging}"
      mkdir -p "$report_dir"
      timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
      report_path="$report_dir/qq-onebot-$timestamp.json"
      qq_args+=(--report "$report_path")
      echo "[smoke] auto report path: $(display_path "$report_path")"
    fi
    exec npm --prefix "$prefix_path" run smoke:onebot -- "${qq_args[@]}"
    ;;
  qq-e2e)
    prefix_path="$SCRIPT_DIR/backend-ts"
    if command -v wslpath >/dev/null 2>&1; then
      prefix_path="$(wslpath -w "$prefix_path")"
    fi
    shift
    qq_args=("$@")
    has_report_arg=0
    for arg in "${qq_args[@]}"; do
      case "$arg" in
        --report|--report=*)
          has_report_arg=1
          break
          ;;
      esac
    done
    if [[ "$has_report_arg" -eq 0 ]]; then
      report_dir="${SMOKE_REPORT_DIR:-$SCRIPT_DIR/.artifacts/staging}"
      mkdir -p "$report_dir"
      timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
      report_path="$report_dir/qq-e2e-$timestamp.json"
      qq_args+=(--report "$report_path")
      echo "[smoke] auto report path: $(display_path "$report_path")"
    fi
    exec npm --prefix "$prefix_path" run smoke:qq-sidecar -- "${qq_args[@]}"
    ;;
esac

has_report_arg=0
for arg in "${args[@]}"; do
  case "$arg" in
    --report|--report=*)
      has_report_arg=1
      break
      ;;
  esac
done

if [[ -n "$mode" && "$has_report_arg" -eq 0 ]]; then
  report_dir="${SMOKE_REPORT_DIR:-$SCRIPT_DIR/.artifacts/staging}"
  mkdir -p "$report_dir"
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  report_path="$report_dir/${mode}-${timestamp}.json"
  args+=(--report "$report_path")
  echo "[smoke] auto report path: $(display_path "$report_path")"
fi

script_path_for_node="$SCRIPT_PATH"

if command -v node >/dev/null 2>&1; then
  NODE_BIN="node"
elif command -v node.exe >/dev/null 2>&1; then
  NODE_BIN="node.exe"
  if command -v wslpath >/dev/null 2>&1; then
    script_path_for_node="$(wslpath -w "$SCRIPT_PATH")"
    to_windows_path() {
      local raw="$1"
      if [[ "$raw" =~ ^[A-Za-z]:[\\/].* ]] || [[ "$raw" =~ ^\\\\ ]]; then
        printf '%s\n' "$raw"
      elif [[ "$raw" == /* ]]; then
        wslpath -w "$raw"
      else
        wslpath -w "$(pwd)/$raw"
      fi
    }

    converted_args=()
    expect_path_value=0
    for arg in "${args[@]}"; do
      if [[ "$expect_path_value" -eq 1 ]]; then
        converted_args+=("$(to_windows_path "$arg")")
        expect_path_value=0
        continue
      fi

      case "$arg" in
        --report|--env-file)
          converted_args+=("$arg")
          expect_path_value=1
          ;;
        --report=*|--env-file=*)
          key="${arg%%=*}"
          value="${arg#*=}"
          converted_args+=("${key}=$(to_windows_path "$value")")
          ;;
        *)
          converted_args+=("$arg")
          ;;
      esac
    done
    args=("${converted_args[@]}")
  fi
else
  echo "ERROR: node runtime is required but was not found in PATH (tried node and node.exe)." >&2
  exit 127
fi

"$NODE_BIN" "$script_path_for_node" "${args[@]}"
