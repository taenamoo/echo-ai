## AWS 서버리스 아키텍처 적용을 위한 프로젝트 구조 개편 계획서

상태: 진행 중 (스테이지 0~2 1차 적용 완료)
작성일: 2025-02-14
작성자: AI Assistant

---

### 1. 배경 및 목표
- 기존 레포는 Next.js App Router 기반 단일 애플리케이션 구조로, 프런트엔드 UI와 API 라우트, 문서 요약 로직이 한 프로젝트 안에 섞여 있습니다.
- "시스템 아키텍처 설계서"에서 정의한 **API Gateway + Lambda**, **S3 + SQS + Lambda 워커**, **DynamoDB** 중심의 서버리스 파이프라인을 그대로 AWS에 배치하기 위해서는, 런타임별 책임이 분리된 리포 구조가 필요합니다.
- 목표는 다음 세 가지입니다.
  1. 프런트엔드(Next.js)와 서버리스 백엔드(AWS Lambda 핸들러, 큐 워커)를 코드 레벨에서 분리하여 독립 배포가 가능하도록 만든다.
  2. 공통 도메인 로직·AWS SDK 래퍼·환경 설정을 패키지화하여 여러 런타임이 재사용하도록 한다.
  3. IaC/배포 스크립트를 별도 모듈로 관리하여 develop → staging → production 파이프라인을 코드로 추적 가능하게 한다.

---

### 2. 목표 디렉터리 구조 (안)
```
root
├── apps
│   ├── web/                # Next.js App Router (프런트엔드 전용)
│   └── worker-console/     # (선택) 로컬 디버깅용 SQS 워커 실행 스크립트
├── services
│   ├── api/                # API Gateway + Lambda 핸들러 (REST/HTTP)
│   │   ├── src/handlers/   # 문서 업로드/요약 등 비즈니스 엔드포인트
│   │   ├── src/adapters/   # APIGW 이벤트 ↔ 핸들러 어댑터, 검증
│   │   └── package.json
│   └── ai-processor/       # SQS 트리거 Lambda (문서 요약 워커)
│       ├── src/handler.ts
│       ├── src/pipeline/   # 요약 파이프라인 로직(텍스트 추출, Gemini 호출)
│       └── package.json
├── packages
│   ├── core-domain/        # 도메인 엔터티, 유스케이스, DTO, 밸리데이션
│   ├── aws-clients/        # S3, DynamoDB, SQS 클라이언트 팩토리 + 공통 설정
│   ├── auth/               # JWT, 해시, 권한체크 등 공통 인증 모듈
│   ├── documents/          # 문서 메타 저장소, 텍스트 추출 유틸, 요약 유스케이스
│   └── config/             # stage별 환경 변수 로딩, 타입 세이프 설정
├── infra
│   ├── cdk/                # CDK 또는 SST/Terraform 코드 (S3, DynamoDB, SQS, Lambda, API GW, CloudFront)
│   └── pipelines/          # GitHub Actions/CodeBuild 파이프라인 정의
├── scripts
│   ├── local/              # 로컬 개발 편의 스크립트 (예: DynamoDB 시드)
│   ├── migration/          # DynamoDB 테이블 생성/마이그레이션 스크립트
│   └── README.md
├── docs
│   ├── task/
│   └── ...
└── pnpm-workspace.yaml     # 멀티 패키지 워크스페이스 정의
```

> 참고: `apps/web`로 Next.js 코드를 이동하고, `src/lib` 내부 공통 로직은 `packages/*`로 추출합니다. 기존 `scripts` 폴더는 성격에 따라 `scripts/local` 또는 `packages/core-domain` 테스트 코드로 재배치합니다.

---

### 3. 핵심 구조 개편 항목

#### 3.1 프런트엔드 (apps/web)
- **이동 대상**: 현 `src/`, `public/`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `eslint.config.mjs` 등을 `apps/web`으로 이동.
- **환경 변수**: `NEXT_PUBLIC_*` 계열은 `apps/web/.env.example`로 정리하고, API 베이스 URL은 API Gateway 도메인을 바라보도록 `NEXT_PUBLIC_API_BASE_URL` 추가.
- **API 호출**: 현재 `app/api` 라우트에 의존하는 부분은 `packages/core-domain`의 서비스 호출 → 외부 HTTP 호출 방식으로 전환.
- **배포**: CloudFront + S3 (정적) 또는 Lambda@Edge 구성을 지원하도록 빌드 산출물(`next build`)을 CI에서 별도 아티팩트로 관리.

