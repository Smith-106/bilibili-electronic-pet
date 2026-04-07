#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/backend-ts/scripts/staging-check.mjs"

usage() {
  cat <<'EOF'
Usage:
  bash smoke.sh [preflight|strict|real-chain] [staging-check args...]

Modes:
  preflight   => --preflight-only
  strict      => --strict
  real-chain  => --strict --pre-release-real-chain

Examples:
  bash smoke.sh preflight --report ./preflight.json
  bash smoke.sh strict --base-url http://127.0.0.1:18000 --api-key "$API_KEY"
  bash smoke.sh real-chain --base-url "$BASE_URL" --api-key "$API_KEY"
EOF
}

args=("$@")
case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
  preflight)
    shift
    args=(--preflight-only "$@")
    ;;
  strict)
    shift
    args=(--strict "$@")
    ;;
  real-chain)
    shift
    args=(--strict --pre-release-real-chain "$@")
    ;;
esac

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
