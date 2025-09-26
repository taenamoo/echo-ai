# AWS 개발 서버 배포 계획서 (Lambda-first + SPA)

본 문서는 현행 코드베이스(`docs/architecture/current-system.md`)와 목표 아키텍처(`docs/architecture/todo-system.md`)를 기준으로 개발 환경(dev) 배포를 위해 지금 수행해야 할 실무 작업을 정리한다. 하위 문서(`docs/aws-deployment/**`)의 단계별 가이드를 참조하여 순차 수행한다.

## 1) 선행 조건 및 결정
- 환경 구분: `develop` 스테이지(프로덕션과 분리). 배포 리전: `ap-northeast-2`.
- 런타임: API는 AWS Lambda + API Gateway(HTTP/REST), UI는 S3 + CloudFront 정적 배포.
- 비동기 처리: SQS 큐 + `services/ai-processor` Lambda(요약 전용) 활성화.
- Secrets: AWS Secrets Manager JSON(`echoai/develop/app`)로 관리. 비프로덕션은 `.env` 병행 허용.
- 단일 계약: `@echo-ai/api-core`의 zod 스키마·에러 규약({ message, code, details }) 적용.

## 2) IaC(CDK) 스켈레톤 작성
- 리포지토리 구조: `infra/`에 CDK 앱 생성(TypeScript)。스택 분리:
  - `echoai-shared`: 정적 웹 버킷, CloudFront, ACM 인증서, CORS/보안 헤더.
  - `echoai-api`: API Gateway, Lambda 함수들, DynamoDB, SQS, IAM, Secrets。
  - (선택) `echoai-ops`: CloudWatch 대시보드/알람/로그 보존.
- 공통 태깅/이름 규칙: 스택/리소스에 `{Project: echoai, Stage: develop, Owner: ...}` 태그 적용.
- 부트스트랩: `cdk bootstrap aws://<account>/<region>` (권한: 관리자/플랫폼 계정).

현재 상태(스캐폴드 완료):
- `infra/package.json`, `infra/tsconfig.json`, `infra/cdk.json`, `infra/bin/echoai.ts`
- `infra/lib/shared-stack.ts`(S3 + CloudFront), `infra/lib/api-stack.ts`(API GW + Lambda + DDB + SQS)

## 3) 백엔드 리소스 정의
- API Gateway
  - 경로 매핑: `/auth/*`, `/me`, `/documents`(GET/POST), `/documents/presign`(POST), `/documents/{id}`(GET/DELETE), `/documents/{id}/summarize`(POST), `/study`(GET/POST/PUT/DELETE), `/study/quiz`, `/study/search`, `/study/analyze`。
  - CORS: Origin(CloudFront 도메인, 로컬 개발 `http://localhost:5173`), Headers(`authorization,content-type`), Methods(`GET,POST,PUT,DELETE,OPTIONS`).
    - CDK에서 `ALLOWED_ORIGINS`(쉼표구분) 환경변수로 오버라이드 가능. 기본은 `https://<CF도메인>, http://localhost:5173`.
- Lambda 함수
  - 소스: `services/api/src/lambda/*`(Auth/Documents/Presign/Study), `services/ai-processor/src/handler.ts`(SQS 트리거)。
  - 런타임: Node.js 20.x, 아키텍처: x86_64。번들: esbuild/tsup(외부 의존 포함) 또는 Lambda Layer로 공유 모듈 최소화。
  - 환경변수: `APP_STAGE=develop`, `S3_BUCKET_NAME`, `SUMMARIZE_SQS_QUEUE_URL`, 필요 시 `SUMMARIZE_USE_MOCK=false`。
- DynamoDB
  - 메인 테이블: `EchoAI-Main-Table` (PK: `USER#<id>`, SK: `DOC#<id>`/`PROFILE#<id>`)。
  - 스터디 테이블: `EchoAi-Studies` (PK: `user_id`, SK: `study_id`)。
  - GSI: `EmailIndex` (이메일 중복/로그인 조회용; `packages/@echo-ai/api-core/src/auth.ts:61` 참조).
- SQS
  - 큐: `echoai-summarize-queue`。Lambda(요약기) 구독, DLQ(선택) 연결。
- S3
  - 버킷1(문서): 업로드/원문 저장。프리사인드 POST 사용 정책 구성。
  - 버킷2(UI): SPA 정적 자산 호스팅。CloudFront 오리진 연결。
  - 문서 버킷 CORS: 브라우저 직접 업로드 허용(allowedOrigins=CF 도메인/로컬, methods=POST/PUT/GET, headers=*)
- Secrets Manager
  - 비밀: `echoai/develop/app` JSON
    - 키: `JWT_SECRET`, `GEMINI_API_KEY`, `SUMMARIZE_PROVIDER?`, `HASH_SALT?`。
  - Lambda에서 런타임 조회 + 캐싱(단계 6에서 구현) 또는 초기엔 환경변수 주입 병행。
