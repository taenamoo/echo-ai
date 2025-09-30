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
  --two-phase                 Run the guided two-pass workflow (backend deploy then UI upload).
  --update-secrets-twice      When used with --two-phase, refresh Secrets Manager in both passes (default: only first pass).
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
two_phase=false
update_secrets_twice=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      # tolerate pnpm/npm passing a standalone "--" sentinel before args
      shift 1
      continue
      ;;
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
    --two-phase)
      two_phase=true
      shift 1
      ;;
    --update-secrets-twice)
      update_secrets_twice=true
      shift 1
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

if [[ "$two_phase" == false && "$update_secrets_twice" == true ]]; then
  echo "Error: --update-secrets-twice requires --two-phase." >&2
  exit 1
fi

if [[ "$two_phase" == true ]]; then
  if [[ "$sync_spa" == false ]]; then
    echo "Error: --skip-spa-upload cannot be combined with --two-phase." >&2
    exit 1
  fi
  if [[ "$invalidate_cache" == false ]]; then
    echo "Error: --skip-invalidation cannot be combined with --two-phase." >&2
    exit 1
  fi
fi

for cmd in pnpm aws node; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: Required command '$cmd' is not available in PATH." >&2
    exit 1
  fi
done

# Always ensure infra deps (ts-node for ESM loader, local cdk, etc.)
echo "Ensuring infra dependencies..."
if ! pnpm --dir infra install --prod=false; then
  echo "Error: pnpm install in infra/ failed. Check network/proxy and registry access." >&2
  exit 1
fi
echo "Building infra CDK app (tsc)..."
if ! pnpm --dir infra run build; then
  echo "Error: infra TypeScript build failed. See errors above." >&2
  exit 1
fi

if [[ "$skip_build" == false ]]; then
  echo "Installing workspace dependencies with pnpm..."
  pnpm install

  echo "Building API lambda bundle (@echo-ai/service-api)..."
  pnpm --filter @echo-ai/service-api build

  echo "Building AI processor bundle (@echo-ai/service-ai-processor)..."
  pnpm --filter @echo-ai/service-ai-processor build

  if [[ "$two_phase" == true ]]; then
    echo "Two-phase mode: delaying SPA build until API endpoint is available."
  else
    echo "Building SPA (@echo-ai/app-spa)..."
    pnpm --filter @echo-ai/app-spa build
  fi
else
  echo "Skipping pnpm install/build as requested."
fi

account="${AWS_ACCOUNT_ID:-}"
if [[ -z "$account" ]]; then
  echo "Resolving AWS account id via STS..."
  if ! account=$(aws sts get-caller-identity --query Account --output text 2>/dev/null); then
    echo "Error: Unable to determine AWS account id. Ensure 'aws sts get-caller-identity' works with your credentials." >&2
    exit 1
  fi
fi

read_output_field() {
  local file="$1"
  local stack="$2"
  local field="$3"
  node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const stack=process.argv[2];const field=process.argv[3];process.stdout.write(data?.[stack]?.[field] ?? '');" "$file" "$stack" "$field"
}

temp_dirs=()
cleanup_temp_dirs() {
  for dir in "${temp_dirs[@]}"; do
    [[ -d "$dir" ]] && rm -rf "$dir"
  done
}
trap cleanup_temp_dirs EXIT

ui_bucket=""
ui_domain=""
ui_dist_id=""
api_endpoint=""
documents_bucket=""
summary_queue_url=""
secret_arn=""
alarm_names=""

print_summary() {
  local label="$1"
  echo
  echo "$label"
  [[ -n "$api_endpoint" ]] && echo "  API Endpoint        : $api_endpoint"
  [[ -n "$documents_bucket" ]] && echo "  Documents Bucket    : $documents_bucket"
  [[ -n "$summary_queue_url" ]] && echo "  Summarize Queue URL : $summary_queue_url"
  [[ -n "$secret_arn" ]] && echo "  Secrets ARN         : $secret_arn"
  [[ -n "$ui_bucket" ]] && echo "  UI Bucket           : $ui_bucket"
  [[ -n "$ui_domain" ]] && echo "  CloudFront Domain   : $ui_domain"
  [[ -n "$ui_dist_id" ]] && echo "  CloudFront Dist ID  : $ui_dist_id"
  [[ -n "$alarm_names" ]] && echo "  Alarm Names         : $alarm_names"
}

