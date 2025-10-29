# AWS 배포 절차 (현행 코드 기준)

본 문서는 `docs/architecture/current-system.md`, `docs/architecture/todo-system.md`와 `docs/aws-deployment/pre-deployment-gap-analysis-done.md`에 정리된 최신 구조·리스크를 토대로, 현재 레포지토리 상태에서 AWS에 수동 배포를 수행하기 위한 실무 절차를 설명한다. Next.js App Router는 로컬 개발 편의를 위해 유지되지만, 실제 배포 경로는 Vite 기반 SPA + Lambda/API Gateway 조합을 기준으로 한다.

> **자동화 스크립트**
>
> 모든 절차를 한 번에 실행하고 CloudFront 무효화·정적 자산 업로드·선택적 Secrets 갱신까지 수행하려면 `pnpm run deploy:aws -- --stage <stage>`를 실행한다. 필요 시 `--allowed-origins`, `--secrets-file`, `--skip-bootstrap` 등 옵션으로 세부 동작을 제어할 수 있다. 【F:scripts/deploy/aws-manual-deploy.sh†L1-L231】【F:package.json†L7-L21】

### 예시 시나리오: develop Stage 두 단계 배포

1. **사전 준비**
   - 로컬에 Node.js 20.x, pnpm 10.x, AWS CLI v2, AWS CDK v2를 설치하고 `pnpm install`이 완료되는지 점검한다. 【F:scripts/deploy/aws-manual-deploy.sh†L32-L101】
   - `tmp/deploy/develop-secrets.json` 같은 위치에 Secrets JSON(`JWT_SECRET`, `GEMINI_API_KEY`, `SUMMARIZE_PROVIDER`)을 작성한다. 【F:scripts/deploy/aws-manual-deploy.sh†L37-L101】
   - `APP_STAGE=develop`, `ALLOWED_ORIGINS` 후보(`https://develop.example.com,http://localhost:5173`)를 준비한다.

2. **명령 실행**

   ```bash
   pnpm run deploy:aws -- \
     --stage develop \
     --region ap-northeast-2 \
     --allowed-origins "https://develop.example.com,http://localhost:5173" \
     --secrets-file tmp/deploy/develop-secrets.json \
     --two-phase
   ```

3. **Phase 1 (백엔드 배포)**
   - 스크립트가 CDK 부트스트랩을 수행한 뒤 Shared 스택을 배포하고 CloudFront 도메인을 확보한다. 필요 시 CloudFront와 로컬 호스트가 자동으로 허용 도메인에 추가된다. 【F:scripts/deploy/aws-manual-deploy.sh†L107-L196】
   - 이어서 API 스택을 배포하고 Secrets ARN, API Endpoint 등을 수집한 후 Secrets Manager 값을 갱신한다. 【F:scripts/deploy/aws-manual-deploy.sh†L145-L196】
   - 콘솔에 출력된 API Endpoint, CloudFront Domain, Secrets ARN을 메모한다.

   명령 예(Phase 1만 단독 실행하고 싶은 경우):

   ```bash
   pnpm run deploy:aws -- \
     --stage develop \
     --region ap-northeast-2 \
     --allowed-origins "https://develop.example.com,http://localhost:5173" \
     --secrets-file tmp/deploy/develop-secrets.json \
     --skip-spa-upload \
     --skip-invalidation
   ```

4. **Phase 1 종료 후 SPA 빌드**
   - 스크립트가 Phase 1에서 확보한 API Endpoint를 `VITE_API_BASE_URL`로 주입해 SPA를 자동으로 재빌드한다. `--skip-build`를 사용했다면 동일한 값을 수동으로 주입해 빌드한다. 【F:scripts/deploy/aws-manual-deploy.sh†L198-L215】

   명령 예(수동 재빌드):

   ```bash
   API_ENDPOINT=$(aws cloudformation describe-stacks \
     --stack-name EchoAi-Api-develop \
     --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
     --output text)

   echo "API endpoint: $API_ENDPOINT"
   VITE_API_BASE_URL="$API_ENDPOINT" pnpm --filter @echo-ai/app-spa build
   ```