- IAM
  - Lambda 역할: 최소권한(S3 문서 버킷 RW, DynamoDB 테이블 CRUD, SQS Send/Consume, CloudWatch Logs)。
  - 배포 역할: GitHub OIDC 신뢰정책 + CDK deploy/CloudFront 무효화/S3 put 권한 제한。

## 4) 빌드/번들 파이프라인 준비
- 번들 설정
  - API 번들: `services/api` → 함수별 핸들러 엔트리 구성(esbuild/tsup)。공통 패키지 포함。
  - 워커 번들: `services/ai-processor/src/handler.ts`。
  - 출력 아티팩트: CDK `lambda.Code.fromAsset` 대상으로 ZIP 출력。
- 환경 주입
  - dev 스택 출력(예: API Base URL, CloudFront URL, 버킷명, 큐 URL) → GitHub Actions/SPA에 주입。

## 5) UI(정적 SPA) 배포 경로
- 빌드: `pnpm --filter @echo-ai/app-spa build`。
- 업로드: S3(UI 버킷)로 업로드 및 `index.html` 캐시 정책 분리。
- 무효화: CloudFront `/*` 무효화。
- 환경: `VITE_API_BASE_URL = https://<api-domain or execute-api>`。

## 6) CI/CD 구성 (GitHub Actions, OIDC)
- 브랜치/분기
  - `develop` → dev 스택에 배포。
  - 경로 기반: UI(`apps/spa/**`) 변경만 시 UI Job만, 백엔드/infra 변경 시 API Job 포함。
- UI Job
  - Lint/Test → Build → S3 업로드 → CloudFront 무효화。
- API/Infra Job
  - Lint/Test → Bundle → `cdk synth/diff` → `cdk deploy --require-approval=never`。
- 권한
  - GitHub OIDC → IAM Role Assume。권한 최소화(CloudFormation, S3 put, CloudFront invalidation, iam:PassRole 제한)。

## 7) 런타임 설정·시크릿 이행
- Secrets 적용
  - 초기(단계 4~5): `.env`를 Lambda 환경변수로 주입 가능。
  - 전환(단계 6): Secrets Manager 런타임 조회 + 캐싱 구현 → `.env` 제거。
- CORS/도메인
  - API Gateway CORS에 CloudFront 도메인 등록。로컬 개발용 `http://localhost:5173` 병행 허용。
- 에러 규약
  - 현재 구현된 공통 에러 포맷이 배포 환경에서도 노출되는지 확인(`packages/@echo-ai/api-core/src/http.ts`)。

## 8) 검증·운영 준비
- 네트워크 연결 테스트: `docs/aws-deployment/step-62-network-connectivity-test.md` 절차 수행。
- 초기 배포: `step-65-initial-dev-deployment.md` 절차로 dev 스택 배포。
- 헬스체크: `/me`(401/200), `/documents`(GET 401/200), presign → 업로드 → 메타 저장 → summarize(202) → 워커 완료까지 확인。
- 모니터링/알람: Lambda 에러율, API Gateway 5xx, SQS 적체(ApproximateAgeOfOldestMessage) 알람 구성。
- 로그 보존: `step-59-log-collection-retention.md` 기준으로 보존 기간 설정。

## 9) 남은 과제(병행)
- CDK 템플릿 작성/검수: 리소스/권한 최소화, 태깅 표준 준수。
- Secrets 런타임 조회 구현(단계 6) 및 구성 모듈 반영(`@echo-ai/config`)。
- 도메인/SSL: ACM 발급/Route 53/CloudFront 연결(`step-18-dns-domain-strategy.md`)。
- 비용/옵스: 태깅/비용 알림, 기본 대시보드 구성。

## 10) 레퍼런스(문서 매핑)
- 현행/목표: `docs/architecture/current-system.md`, `docs/architecture/todo-system.md`
- IaC 결정/템플릿: `step-04-iac-decision.md`, `step-50-iac-deployment-templates.md`
- 시크릿: `step-22-runtime-secrets-management.md`, `step-38-secrets-operations.md`, `step-45-build-secrets-injection.md`
- CI/CD: `step-27-cicd-requirements.md`, `step-29-cd-tool-selection.md`, `step-43-ci-infrastructure-setup.md`, `step-44-repo-ci-integration.md`
- 저장소/메시징/스토리지: `step-23-database-planning.md`, `step-24-cache-messaging-planning.md`, `step-25-storage-strategy.md`, `step-55-cache-messaging-provisioning.md`
- 초기 배포/검증: `step-65-initial-dev-deployment.md`, `step-66-healthcheck-configuration.md`, `step-67-functional-validation.md`
