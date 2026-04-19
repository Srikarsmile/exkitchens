#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"
SQL_FILE="$ROOT_DIR/supabase/marketplace_bootstrap_dashboard_escaped.sql"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo "Missing DATABASE_URL or SUPABASE_DB_URL in .env.local" >&2
  exit 1
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Missing SQL file: $SQL_FILE" >&2
  exit 1
fi

exec psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
