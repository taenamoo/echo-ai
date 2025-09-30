# AWS 배포 절차 (현행 코드 기준)

본 문서는 `docs/architecture/current-system.md`, `docs/architecture/todo-system.md`와 `docs/aws-deployment/pre-deployment-gap-analysis-done.md`에 정리된 최신 구조·리스크를 토대로, 현재 레포지토리 상태에서 AWS에 수동 배포를 수행하기 위한 실무 절차를 설명한다. Next.js App Router는 로컬 개발 편의를 위해 유지되지만, 실제 배포 경로는 Vite 기반 SPA + Lambda/API Gateway 조합을 기준으로 한다.

> **자동화 스크립트**
> 
> 모든 절차를 한 번에 실행하고 CloudFront 무효화·정적 자산 업로드·선택적 Secrets 갱신까지 수행하려면 `pnpm run deploy:aws -- --stage <stage>`를 실행한다. 필요 시 `--allowed-origins`, `--secrets-file`, `--skip-bootstrap` 등 옵션으로 세부 동작을 제어할 수 있다. 【F:scripts/deploy/aws-manual-deploy.sh†L1-L231】【F:package.json†L7-L21】

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
