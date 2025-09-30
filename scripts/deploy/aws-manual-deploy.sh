#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: aws-manual-deploy.sh --stage <stage> [options]

Required arguments:
  --stage <stage>             Deployment stage name (e.g. develop, staging, production).

Optional arguments:
  --region <region>           AWS region to deploy to (defaults to env AWS_REGION/AWS_DEFAULT_REGION/CDK_DEFAULT_REGION or ap-northeast-2).
  --allowed-origins <csv>     Comma-separated list of origins for API Gateway & S3 CORS (defaults to derived CloudFront domain + localhost).
  --skip-bootstrap            Skip the CDK bootstrap step (useful after the first run).
  --skip-build                Skip pnpm install and build steps (assumes artifacts are ready).
  --skip-spa-upload           Do not sync the SPA dist assets to S3.
  --skip-invalidation         Do not create a CloudFront invalidation after syncing assets.
  --secrets-file <path>       JSON file whose contents will be stored in the deployed Secrets Manager secret.
  -h, --help                  Show this help message.

Environment variables respected:
  APP_STAGE, AWS_REGION, AWS_DEFAULT_REGION, CDK_DEFAULT_REGION, AWS_ACCOUNT_ID, ALLOWED_ORIGINS

Examples:
  ./scripts/deploy/aws-manual-deploy.sh --stage develop
  pnpm run deploy:aws -- --stage staging --allowed-origins "https://app.example.com"
USAGE
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

stage="${APP_STAGE:-}"
region="${AWS_REGION:-${AWS_DEFAULT_REGION:-${CDK_DEFAULT_REGION:-ap-northeast-2}}}"
allowed_origins="${ALLOWED_ORIGINS:-}"
skip_bootstrap=false
skip_build=false
sync_spa=true
invalidate_cache=true
secrets_file=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stage)
      stage="$2"
      shift 2
      ;;
    --region)
      region="$2"
      shift 2
      ;;
    --allowed-origins)
      allowed_origins="$2"
      shift 2
      ;;
    --skip-bootstrap)
      skip_bootstrap=true
      shift 1
      ;;
    --skip-build)
      skip_build=true
      shift 1
      ;;
    --skip-spa-upload)
      sync_spa=false
      shift 1
      ;;
    --skip-invalidation)
      invalidate_cache=false
      shift 1
      ;;
    --secrets-file)
      secrets_file="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$stage" ]]; then
  echo "Error: --stage is required (or set APP_STAGE)." >&2
  usage >&2
  exit 1
fi

for cmd in pnpm aws node; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: Required command '$cmd' is not available in PATH." >&2
    exit 1
  fi
done

if ! pnpm --dir infra exec cdk --version >/dev/null 2>&1; then
  echo "Installing infra dependencies..."
  pnpm --dir infra install >/dev/null
fi

if [[ "$skip_build" == false ]]; then
  echo "Installing workspace dependencies with pnpm..."
  pnpm install

  echo "Building SPA (@echo-ai/app-spa)..."
  pnpm --filter @echo-ai/app-spa build

  echo "Building API lambda bundle (@echo-ai/service-api)..."
  pnpm --filter @echo-ai/service-api build

  echo "Building AI processor bundle (@echo-ai/service-ai-processor)..."
  pnpm --filter @echo-ai/service-ai-processor build
else
  echo "Skipping pnpm install/build as requested."
fi

if [[ "$sync_spa" == true && ! -d apps/spa/dist ]]; then
  echo "Error: SPA build output 'apps/spa/dist' not found. Run without --skip-build or build manually." >&2
  exit 1
fi

account="${AWS_ACCOUNT_ID:-}"
if [[ -z "$account" ]]; then
  echo "Resolving AWS account id via STS..."
  if ! account=$(aws sts get-caller-identity --query Account --output text 2>/dev/null); then
    echo "Error: Unable to determine AWS account id. Ensure 'aws sts get-caller-identity' works with your credentials." >&2
    exit 1
  fi
fi

echo "Using configuration:"
echo "  Stage           : $stage"
echo "  Region          : $region"
echo "  Account         : $account"
if [[ -n "$allowed_origins" ]]; then
  echo "  Allowed Origins : $allowed_origins"
fi
if [[ -n "$secrets_file" ]]; then
  echo "  Secrets File    : $secrets_file"
fi

outputs_dir="$(mktemp -d)"
trap 'rm -rf "$outputs_dir"' EXIT

shared_outputs="$outputs_dir/shared.json"
api_outputs="$outputs_dir/api.json"

if [[ "$skip_bootstrap" == false ]]; then
  echo "Bootstrapping CDK environment..."
  APP_STAGE="$stage" pnpm --dir infra exec cdk bootstrap "aws://$account/$region"
else
  echo "Skipping CDK bootstrap."
fi

echo "Deploying shared stack (S3 / CloudFront)..."
APP_STAGE="$stage" pnpm --dir infra exec cdk deploy "EchoAi-Shared-$stage" \
  --require-approval=never \
  --outputs-file "$shared_outputs"

