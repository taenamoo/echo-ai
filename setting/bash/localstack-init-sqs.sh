#!/bin/bash
set -euo pipefail

# Create SQS queue for summarization in LocalStack
QUEUE_NAME="${SUMMARIZE_SQS_QUEUE_NAME:-echoai-summarize-queue}"

echo "[LocalStack Init] Ensuring SQS queue: ${QUEUE_NAME}"
awslocal sqs create-queue \
  --queue-name "${QUEUE_NAME}" \
  >/dev/null || true

echo "[LocalStack Init] SQS queue ready: ${QUEUE_NAME}"