run_single_pass() {
  local label="$1"
  local local_skip_bootstrap="$2"
  local local_sync_spa="$3"
  local local_invalidate="$4"
  local local_refresh_secrets="$5"

  echo
  echo "===== $label ====="
  echo "Stage           : $stage"
  echo "Region          : $region"
  echo "Account         : $account"
  if [[ -n "$allowed_origins" ]]; then
    echo "Allowed Origins : $allowed_origins"
  fi
  if [[ -n "$secrets_file" && "$local_refresh_secrets" == true ]]; then
    echo "Secrets File    : $secrets_file"
  fi

  local outputs_dir
  outputs_dir="$(mktemp -d)"
  temp_dirs+=("$outputs_dir")

  local shared_outputs="$outputs_dir/shared.json"
  local api_outputs="$outputs_dir/api.json"

  if [[ "$local_skip_bootstrap" == false ]]; then
    echo "Bootstrapping CDK environment..."
    APP_STAGE="$stage" pnpm --dir infra exec cdk bootstrap "aws://$account/$region"
  else
    echo "Skipping CDK bootstrap."
  fi

  echo "Deploying shared stack (S3 / CloudFront)..."
  APP_STAGE="$stage" pnpm --dir infra exec cdk deploy "EchoAi-Shared-$stage" \
    --require-approval=never \
    --outputs-file "$shared_outputs"

  ui_bucket="$(read_output_field "$shared_outputs" "EchoAi-Shared-$stage" "UiBucketName")"
  ui_domain="$(read_output_field "$shared_outputs" "EchoAi-Shared-$stage" "UiCloudFrontDomain")"
  ui_dist_id="$(read_output_field "$shared_outputs" "EchoAi-Shared-$stage" "UiCloudFrontDistributionId")"

  if [[ -z "$allowed_origins" && -n "$ui_domain" ]]; then
    allowed_origins="https://$ui_domain,http://localhost:5173"
    echo "Derived allowed origins: $allowed_origins"
  fi

  echo "Deploying API stack (API Gateway / Lambdas / DynamoDB / SQS)..."
  APP_STAGE="$stage" ALLOWED_ORIGINS="$allowed_origins" pnpm --dir infra exec cdk deploy "EchoAi-Api-$stage" \
    --require-approval=never \
    --outputs-file "$api_outputs"

  api_endpoint="$(read_output_field "$api_outputs" "EchoAi-Api-$stage" "ApiEndpoint")"
  documents_bucket="$(read_output_field "$api_outputs" "EchoAi-Api-$stage" "DocumentsBucketName")"
  summary_queue_url="$(read_output_field "$api_outputs" "EchoAi-Api-$stage" "SummarizeQueueUrl")"
  secret_arn="$(read_output_field "$api_outputs" "EchoAi-Api-$stage" "SecretsArn")"
  alarm_names="$(read_output_field "$api_outputs" "EchoAi-Api-$stage" "AlarmNames")"

  if [[ "$local_sync_spa" == true ]]; then
    if [[ ! -d apps/spa/dist ]]; then
      echo "Error: SPA build output 'apps/spa/dist' not found. Build the SPA before running this phase." >&2
      exit 1
    fi
    if [[ -z "$ui_bucket" ]]; then
      echo "Warning: Unable to determine UI bucket name; skipping SPA asset upload." >&2
    else
      echo "Syncing SPA assets to s3://$ui_bucket/..."
      aws s3 sync apps/spa/dist "s3://$ui_bucket/" --delete
    fi
  else
    echo "Skipping SPA asset upload as requested."
  fi

  if [[ "$local_invalidate" == true ]]; then
    if [[ -z "$ui_dist_id" ]]; then
      echo "Warning: Unable to determine CloudFront distribution id; skipping invalidation." >&2
    else
      echo "Creating CloudFront invalidation for distribution $ui_dist_id..."
      aws cloudfront create-invalidation --distribution-id "$ui_dist_id" --paths '/*'
    fi
  else
    echo "Skipping CloudFront invalidation as requested."
  fi

  if [[ "$local_refresh_secrets" == true && -n "$secrets_file" ]]; then
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
  elif [[ "$local_refresh_secrets" == true ]]; then
    echo "Secrets file not provided; skipping Secrets Manager update."
  else
    echo "Skipping Secrets Manager refresh in this phase."
  fi

  print_summary "Outputs collected in $label:"
}

if [[ "$two_phase" == true ]]; then
  run_single_pass "Phase 1 – Shared/API deployment" "$skip_bootstrap" false false true

  if [[ "$skip_build" == false ]]; then
    if [[ -z "$api_endpoint" ]]; then
      echo "Error: Unable to determine API endpoint after phase 1." >&2
      exit 1
    fi
    echo
    echo "Rebuilding SPA with VITE_API_BASE_URL=$api_endpoint ..."
    VITE_API_BASE_URL="$api_endpoint" pnpm --filter @echo-ai/app-spa build
  else
    echo
    echo "--skip-build supplied; ensure SPA dist already points to $api_endpoint before continuing."
  fi

  if [[ ! -d apps/spa/dist ]]; then
    echo "Error: SPA build output 'apps/spa/dist' not found after phase 1." >&2
    exit 1
  fi

  echo
  echo "Proceeding to Phase 2 with SPA upload and CloudFront invalidation..."
  run_single_pass "Phase 2 – SPA sync & verification" true "$sync_spa" "$invalidate_cache" "$update_secrets_twice"
else
  if [[ "$sync_spa" == true && ! -d apps/spa/dist ]]; then
    echo "Error: SPA build output 'apps/spa/dist' not found. Run without --skip-build or build manually." >&2
    exit 1
  fi

  run_single_pass "Deployment" "$skip_bootstrap" "$sync_spa" "$invalidate_cache" true
fi

echo
echo "Remember to verify application functionality and alarms per docs/aws-deployment/current-deployment-steps.md."
