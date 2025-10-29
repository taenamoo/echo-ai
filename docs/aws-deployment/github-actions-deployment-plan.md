# GitHub Actions 기반 develop 배포 CI/CD 계획

본 문서는 `docs/aws-deployment/current-deployment-steps.md`와 `scripts/deploy/aws-manual-deploy.sh`에서 정리된 수동 배포 절차를 GitHub Actions 워크플로우로 자동화해, `develop` 브랜치에 머지될 때 AWS로 배포되도록 구성하기 위한 실행 계획을 설명한다.

## 1. 목표와 범위
- `develop` 브랜치 머지 시점에 CDK 스택과 SPA 정적 자산을 자동 배포한다.
- 기존 스크립트(`pnpm run deploy:aws`)의 두 단계 배포 플로우를 그대로 활용한다.
- QA 환경을 대표하는 `develop` Stage에 한정하며, `staging`/`production` Stage 확대는 추후 과제로 남긴다.

## 2. 현재 배포 절차 핵심 요약
- 스크립트는 CDK 부트스트랩 → Shared 스택 → API 스택 → (필요 시) SPA 업로드 → CloudFront 무효화 순서를 수행한다.【scripts/deploy/aws-manual-deploy.sh†L107-L220】
- `--two-phase` 옵션을 사용하면 1차로 백엔드만 배포하고 API Endpoint를 확보한 뒤 SPA를 재빌드/업로드하여 올바른 `VITE_API_BASE_URL`을 주입한다.【scripts/deploy/aws-manual-deploy.sh†L198-L220】
- Secrets Manager 갱신을 위해 JSON 파일(`JWT_SECRET`, `GEMINI_API_KEY`, `SUMMARIZE_PROVIDER`)을 로컬에서 읽어 전달한다.【docs/aws-deployment/current-deployment-steps.md†L9-L60】【scripts/deploy/aws-manual-deploy.sh†L37-L191】

## 3. CI/CD 기본 요건

### 3.1 GitHub → AWS 인증
1. GitHub Actions OIDC 공급자를 AWS IAM Identity Provider에 등록한다.
2. `develop` Stage 배포용 IAM Role(`EchoAiDevelopDeployRole` 등)을 생성하고 `sts:AssumeRoleWithWebIdentity`를 허용한다.
3. Role 정책에는 다음 서비스 권한을 최소 범위로 포함한다.
   - `cloudformation:*`, `iam:PassRole` (CDK 배포에 필요한 리소스 한정)
   - `s3:*` (UI 버킷 동기화)
   - `cloudfront:CreateInvalidation`
   - `secretsmanager:PutSecretValue`, `secretsmanager:GetSecretValue`
   - `dynamodb`, `sqs`, `logs`, `lambda` 등 API 스택이 사용하는 리소스에 대한 CDK 배포 권한
4. Role ARN은 GitHub Actions 시크릿/환경 변수로 저장해 `aws-actions/configure-aws-credentials`에서 사용한다.
> 참고: `scripts/deploy/aws-manual-deploy.sh`는 배포 중 `aws sts get-caller-identity`를 호출한다.【scripts/deploy/aws-manual-deploy.sh†L123-L139】 로컬에서 수동 실행하려면 먼저 `aws configure` 또는 AWS SSO(예: `aws sso login`)를 통해 Access Key/Secret Key 혹은 세션 자격 증명을 등록해야 한다. GitHub Actions에서는 `aws-actions/configure-aws-credentials`가 동일한 역할을 수행하므로 별도의 `aws configure` 과정이 필요 없다.

### 3.2 GitHub 시크릿/환경 변수 설계
- `Repository Secrets` 또는 `Environments > develop`에 다음 항목을 등록한다.
  - `AWS_ROLE_TO_ASSUME`, `AWS_REGION` (예: `ap-northeast-2`)
  - OIDC를 사용할 수 없는 경우를 대비해 `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, 필요 시 `AWS_SESSION_TOKEN`을 등록한다.
  - 배포용 API/SPA 시크릿: `JWT_SECRET`, `GEMINI_API_KEY`, `SUMMARIZE_PROVIDER`
  - `APP_STAGE`(옵션, 기본값 `develop`)
  - `ALLOWED_ORIGINS_DEVELOP` (예: `https://develop.example.com,http://localhost:5173`)
- 워크플로우에서 사용하기 쉽게 `env` 또는 `vars`로 Stage/Region 상수를 설정한다.

### 3.3 GitHub 환경
- `develop` 환경을 생성하고, 필요 시 배포 승인자 제어(환경 보호 규칙)를 추가한다.
- 배포 결과 URL, CloudFront 도메인 등을 환경 출력값(Environment deployment status)에 기록하는 것을 목표로 한다.

