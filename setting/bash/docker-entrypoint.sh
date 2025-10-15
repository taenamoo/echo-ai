#!/bin/bash

# 0. ensure dependencies are installed (when node_modules is an anonymous volume)
if [ ! -d "/app/node_modules" ] || [ -z "$(ls -A /app/node_modules 2>/dev/null)" ] || [ ! -e "/app/node_modules/@echo-ai/config" ]; then
  echo "node_modules missing or empty. Running pnpm install..."
  pnpm config set store-dir .pnpm-store

  # Full workspace installs have been getting OOM-killed inside local runtime containers.
  # To keep memory usage predictable we only install the packages that the runtime actually needs.
  # Determine the most appropriate install scope.
  # Priority order:
  #   1. Explicit override via PNPM_INSTALL_SCOPE (allows multiple filters separated by newlines)
  #   2. Automatically derive from the pnpm command passed to the container (e.g. --filter <pkg>)
  #   3. Fallback to full workspace install.

  # shellcheck disable=SC2206
  install_args=()

  if [ -n "${PNPM_INSTALL_SCOPE:-}" ]; then
    echo "Using PNPM_INSTALL_SCOPE from environment: ${PNPM_INSTALL_SCOPE}"
    while IFS= read -r scope || [ -n "$scope" ]; do
      [ -z "$scope" ] && continue
      case "$scope" in
        *"..."*) install_args+=(--filter "$scope") ;;
        *) install_args+=(--filter "$scope...") ;;
      esac
    done <<EOF
${PNPM_INSTALL_SCOPE}
EOF
  else
    cmd_filter=""
    if [ "$#" -gt 0 ] && [ "$1" = "pnpm" ]; then
      prev=""
      for arg in "$@"; do
        if [ "$prev" = "--filter" ]; then
          cmd_filter="$arg"
          break
        fi
        prev="$arg"
      done
    fi

    if [ -n "$cmd_filter" ]; then
      echo "Derived pnpm filter from command: $cmd_filter"
      case "$cmd_filter" in
        *"..."*) install_args+=(--filter "$cmd_filter") ;;
        *) install_args+=(--filter "$cmd_filter...") ;;
      esac
    fi
  fi

  if [ "${#install_args[@]}" -gt 0 ]; then
    echo "Running scoped pnpm install: pnpm install ${install_args[*]}"
    pnpm install "${install_args[@]}"
  else
    echo "Running full workspace pnpm install"
    pnpm install
  fi
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