#### 3.2 API Gateway + Lambda (services/api)
- **핸들러 추출**: 기존 `src/app/api/**` 라우트 로직을 함수형 모듈로 분리(`packages/documents`, `packages/auth` 등). Next.js 의존 없는 순수 함수로 재작성.
- **라우팅**: API Gateway 이벤트를 파싱하여 라우트하는 경량 라우터(`handlers/index.ts`) 작성. `middy` 혹은 커스텀 미들웨어로 인증/에러 처리 공통화.
- **응답 DTO**: `packages/core-domain` 내 타입을 재활용하여 API 스키마 일관성 유지. `packages/config` 에서 stage별 리소스 이름을 주입.
- **테스트**: 핸들러 단위의 유닛 테스트(Jest or Vitest) 추가, 로컬 실행용 `pnpm --filter services/api dev` 스크립트 구성.

#### 3.3 SQS 기반 AI Processor (services/ai-processor)
- **엔트리포인트**: `handler.ts` 하나로 SQS 이벤트를 받아 문서 요약 파이프라인 호출.
- **로직 재사용**: 텍스트 추출, Gemini 호출, DynamoDB 업데이트는 `packages/documents`에 위치한 유스케이스(`summarizeDocument`)로 이동하여 API/워커가 동일한 로직 공유.
- **에러 처리**: 실패 시 DLQ로 메시지 이동하도록 Lambda 재시도 설정, CloudWatch Metric으로 적체 모니터링.
- **로컬 디버깅**: `apps/worker-console`을 통해 동일 패키지를 실행하여 로컬 SQS 큐를 소비할 수 있도록 구성.

#### 3.4 공통 패키지 정리 (`packages/*`)
- `packages/config`: Stage(`local|develop|prod`) 감지, 필수 env 유효성 검사(Zod). Lambda/Next 모두 이 모듈을 통해 설정 로딩.
- `packages/aws-clients`: S3/DynamoDB/SQS 클라이언트 팩토리. 로컬 개발 시 LocalStack 엔드포인트를 주입하는 옵션 포함.
- `packages/documents`: 문서 엔티티, 리포지토리(DynamoDB CRUD), 요약 유스케이스, 텍스트 추출 유틸을 한곳에 모아 재사용.
- `packages/auth`: JWT 생성/검증, 패스워드 해시, 인증 미들웨어 등을 분리.
- `packages/core-domain`: 공통 에러 타입, Result 유틸, DTO, 밸리데이션 로직 등.

#### 3.5 인프라 및 파이프라인 (`infra/*`)
- `infra/cdk`:
  - S3 버킷, DynamoDB 테이블, SQS 큐/DLQ, Lambda 함수, API Gateway, CloudFront(정적 배포) 스택 정의.
  - Stage별 스택 구성(`EchoAiDevelopStack`, `EchoAiProdStack`).
- `infra/pipelines`:
  - GitHub Actions 워크플로우 → pnpm workspace install → lint/test → 각 서비스 빌드 → ECR 푸시 or Lambda 아티팩트 업로드 → CDK 배포.
  - develop 배포 파이프라인에서만 `SUMMARIZE_ASYNC` 토글을 허용하도록 환경 변수 관리.

---

### 4. 단계별 전환 로드맵