5. **Phase 2 (UI 업로드)**
   - SPA 빌드 산출물이 존재하는지 확인한 뒤 S3 버킷으로 동기화하고 CloudFront 캐시를 무효화한다. 【F:scripts/deploy/aws-manual-deploy.sh†L148-L191】【F:scripts/deploy/aws-manual-deploy.sh†L215-L220】
   - 필요 시 `--update-secrets-twice`를 추가해 Phase 2에서도 Secrets를 다시 갱신할 수 있다. 【F:scripts/deploy/aws-manual-deploy.sh†L21-L24】【F:scripts/deploy/aws-manual-deploy.sh†L215-L220】

   명령 예(Phase 2만 단독 실행하고 싶은 경우):

   ```bash
   # Phase 1에서 이미 배포/부트스트랩이 끝났다고 가정
   # (idempotent 하게 Shared/API 스택을 다시 확인 후, SPA 동기화/무효화 수행)
   pnpm run deploy:aws -- \
     --stage develop \
     --region ap-northeast-2 \
     --allowed-origins "https://develop.example.com,http://localhost:5173" \
     --skip-bootstrap \
     --skip-build \
     --secrets-file tmp/deploy/develop-secrets.json \
     --update-secrets-twice
   ```

6. **후속 점검**
   - 명령 종료 후 요약된 출력(API Endpoint, CloudFront Domain 등)을 기반으로 `.env.production` 또는 호스팅 환경 변수에 반영한다. 【F:scripts/deploy/aws-manual-deploy.sh†L120-L137】【F:scripts/deploy/aws-manual-deploy.sh†L188-L196】
   - `docs/aws-deployment/current-deployment-steps.md`의 4~5장 절차에 따라 Secrets, 정적 자산, CloudFront, API 기능을 점검한다.

### SPA만 재배포해야 할 때

- Lambda/API는 최신 상태이고 정적 자산만 교체하면 되는 경우 `--spa-only` 옵션을 사용한다. 스크립트는 CloudFormation에서 기존 S3/CloudFront 출력을 읽어온 뒤, 필요하면 SPA를 다시 빌드하고(기존 API Endpoint를 자동 주입) 자산 동기화·무효화를 수행한다. 【F:scripts/deploy/aws-manual-deploy.sh†L90-L164】【F:scripts/deploy/aws-manual-deploy.sh†L297-L340】
- 기본 실행 예시는 다음과 같다.

  ```bash
  pnpm run deploy:aws -- \
    --stage develop \
    --region ap-northeast-2 \
    --spa-only
  ```

  - `--skip-build`을 함께 넘기면 기존 `apps/spa/dist`를 그대로 사용하고, `--skip-spa-upload` 또는 `--skip-invalidation`으로 개별 동작을 생략할 수 있다. 【F:scripts/deploy/aws-manual-deploy.sh†L108-L158】【F:scripts/deploy/aws-manual-deploy.sh†L318-L339】
  - `--spa-only` 모드에서는 Secrets 업데이트 옵션이 무시되므로 민감정보를 변경하려면 일반 배포 또는 Phase 1을 다시 실행한다. 【F:scripts/deploy/aws-manual-deploy.sh†L321-L337】
  - 선행 조건: `EchoAi-Shared-<stage>`와 `EchoAi-Api-<stage>` 스택이 이미 존재해야 하며, CloudFormation 출력에 `UiBucketName`이 포함되어 있어야 한다. 값이 비어 있으면 스크립트는 오류와 함께 종료한다. 【F:scripts/deploy/aws-manual-deploy.sh†L308-L345】【F:scripts/deploy/aws-manual-deploy.sh†L420-L459】

## 0. 참고 자료와 현재 상태 점검

- **현행 아키텍처 개요**: Lambda 단일 코드베이스, Secrets Manager 하이드레이션, 비동기 요약 흐름, Next.js API 제거 상황을 확인한다. 【F:docs/architecture/current-system.md†L1-L73】
- **목표 구조/남은 과제**: GitHub Actions OIDC, 모니터링, Secrets 회전 자동화 등 미구현 작업은 후속 단계로 남겨둔다. 【F:docs/architecture/todo-system.md†L1-L60】【F:docs/aws-deployment/pre-deployment-gap-analysis-done.md†L61-L118】
- **격차 조치 현황**: Stage 접미사, tsup 번들 스크립트, Secrets 하이드레이션 등 선행 과제가 완료되었음을 확인한다. 【F:docs/aws-deployment/pre-deployment-gap-analysis-done.md†L1-L118】

