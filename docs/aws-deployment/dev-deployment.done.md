# Dev 배포 작업 결과 요약서 (Lambda-first + SPA)

본 문서는 `docs/aws-deployment/dev-deployment-plan.md`를 근거로 진행된 개발 배포 준비 작업의 결과를 정리하고, 남은 할 일(To‑Do)을 제시한다.

## 1) 완료된 작업(코드/구성)
- CDK 스캐폴드(infra/) 추가 및 기본 스택 구성
  - CDK 앱 엔트리/설정
    - `infra/package.json`
    - `infra/tsconfig.json`
    - `infra/cdk.json`
    - `infra/bin/echoai.ts`
  - 공유 스택(Shared): S3 + CloudFront
    - `infra/lib/shared-stack.ts`
    - UI 버킷(S3) + CloudFront 배포 + OAC 연결
    - 출력: `UiBucketName`, `UiCloudFrontDomain`, `UiCloudFrontDistributionId`
- API 스택(Api): API Gateway + Lambda + DynamoDB + SQS (+ S3 문서 버킷)
    - `infra/lib/api-stack.ts`
    - DynamoDB: `EchoAI-Main-Table`(PK/SK), `EmailIndex`(GSI), `EchoAi-Studies`(PK= user_id, SK= study_id)
    - SQS: `echoai-summarize-queue`
    - S3: 문서 버킷(업로드/원문 저장, 브라우저 업로드 CORS 구성)
    - Lambda(Node 20): Auth/Presign/Documents/Study 핸들러 및 AI Processor(SQS 소비)
    - API Gateway(REST): 경로 매핑(인증/문서/스터디/요약)
    - 권한: Lambda에 DDB R/W, S3 R/W(필요시), SQS Send/Consume
    - 환경: `APP_STAGE=develop`, `AWS_REGION`, `S3_BUCKET_NAME`, `SUMMARIZE_SQS_QUEUE_URL` 외 임시 값(`JWT_SECRET`, `GEMINI_API_KEY`, `SUMMARIZE_USE_MOCK=true`) 및 `SECRETS_NAME`/`SECRETS_ARN`
    - CORS: 기본 허용 Origin은 `[https://<CF도메인>, http://localhost:5173]`; `ALLOWED_ORIGINS` 환경변수로 오버라이드 지원

- GitHub Actions 워크플로(초안) 구성
  - `.github/workflows/dev-deploy.yml`
  - 경로 기반 분기(dorny/paths-filter): UI / API
  - UI Job
    - CloudFormation 스택 출력에서 API URL/버킷/CF ID 자동 조회
    - SPA 빌드(`VITE_API_BASE_URL` = API Endpoint)
    - S3 업로드, CloudFront 무효화
  - API Job
    - 워크스페이스/infra 의존 설치 → `cdk synth` → `cdk deploy --require-approval=never`

- 로컬 HTTP 게이트웨이 CORS/본문 처리 보완
  - `services/api/src/local-http.ts`: `PUT/PATCH` 허용 및 본문 파싱 추가

- 공통 에러 포맷(zod) 통합 및 SPA 에러 UX 개선
  - `packages/@echo-ai/api-core/src/http.ts`: `{ message, code, details }` 헬퍼 도입
  - `auth.ts`, `documents.ts`, `presign.ts` 리팩터링
  - SPA `ApiError` 도입 및 오류 메시지 개선

## 2.1) 모니터링/알람(기본)
- CDK에 기본 알람 추가(Dev)
  - SQS 큐 적체: ApproximateAgeOfOldestMessage > 60초(5분 윈도)
  - AI Processor Lambda Errors ≥ 1(5분)
  - API Gateway 5xx ≥ 1(5분)

## 2) 스택 출력과 파이프라인 변수 연계
- Shared 스택(Output)
  - UiBucketName, UiCloudFrontDomain, UiCloudFrontDistributionId
- API 스택(Output)
  - ApiEndpoint
