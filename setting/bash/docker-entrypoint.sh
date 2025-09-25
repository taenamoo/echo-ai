#!/bin/bash

# 0. ensure dependencies are installed (when node_modules is an anonymous volume)
if [ ! -d "/app/node_modules" ] || [ -z "$(ls -A /app/node_modules 2>/dev/null)" ] || [ ! -e "/app/node_modules/@echo-ai/config" ]; then
  echo "node_modules missing or empty. Running pnpm install..."
  pnpm config set store-dir .pnpm-store
  pnpm install
fi

# 0.1. ensure .env.local exists (fallback to env.local_test baked in image)
if [ ! -f "/app/.env.local" ] && [ -f "/app/env.local_test" ]; then
  echo "No .env.local found. Seeding from env.local_test..."
  cp /app/env.local_test /app/.env.local
fi

# 0.2. export variables from .env.local into current shell for all subsequent commands
if [ -f "/app/.env.local" ]; then
  echo "Loading environment from /app/.env.local"
  set -a
  # shellcheck disable=SC1091
  . /app/.env.local
  set +a
fi

# 1. wait for the database to be ready
until nc -z dynamodb-local 8998; do
  echo "Waiting for database at $DB_HOST:$DB_PORT..."
  sleep 1
done
echo "Database is ready."

# 2. run the migrations
echo "Running migrations..."
pnpm run db:migrate

# 3. start the application
echo "Starting the application..."
exec "$@"
# Note: The exec command replaces the current shell with the command specified in the arguments.
