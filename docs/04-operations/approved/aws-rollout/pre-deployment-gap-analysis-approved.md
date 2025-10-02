---
title: AWS 배포 전 코드/구성 격차 점검
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# AWS 배포 전 코드/구성 격차 점검

`docs/04-operations/approved/aws-rollout/current-deployment-steps-approved.md` 문서의 체크리스트를 실행하기 전에, 현행 코드베이스와 IaC 정의에서 배포를 가로막거나 품질을 저하할 수 있는 미완료 항목을 정리했다. 아래 목록은 우선순위별로 나누어 정리했으며, 각 항목은 관련 소스와 추가 후속 조치를 함께 명시한다.

## 1. 즉시 해결이 필요한 배포 차단 요소

- ✅ **CDK S3 CORS 설정이 런타임 예외를 유발**: `allowOrigins` 계산을 스택 초반으로 이동해 S3 CORS 규칙과 API Gateway CORS 프리플라이트가 동일한 허용 목록을 공유하도록 수정했다. 이제 `documentsBucket.addCorsRule`가 선언된 상수를 안전하게 참조하며 CDK synth 단계에서 더 이상 `ReferenceError`가 발생하지 않는다. 【F:infra/lib/api-stack.ts†L22-L70】【F:infra/lib/api-stack.ts†L212-L230】
- ✅ **문서 요약 동기 핸들러에서 미정의 식별자 사용**: `conflict(...)` 응답 헬퍼를 다른 HTTP 응답 유틸리티와 함께 임포트하여 요약 요청이 처리 중 상태일 때 정상적으로 409 응답을 반환하도록 했다. 【F:packages/@echo-ai/api-core/src/documents.ts†L1-L12】【F:packages/@echo-ai/api-core/src/documents.ts†L223-L236】

## 2. 기능 공백 및 품질 리스크

- ✅ **Secrets Manager 통합이 사실상 비활성화 상태**
  - *조치 완료*: CDK가 Lambda 환경 변수에 Secrets Manager 값을 직접 주입하도록 변경하고(`secretValueFromJson`), `hydrateConfigFromSecrets`가 최신 비밀 값으로 항상 덮어쓰도록 수정했다. SQS 워커는 처리 전 하이드레이션을 수행해 최신 키로 요약을 실행한다. 【F:infra/lib/api-stack.ts†L73-L149】【F:packages/@echo-ai/config/src/index.ts†L1-L58】【F:services/ai-processor/src/handler.ts†L1-L170】
  - *추가 확인*: Stage별 Secret 값만 준비되어 있으면 재배포 없이도 값 갱신이 반영된다.

 
- ✅ **요약 기능이 항상 모의 응답으로 고정**
  - *조치 완료*: Stage가 `local`일 때만 모의 응답을 허용하고, Secrets 기반 Gemini 키가 제공되면 API/AI Processor 모두 실제 요약을 실행하도록 기본값을 조정했다. 운영 환경에서는 실 키가 존재할 경우 자동으로 실제 요약이 수행된다. 【F:infra/lib/api-stack.ts†L92-L149】【F:packages/@echo-ai/api-core/src/documents.ts†L252-L306】【F:services/ai-processor/src/handler.ts†L12-L170】

- ✅ **AI Processor가 Secrets 하이드레이션을 건너뜀**
  - *조치 완료*: 큐 워커가 실행될 때마다 `hydrateConfigFromSecrets`를 호출하고 최신 구성을 다시 가져오도록 리팩터링해, 비밀 값이 갱신돼도 즉시 반영되도록 했다. 【F:services/ai-processor/src/handler.ts†L20-L170】

- ✅ **Next.js API 경로가 Lambda와 이중 구현으로 남아 품질 리스크**
  - *조치 완료*: App Router의 `/api/**` 라우트를 제거하고, SPA API 클라이언트를 `VITE_API_BASE_URL` 기반으로 API Gateway에 직접 연결하도록 정비했다. 업로드·요약·스터디 화면 모두 Lambda 엔드포인트만 사용해 Next 런타임 비밀 의존을 제거했다. 【F:apps/spa/src/api.ts†L1-L71】【F:apps/spa/src/routes/Documents.tsx†L1-L260】【F:apps/spa/src/routes/Study.tsx†L1-L200】

