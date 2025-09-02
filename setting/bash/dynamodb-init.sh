#!/bin/sh
set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-2}"
ENDPOINT="${DYNAMODB_ENDPOINT:-http://dynamodb-local:8998}"

export AWS_REGION="$REGION"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-dummy}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-dummy}"

echo "[DynamoDB Init] Endpoint: $ENDPOINT, Region: $REGION"

# Wait until DynamoDB Local is reachable to avoid race conditions
wait_for_dynamodb() {
  ATTEMPTS=0
  MAX_ATTEMPTS=60
  SLEEP_SEC=2
  echo "[DynamoDB Init] Waiting for DynamoDB to be ready..."
  until aws dynamodb list-tables --endpoint-url "$ENDPOINT" >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS+1))
    if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
      echo "[DynamoDB Init] Timeout waiting for DynamoDB at $ENDPOINT"
      exit 1
    fi
    echo "[DynamoDB Init] Not ready yet ($ATTEMPTS/$MAX_ATTEMPTS). Sleeping ${SLEEP_SEC}s..."
    sleep "$SLEEP_SEC"
  done
  echo "[DynamoDB Init] DynamoDB is ready. Proceeding with table creation."
}

ensure_table() {
  NAME="$1";
  JSON_SPEC="$2";
  if aws dynamodb describe-table --endpoint-url "$ENDPOINT" --table-name "$NAME" >/dev/null 2>&1; then
    echo "[DynamoDB Init] Table already exists: $NAME"
  else
    echo "[DynamoDB Init] Creating table: $NAME"
    aws dynamodb create-table \
      --endpoint-url "$ENDPOINT" \
      --cli-input-json "$JSON_SPEC"
    aws dynamodb wait table-exists --endpoint-url "$ENDPOINT" --table-name "$NAME"
    echo "[DynamoDB Init] Table created: $NAME"
  fi
}

MAIN_TABLE_JSON='{
  "TableName": "EchoAI-Main-Table",
  "AttributeDefinitions": [
    {"AttributeName": "PK", "AttributeType": "S"},
    {"AttributeName": "SK", "AttributeType": "S"},
    {"AttributeName": "email", "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "PK", "KeyType": "HASH"},
    {"AttributeName": "SK", "KeyType": "RANGE"}
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "EmailIndex",
      "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }
  ],
  "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
}'

STUDY_TABLE_JSON='{
  "TableName": "EchoAi-Studies",
  "AttributeDefinitions": [
    {"AttributeName": "user_id", "AttributeType": "S"},
    {"AttributeName": "study_id", "AttributeType": "S"}
  ],
  "KeySchema": [
    {"AttributeName": "user_id", "KeyType": "HASH"},
    {"AttributeName": "study_id", "KeyType": "RANGE"}
  ],
  "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
}'

wait_for_dynamodb

ensure_table "EchoAI-Main-Table" "$MAIN_TABLE_JSON"
ensure_table "EchoAi-Studies" "$STUDY_TABLE_JSON"