## 1. 사전 준비

1. **로컬 개발 도구**
   - Node.js 20.x, pnpm 10.x, AWS CLI v2, AWS CDK v2(`npm install -g aws-cdk`) 설치.
   - `pnpm install` 실행 후 워크스페이스 종속성과 TypeScript 빌드가 정상인지 확인.
2. **AWS 계정/권한**
   - AdministratorAccess 혹은 CDK가 생성하는 리소스(IAM, Lambda, API Gateway, DynamoDB, SQS, S3, CloudFront, Secrets Manager, CloudWatch)를 조작할 권한이 필요하다.
   - 현 단계에서는 로컬 자격 증명(`aws configure` 혹은 프로파일)으로 배포하고, OIDC 역할은 후속 자동화 과제로 남긴다. 【F:docs/architecture/todo-system.md†L29-L60】
3. **배포 Stage 정의**
   - `APP_STAGE` 값을 결정한다(예: `develop`, `staging`, `production`). Stage 문자열은 CDK에서 S3/SQS/DynamoDB 이름에 접미사로 사용되므로 실제 사용할 Stage 값으로 통일한다. 【F:infra/lib/api-stack.ts†L20-L43】
   - API Gateway CORS 허용 도메인(`ALLOWED_ORIGINS`) 목록을 준비한다. 미지정 시 로컬 도메인과 CloudFront 도메인이 기본값으로 사용된다. 【F:infra/lib/api-stack.ts†L24-L39】
4. **Secrets 준비**
   - Secrets Manager에 저장할 JSON 구조를 정리한다. 최소 `JWT_SECRET`, `GEMINI_API_KEY`, `SUMMARIZE_PROVIDER` 키가 필요하며, CDK가 생성한 Secret을 배포 직후 업데이트한다. 【F:infra/lib/api-stack.ts†L68-L118】【F:docs/aws-deployment/pre-deployment-gap-analysis-done.md†L69-L102】

## 2. 코드/아티팩트 빌드

1. **SPA 빌드**
   - `pnpm --filter @echo-ai/app-spa build` 실행으로 `apps/spa/dist`를 생성한다. CloudFront 캐시 무효화 및 정적 배포에 사용할 자산이다. 【F:apps/spa/package.json†L1-L15】【F:docs/architecture/current-system.md†L9-L27】
2. **Lambda 번들**
   - `pnpm --filter @echo-ai/service-api build` 실행 → `services/api/dist/lambda` 산출.
   - `pnpm --filter @echo-ai/service-ai-processor build` 실행 → `services/ai-processor/dist` 산출.
   - 두 워크스페이스는 `tsup` 구성을 사용하므로 동일 명령으로 재빌드 가능하다. 【F:services/api/package.json†L1-L13】【F:services/api/tsup.config.ts†L1-L34】【F:services/ai-processor/package.json†L1-L13】【F:services/ai-processor/tsup.config.ts†L1-L18】
3. **공유 패키지 검증**
   - Lambda가 참조하는 `packages/@echo-ai/*` 모듈(TypeScript, Zod 스키마 등)이 빌드 에러 없이 동작하는지 확인한다. 필요 시 `pnpm lint`/`pnpm test:contracts`를 실행한다. 【F:packages/@echo-ai/api-core/src/schemas/study.ts†L1-L44】【F:services/api/src/lambda/study.ts†L1-L220】
4. **환경 변수 확인**
   - 프런트엔드 Axios 인스턴스는 `NEXT_PUBLIC_API_BASE_URL` 또는 SPA 런타임 설정으로 API Gateway URL을 참조한다. 배포 후 해당 값을 CloudFront에서 주입하거나 `.env.production`에 반영한다. 【F:apps/web/src/lib/axios.ts†L1-L29】

## 3. CDK 부트스트랩 및 배포

1. **CDK 부트스트랩**
   - `cd infra`
   - `APP_STAGE=<stage> cdk bootstrap aws://<account>/<region>` (필요 시 `AWS_PROFILE=<profile>` 지정).
2. **Shared Stack 배포**
   - `APP_STAGE=<stage> cdk deploy EchoAi-Shared-<stage> --require-approval=never`
   - 출력되는 `UiBucketName`, `UiCloudFrontDomain`, `UiCloudFrontDistributionId` 값을 기록한다. 【F:infra/lib/shared-stack.ts†L8-L52】
