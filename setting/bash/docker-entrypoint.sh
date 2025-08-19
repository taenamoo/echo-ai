#!/bin/bash

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