- UI 워크플로는 위 값을 CloudFormation에서 조회하여 `VITE_API_BASE_URL`, 업로드 버킷, 무효화 ID로 사용

## 3) 배포 및 검증(Dev)
- 사전 준비
  - AWS 계정에 GitHub OIDC 배포 롤 생성(CloudFormation, S3, CloudFront, iam:PassRole 최소 권한)
  - CDK Bootstrap: `cdk bootstrap aws://<account>/<region>`
- 배포 절차
  - `pnpm -C infra install`
  - `pnpm -C infra run synth`
  - `APP_STAGE=develop pnpm -C infra run deploy`
  - develop 브랜치에 푸시 → 워크플로 자동 실행(UI/API 분기)
- 기능 검증(샘플)
  - Health: `GET /me`(401/200), `GET /documents`(401/200)
  - 업로드: presign → S3 업로드 → `POST /documents` 메타 저장
  - 요약: `POST /documents/{id}/summarize`(202) → SQS → AI Processor → 상태 `COMPLETE`

## 4) 남은 작업(To‑Do)
- IAM/보안
  - [ ] GitHub OIDC 배포 롤 생성 및 최소 권한 정책 적용
  - [ ] Lambda 실행 역할 최소 권한 점검(S3/DDB/SQS/Logs)
- CDK/리소스 보강
  - [ ] 비밀 주입 전환(단계 6): Secrets Manager(`echoai/develop/app`) 조회 + 캐싱 구현
  - [ ] RemovalPolicy: dev 외 스테이지에서 보존 정책 강화
  - [ ] API Gateway CORS를 실제 도메인으로 제한(ALLOWED_ORIGINS 설정)
  - [ ] CloudWatch 알람/대시보드(에러율/SQS 적체/지연) 구성
- CI/CD
  - [ ] 워크플로에 테스트/린트 스텝 추가 및 품질 게이트(선택)
  - [x] CloudFormation Outputs 조회 실패 시 핸들링(리트라이/에러 메시지)
  - [ ] 스택 출력(API URL)을 환경 변수/배포 아티팩트로 노출(추가 Job 간 전달 필요 시)
- 앱 구성/검증
  - [ ] SPA 환경 구성 검증(`VITE_API_BASE_URL` 실제 API)
  - [ ] Dev 스택 엔드포인트로 E2E 시나리오 점검(업로드/요약/목록/삭제)
  - [ ] 요약 모델/프롬프트/타임아웃 운영값 정리
- 문서/운영
  - [ ] 운영자용 배포 가이드/롤백 정책 문서 연결(`step-33-rollback-policy.md`)
  - [ ] 보안/감사 관련 문서 연결(태깅/로그 보존/접근 관리)

## 5) 참고 파일
- CDK
  - infra/bin/echoai.ts
  - infra/lib/shared-stack.ts
  - infra/lib/api-stack.ts
- 워크플로
  - .github/workflows/dev-deploy.yml
- 앱/핵심 모듈
  - services/api/src/local-http.ts
  - packages/@echo-ai/api-core/src/http.ts
  - packages/@echo-ai/api-core/src/auth.ts
  - packages/@echo-ai/api-core/src/documents.ts
  - packages/@echo-ai/api-core/src/presign.ts

## 6) 비고/리스크
- 현재 Lambda 환경 변수에 임시 비밀(JWT/GEMINI)이 하드코딩되어 있어 dev 전용으로만 사용하고, 단계 6에서 Secrets Manager로 전환 필수.
- CORS 기본값은 CF 도메인/로컬만 허용한다. 다중 도메인 필요 시 `ALLOWED_ORIGINS`로 지정.
- 비용/보안 상 이유로 dev 외 스테이지에서 `RemovalPolicy.DESTROY` 사용 금지.
- Secrets Manager(Dev) 구성
  - `echoai/<stage>/app` 시크릿 생성 및 Lambda에 읽기 권한 부여
  - 스택 출력: `SecretsArn`