| 단계 | 기간(예상) | 주요 작업 | 산출물/수용 기준 |
| --- | --- | --- | --- |
| **0. 준비** | 0.5주 | `pnpm-workspace.yaml` 작성, 루트 `package.json` 정리, 공용 ESLint/TS 설정 workspace 화 | ✅ 멀티 워크스페이스 구성 적용 및 공용 설정 이전 |
| **1. 프런트엔드 이동** | 1주 | Next.js 소스를 `apps/web`으로 이동, 임포트 경로 alias 수정(`@web/`), `NEXT_PUBLIC_API_BASE_URL` 반영 | ✅ `apps/web`으로 소스 이동 및 실행 스크립트 분리 |
| **2. 공통 패키지 추출** | 1.5주 | `src/lib` 모듈을 `packages/*`로 분리, 문서/인증/설정 로직 리팩터링, 유닛 테스트 추가 | ✅ `@echo-ai/*` 패키지로 핵심 로직 분리, 후속 테스트 정비 예정 |
| **3. API Lambda 구현** | 1주 | `services/api` 생성, 기존 API 라우트 기능을 Lambda 핸들러로 이관, Serverless Framework/CDK 로컬 테스트 | 로컬 `sam local` 또는 `sst dev` 등으로 API 호출 성공 |
| **4. SQS 워커 분리** | 1주 | `services/ai-processor` 작성, 요약 큐 처리 Lambda 구현, API에서 `SUMMARIZE_ASYNC` 기본값 true 전환 | SQS → Lambda 파이프라인 통합 테스트 통과 |
| **5. IaC & 배포** | 1주 | `infra/cdk` 정식화, GitHub Actions 파이프라인 작성, develop 환경에 최초 배포 | CDK deploy 성공, Smoke Test 체크리스트 통과 |
| **6. 문서/운영 정리** | 0.5주 | 운영 Runbook, 알람 전략, 비용 모니터링 문서화 | docs/Runbook 업데이트, CloudWatch 알람 작동 확인 |

> 각 단계 완료 시 `docs/task`에 작업 회고/체크리스트를 업데이트하고, develop 환경으로 부분 배포하여 회귀 테스트를 수행합니다.

---

### 5. 환경 변수 및 시크릿 전략 개편
- 루트 `.env`는 제거하고, 다음 규칙을 적용합니다.
  - `apps/web/.env.example`: 브라우저 노출 가능 값(NEXT_PUBLIC_*), `NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB`, `NEXT_PUBLIC_API_BASE_URL` 등.
  - `services/api/.env.example`: `JWT_SECRET`, `HASH_SALT`, `S3_BUCKET_NAME`, `SUMMARIZE_SQS_QUEUE_URL`, `DYNAMODB_TABLE_*`.
  - `services/ai-processor/.env.example`: `GEMINI_API_KEY`, `SUMMARIZE_MODEL`, `SUMMARIZE_MAX_*`, `AWS_REGION` 등.
- 실환경 비밀값은 AWS Secrets Manager/SSM Parameter Store에 저장, Lambda와 Next.js(Amplify Hosting 또는 SSM)에서 런타임 주입.
- `packages/config`에서 stage 별 `.env`를 안전하게 로드하고, 필수값 검증 실패 시 애플리케이션이 즉시 종료하도록 한다.

---

### 6. 테스트 및 모니터링 전략
- 패키지별 테스트 명령어 표준화: `pnpm --filter {패키지} test`.
- API/Lambda는 `localstack + vitest` 조합으로 통합 테스트를 구성하여 develop 배포 전 검증.
- CloudWatch 로그 그룹 네이밍 규칙 수립(`EchoAI/{service}/{stage}`).
- SQS DLQ 메시지를 EventBridge 룰로 Slack/Webhook에 전달하는 운영 자동화 스크립트 작성.

---

### 7. 리스크 및 대응
- **대규모 파일 이동으로 인한 Git 히스토리 단절** → `git mv` 활용, 단계별로 이동 후 리팩터링.
- **공유 모듈 추출 시 순환 의존성** → `packages/core-domain`을 최하위 레이어로 정의하고, 상위 모듈이 하위 모듈을 참조하지 않도록 아키텍처 가드(ESLint 규칙) 도입.
- **Lambda Cold Start** → `packages/aws-clients`에서 SDK 클라이언트를 싱글턴으로 재사용, Node.js 20 런타임 사용.
- **요약 파이프라인 비용 증가** → SQS 워커 동시성 제한, DynamoDB Update 조건부 처리로 중복 호출 방지.

---

### 8. 완료 정의 (Definition of Done)
- `apps/web`, `services/api`, `services/ai-processor`, `packages/*`, `infra/*` 구조가 도입되고 `pnpm install && pnpm build --filter ...` 명령이 정상적으로 수행된다.
- develop 환경에서 API Gateway(https), Lambda 워커, S3 업로드, DynamoDB 저장, Gemini 요약까지 엔드투엔드 테스트가 통과한다.
- CloudWatch/Slack 알림, Secrets Manager 구성이 배포 문서에 반영되어 운영팀이 참조할 수 있다.

