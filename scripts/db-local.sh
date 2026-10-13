#!/usr/bin/env bash
# Loob kohaliku andmebaasi nullist: auth-tünn + migratsioonid + näidisandmed.
# Kasutus: DATABASE_URL=postgres://postgres:postgres@localhost:5432/arengukava npm run db:local
set -euo pipefail
: "${DATABASE_URL:?Määra DATABASE_URL}"
DB_NAME="${DATABASE_URL##*/}"; DB_NAME="${DB_NAME%%\?*}"
ADMIN_URL="${DATABASE_URL%/*}/postgres"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "drop database if exists \"$DB_NAME\" with (force)" -c "create database \"$DB_NAME\""
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/local/auth-stub.sql
# Kindel järjekord (lokaadi sortimine võiks muidu 0001b panna enne 0001_skeem)
for f in 0001_skeem.sql 0001b_turvaparandus.sql 0002_kasutajad.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "supabase/migrations/$f"
done
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql
echo "Valmis: $DB_NAME"
