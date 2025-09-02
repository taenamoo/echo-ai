#!/bin/sh
set -euo pipefail

REGION="${AWS_REGION:-ap-northeast-2}"
ENDPOINT="${DYNAMODB_ENDPOINT:-http://dynamodb-local:8998}"

export AWS_REGION="$REGION"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-dummy}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-dummy}"

echo "[DynamoDB Init] Endpoint: $ENDPOINT, Region: $REGION"

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

ensure_table "EchoAI-Main-Table" "$MAIN_TABLE_JSON"
ensure_table "EchoAi-Studies" "$STUDY_TABLE_JSON"

