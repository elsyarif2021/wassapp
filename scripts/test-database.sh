#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="wassapp-security-test-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
# Real PostgreSQL, no exposed ports, no production data or credentials.
docker run --rm -d --name "$container" --network none \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  postgres:17.7@sha256:2006493727bd5277eece187319af1ef82b4cf82cf4fc1ed00da0775b646ac2a4 \
  -c wal_level=logical >/dev/null
for attempt in $(seq 1 30); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/database-bootstrap.sql >/dev/null
# A second application must preserve data and recreate policies cleanly.
for attempt in 1 2; do
  docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < migrations/001_authenticated_chat.sql >/dev/null
done
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/database-security.sql