3. **API Stack 배포**
   - `APP_STAGE=<stage> ALLOWED_ORIGINS=https://<CloudFrontDomain> cdk deploy EchoAi-Api-<stage> --require-approval=never`
   - 배포 완료 후 `ApiEndpoint`, `DocumentsBucketName`, `SummarizeQueueUrl`, `SecretsArn`, `AlarmNames`를 기록한다. Lambda 함수는 Stage 접미사와 Secrets 환경 변수를 포함한 상태로 생성된다. 【F:infra/lib/api-stack.ts†L20-L213】

> **참고**: 자동화 스크립트는 위 세 단계를 순서대로 실행하고, `aws sts get-caller-identity`로 계정 정보를 조회한 뒤 `--outputs-file`을 통해 스택 출력값을 저장한다. 이후 S3 자산 동기화, CloudFront 무효화, Secrets 갱신까지 이어서 수행한다. 【F:scripts/deploy/aws-manual-deploy.sh†L73-L188】

## 4. 배포 후 수동 작업

1. **Secrets Manager 갱신**
   - `aws secretsmanager put-secret-value --secret-id <SecretsArn> --secret-string '{"JWT_SECRET":"...","GEMINI_API_KEY":"...","SUMMARIZE_PROVIDER":"gemini"}'`
   - AI Processor와 API Lambda는 실행 시 Secrets Manager에서 값을 다시 로드하므로 환경 변수 변경 없이 즉시 적용된다. 【F:services/ai-processor/src/handler.ts†L12-L170】【F:docs/aws-deployment/pre-deployment-gap-analysis-done.md†L69-L102】
2. **정적 자산 업로드**
   - `aws s3 sync apps/spa/dist s3://<UiBucketName>/ --delete`
   - 추가로 배포 도메인을 Route 53/ACM과 연동할 경우 CloudFront에 CNAME/인증서를 연결한다(선택).
3. **CloudFront 캐시 무효화**
   - `aws cloudfront create-invalidation --distribution-id <UiCloudFrontDistributionId> --paths '/*'`
4. **문서 버킷 CORS 확인**
   - `ALLOWED_ORIGINS`에 CloudFront 도메인이 포함되었는지 확인하여 브라우저 업로드가 정상 작동하는지 점검한다. 【F:infra/lib/api-stack.ts†L24-L118】

## 5. 검증 절차

1. **API 기능 점검**
   - `curl -X POST <ApiEndpoint>/auth/signup` 등 주요 엔드포인트 호출로 2xx/4xx 응답을 확인한다.
   - 문서 업로드 → 요약 요청 → SQS 큐로 메시지가 전송되는지 CloudWatch/SQS 콘솔에서 확인한다. 【F:infra/lib/api-stack.ts†L145-L213】
2. **Lambda/큐 모니터링**
   - 배포 시 생성된 `AlarmNames`(SQS 지연, AI Processor 오류, API 5xx)를 CloudWatch 콘솔에서 확인하고 SNS 구독을 설정한다. 【F:infra/lib/api-stack.ts†L187-L213】
3. **프런트엔드 흐름 확인**
   - CloudFront 도메인 접속 → 로그인, 문서 업로드, 요약/스터디 기능을 전부 실행해 본다.
   - 로컬 스토리지 토큰 갱신, 요약 큐 상태 표시, 오류 핸들링이 UI에 반영되는지 검증한다. 【F:docs/architecture/current-system.md†L9-L44】【F:apps/web/src/app/documents/page.tsx†L1-L620】

## 6. 알려진 제한 및 후속 과제

- Secrets 회전 자동화, GitHub Actions 기반 CI/CD, CloudWatch 대시보드·태깅 체계는 아직 미구현 상태다. 추후 `docs/architecture/todo-system.md`에 정의된 계획에 따라 진행한다. 【F:docs/architecture/todo-system.md†L29-L116】【F:docs/aws-deployment/pre-deployment-gap-analysis-done.md†L101-L118】
- DynamoDB 프로필 SK 정합성, 프런트엔드 통합(Next → SPA 완전 전환) 등 아키텍처 문서에 남은 리스크를 후속으로 해소한다. 【F:docs/architecture/current-system.md†L45-L73】