## 4. 워크플로우 아키텍처
```
develop branch push/merge
├─ job: verify
│  ├─ checkout → pnpm setup → pnpm install
│  ├─ unit/contract 테스트 (예: pnpm test:auth, test:contracts)
│  └─ (선택) SPA 빌드 검사
└─ job: deploy (needs: verify)
   ├─ checkout → pnpm setup → 캐시 복원
   ├─ configure-aws-credentials (OIDC, role assume)
   ├─ 시크릿 JSON 파일 생성 (runner 임시 경로)
   ├─ pnpm run deploy:aws -- --stage develop --two-phase ...
   ├─ 배포 요약 출력 및 아티팩트 업로드 (선택)
   └─ GitHub Deployments API로 상태 보고
```

## 5. GitHub Actions 예시 스캐폴드
```yaml
name: Deploy develop to AWS

on:
  push:
    branches: [develop]
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

env:
  STAGE: develop
  AWS_REGION: ap-northeast-2
  ALLOWED_ORIGINS: ${{ secrets.ALLOWED_ORIGINS_DEVELOP }}

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.13.1
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:auth
      - run: pnpm test:contracts

  deploy:
    needs: verify
    runs-on: ubuntu-latest
    environment: develop
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.13.1
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Prepare secrets payload
        run: |
          mkdir -p tmp/deploy
          cat <<'JSON' > tmp/deploy/${{ env.STAGE }}-secrets.json
          {
            "JWT_SECRET": "${{ secrets.JWT_SECRET }}",
            "GEMINI_API_KEY": "${{ secrets.GEMINI_API_KEY }}",
            "SUMMARIZE_PROVIDER": "${{ secrets.SUMMARIZE_PROVIDER }}"
          }
          JSON
      - name: Deploy with CDK helper script
        run: |
          pnpm run deploy:aws -- \
            --stage "${{ env.STAGE }}" \
            --region "${{ env.AWS_REGION }}" \
            --allowed-origins "${{ env.ALLOWED_ORIGINS }}" \
            --secrets-file "tmp/deploy/${{ env.STAGE }}-secrets.json" \
            --two-phase
      - name: Upload deployment summary (optional)
        if: always()
        run: |
          pnpm dlx tsx scripts/tools/print-deploy-summary.ts || true
```

### 5.1 핵심 포인트
- `pnpm run deploy:aws`는 스크립트 내부에서 CDK 부트스트랩/배포와 SPA 업로드를 모두 처리한다.【scripts/deploy/aws-manual-deploy.sh†L73-L220】
- 두 번째 패스에서 API Endpoint로 SPA를 재빌드하기 때문에 `--two-phase` 플래그를 반드시 포함한다.
- Secrets JSON은 Runner 로컬에만 쓰고, 작업 종료 후 GitHub 환경 변수나 로그에 남기지 않는다.
- `aws-actions/configure-aws-credentials`는 세션 토큰을 자동 주입하므로 별도의 `aws configure` 단계가 필요 없다.
- 워크플로우는 `AWS_ROLE_TO_ASSUME`가 존재하면 OIDC 역할을, 없을 경우 `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` 시크릿을 사용해 자격 증명을 구성하도록 분기한다.

## 6. 실패 대응 및 롤백 전략
- CDK 배포 실패 시, 스택 이벤트는 CloudWatch Logs와 CloudFormation 콘솔에서 확인한다.
- SPA 업로드 이후 문제가 발생하면 `--spa-only` 옵션으로 정적 자산만 재배포할 수 있다.【docs/aws-deployment/current-deployment-steps.md†L75-L110】
- Secrets 수정이 잘못 올라간 경우, GitHub Actions 실행을 재실행하기 전에 AWS 콘솔에서 이전 버전으로 롤백하거나 `aws secretsmanager put-secret-value`로 복구한다.
- 배포 성공 후에도 `docs/aws-deployment/current-deployment-steps.md`의 후속 점검 체크리스트(Secrets, CloudFront, API 기능)를 수행한다.【docs/aws-deployment/current-deployment-steps.md†L61-L110】

## 7. 향후 확장 고려 사항
- `develop` 외 Stage(`staging`, `production`)에 대해 GitHub Environments를 추가하고 분리된 IAM Role/시크릿을 정의한다.
- Contract 테스트(예: `pnpm test:contracts`)를 CloudFormation 배포 후 `post-deploy` 단계에서 다시 실행해 API Gateway 엔드포인트를 직접 검증한다.
- CloudFront 도메인, API Endpoint 등을 GitHub Actions 출력(artifact 또는 Summary)으로 발행해 팀 공유를 자동화한다.
- 장기적으로는 `--skip-build` 옵션을 활용하고, 빌드 및 배포 단계를 분리해 캐시 효율을 높이는 방안을 검토한다.