- ✅ **스터디 서비스 입력 검증 부재로 데이터 품질 저하 위험**
  - *조치 완료*: `@echo-ai/api-core`에 스터디용 Zod 스키마를 추가하고, Create/Update 핸들러가 본문을 검증·정규화한 뒤 DynamoDB에 저장하도록 변경했다. 잘못된 타입과 미허용 필드는 저장 전에 필터링된다. 【F:packages/@echo-ai/api-core/src/schemas/study.ts†L1-L44】【F:services/api/src/lambda/study.ts†L1-L220】

## 3. 운영 및 배포 환경 준비 미비

- ✅ **Stage별 리소스 명명 규칙 도입**: DynamoDB 테이블과 SQS 큐 이름에 스테이지 접미사를 자동으로 부여해 dev/prod 스택이 충돌하지 않도록 수정했다. Stage 문자열을 소문자·허용 문자로 정규화한 뒤 `EchoAI-Main-Table-<stage>` 등으로 프로비저닝한다. 【F:infra/lib/api-stack.ts†L21-L73】
- ✅ **Lambda 패키징 스크립트 정비**: API와 AI Processor 서비스에 `tsup` 기반 번들 스크립트를 추가해 함수별 CJS 번들을 생성할 수 있다. 수동 배포나 CI에서 `pnpm --filter @echo-ai/service-api build` 및 `pnpm --filter @echo-ai/service-ai-processor build`를 호출하면 `dist/` 디렉터리에 재사용 가능한 산출물이 생성된다. 【F:package.json†L30-L68】【F:services/api/package.json†L6-L18】【F:services/api/tsup.config.ts†L1-L34】【F:services/ai-processor/package.json†L6-L15】【F:services/ai-processor/tsup.config.ts†L1-L18】
- ✅ **운영 문서와 실제 구현 정합성 확보**: 아키텍처 문서의 격차 목록을 최신 상태로 정비해 Secrets Manager 통합과 Next.js API 제거가 완료되었음을 반영했다. 앞으로 해결해야 할 항목만 남도록 `docs/02-architecture/approved/current-system-overview-approved.md`를 업데이트했다. 【F:docs/02-architecture/approved/current-system-overview-approved.md†L45-L73】

## 4. 권장 후속 조치 요약

- ✅ **CDK 스택 CORS/Stage 정규화**: `allowOrigins` 계산을 스택 초반에서 선행하고 DynamoDB/SQS 리소스에 Stage 접미사를 부여하는 작업을 완료했다. 【F:infra/lib/api-stack.ts†L21-L118】
- ✅ **문서 요약 409 응답 안정화**: 공유 문서 핸들러에 `conflict` 헬퍼를 임포트하여 중복 요약 요청이 409를 반환하도록 고쳤다. 【F:packages/@echo-ai/api-core/src/documents.ts†L1-L308】
- ✅ **Secrets 런타임 하이드레이션 및 Stage 기반 요약 설정**: Lambda와 AI Processor가 요청마다 `hydrateConfigFromSecrets`를 실행하고, Stage별로 모의 요약 플래그를 제어하도록 구성했다. 【F:packages/@echo-ai/config/src/index.ts†L1-L80】【F:services/ai-processor/src/handler.ts†L1-L200】【F:packages/@echo-ai/api-core/src/documents.ts†L1-L308】
- ✅ **Lambda 번들링 파이프라인 정비**: API/AI Processor 서비스에 `tsup` 번들링 스크립트를 추가해 재배포용 산출물을 일관되게 생성할 수 있다. 【F:services/api/tsup.config.ts†L1-L35】【F:services/ai-processor/tsup.config.ts†L1-L19】【F:package.json†L30-L70】
- 🟠 **남은 리스크 문서화 및 후속 계획**: Secrets 회전 자동화, 운영 모니터링, 레거시 앱 정리 등 잔여 이슈는 `docs/02-architecture/approved/current-system-overview-approved.md`에 남겨두고 후속 계획을 수립 중이다. 【F:docs/02-architecture/approved/current-system-overview-approved.md†L1-L90】

위 항목을 기반으로 `docs/04-operations/approved/aws-rollout/current-deployment-steps-approved.md`의 배포 절차를 안전하게 진행할 수 있으며, 미완료 항목은 운영 준비 단계에서 계속 추적한다.
