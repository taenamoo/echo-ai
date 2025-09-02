#!/bin/bash
set -euo pipefail

# Ensure S3 bucket exists in LocalStack
BUCKET="${S3_BUCKET_NAME:-test-bucket}"
REGION="${AWS_REGION:-ap-northeast-2}"

echo "[LocalStack Init] Ensuring S3 bucket: ${BUCKET} in region: ${REGION}"

if awslocal s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "[LocalStack Init] Bucket already exists: $BUCKET"
else
  if [ "$REGION" = "us-east-1" ]; then
    awslocal s3api create-bucket --bucket "$BUCKET"
  else
    awslocal s3api create-bucket \
      --bucket "$BUCKET" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  echo "[LocalStack Init] Bucket created: $BUCKET"
fi

