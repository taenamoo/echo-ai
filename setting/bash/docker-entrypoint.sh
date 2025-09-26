#!/bin/bash

# 0. ensure dependencies are installed (when node_modules is an anonymous volume)
if [ ! -d "/app/node_modules" ] || [ -z "$(ls -A /app/node_modules 2>/dev/null)" ] || [ ! -e "/app/node_modules/@echo-ai/config" ]; then
  echo "node_modules missing or empty. Running pnpm install..."
  pnpm config set store-dir .pnpm-store
  pnpm install
fi

# 0.1. export variables from .env.local into current shell for all subsequent commands
if [ -f "/app/.env.local" ]; then
  echo "Loading environment from /app/.env.local"
  set -a
  # shellcheck disable=SC1091
  . /app/.env.local
  set +a
fi

# 1. optionally wait for DynamoDB and run migrations (skip for pure SPA)
if [ "${SKIP_DB_MIGRATE:-false}" != "true" ]; then
  until nc -z dynamodb-local 8998; do
    echo "Waiting for database (dynamodb-local:8998)..."
    sleep 1
  done
  echo "Database is ready."
  echo "Running migrations..."
  pnpm run db:migrate
else
  echo "Skipping DB wait/migration (SKIP_DB_MIGRATE=true)"
fi

# 3. start the application
echo "Starting the application..."
exec "$@"
# Note: The exec command replaces the current shell with the command specified in the arguments.