ui_bucket="$(node -e "const fs=require('fs');const p=process.argv[1];const stack=process.argv[2];const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write((data[stack]&&data[stack].UiBucketName)||'');" "$shared_outputs" "EchoAi-Shared-$stage")"
ui_domain="$(node -e "const fs=require('fs');const p=process.argv[1];const stack=process.argv[2];const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write((data[stack]&&data[stack].UiCloudFrontDomain)||'');" "$shared_outputs" "EchoAi-Shared-$stage")"
ui_dist_id="$(node -e "const fs=require('fs');const p=process.argv[1];const stack=process.argv[2];const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write((data[stack]&&data[stack].UiCloudFrontDistributionId)||'');" "$shared_outputs" "EchoAi-Shared-$stage")"

if [[ -z "$allowed_origins" && -n "$ui_domain" ]]; then
  allowed_origins="https://$ui_domain,http://localhost:5173"
fi

echo "Deploying API stack (API Gateway / Lambdas / DynamoDB / SQS)..."
APP_STAGE="$stage" ALLOWED_ORIGINS="$allowed_origins" pnpm --dir infra exec cdk deploy "EchoAi-Api-$stage" \
  --require-approval=never \
  --outputs-file "$api_outputs"

api_endpoint="$(node -e "const fs=require('fs');const p=process.argv[1];const stack=process.argv[2];const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write((data[stack]&&data[stack].ApiEndpoint)||'');" "$api_outputs" "EchoAi-Api-$stage")"
documents_bucket="$(node -e "const fs=require('fs');const p=process.argv[1];const stack=process.argv[2];const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write((data[stack]&&data[stack].DocumentsBucketName)||'');" "$api_outputs" "EchoAi-Api-$stage")"
summary_queue_url="$(node -e "const fs=require('fs');const p=process.argv[1];const stack=process.argv[2];const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write((data[stack]&&data[stack].SummarizeQueueUrl)||'');" "$api_outputs" "EchoAi-Api-$stage")"
secret_arn="$(node -e "const fs=require('fs');const p=process.argv[1];const stack=process.argv[2];const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write((data[stack]&&data[stack].SecretsArn)||'');" "$api_outputs" "EchoAi-Api-$stage")"
alarm_names="$(node -e "const fs=require('fs');const p=process.argv[1];const stack=process.argv[2];const data=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write((data[stack]&&data[stack].AlarmNames)||'');" "$api_outputs" "EchoAi-Api-$stage")"

if [[ "$sync_spa" == true ]]; then
  if [[ -z "$ui_bucket" ]]; then
    echo "Warning: Unable to determine UI bucket name; skipping SPA asset upload." >&2
  else
    echo "Syncing SPA assets to s3://$ui_bucket/..."
    aws s3 sync apps/spa/dist "s3://$ui_bucket/" --delete
  fi
else
  echo "Skipping SPA asset upload as requested."
fi

if [[ "$invalidate_cache" == true ]]; then
  if [[ -z "$ui_dist_id" ]]; then
    echo "Warning: Unable to determine CloudFront distribution id; skipping invalidation." >&2
  else
    echo "Creating CloudFront invalidation for distribution $ui_dist_id..."
    aws cloudfront create-invalidation --distribution-id "$ui_dist_id" --paths '/*'
  fi
else
  echo "Skipping CloudFront invalidation as requested."
fi

if [[ -n "$secrets_file" ]]; then
  if [[ ! -f "$secrets_file" ]]; then
    echo "Error: Provided secrets file '$secrets_file' does not exist." >&2
    exit 1
  fi
  if [[ -z "$secret_arn" ]]; then
    echo "Error: Secrets ARN not found in stack outputs; cannot update secrets." >&2
    exit 1
  fi
  echo "Updating Secrets Manager secret $secret_arn using $secrets_file..."
  aws secretsmanager put-secret-value --secret-id "$secret_arn" --secret-string "$(cat "$secrets_file")"
fi

echo
echo "Deployment complete. Key outputs:"
[[ -n "$api_endpoint" ]] && echo "  API Endpoint        : $api_endpoint"
[[ -n "$documents_bucket" ]] && echo "  Documents Bucket    : $documents_bucket"
[[ -n "$summary_queue_url" ]] && echo "  Summarize Queue URL : $summary_queue_url"
[[ -n "$secret_arn" ]] && echo "  Secrets ARN         : $secret_arn"
[[ -n "$ui_bucket" ]] && echo "  UI Bucket           : $ui_bucket"
[[ -n "$ui_domain" ]] && echo "  CloudFront Domain   : $ui_domain"
[[ -n "$ui_dist_id" ]] && echo "  CloudFront Dist ID  : $ui_dist_id"
[[ -n "$alarm_names" ]] && echo "  Alarm Names         : $alarm_names"

echo "Remember to verify application functionality and alarms per docs/aws-deployment/current-deployment-steps.md."
