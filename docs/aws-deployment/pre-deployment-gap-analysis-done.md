# 배포 차단 요소 조치 현황 (Section 1)

## 완료한 작업

1. CDK S3 CORS 설정에서 선언 순서 문제를 해결하여 `allowOrigins` 계산을 버킷과 API Gateway 모두에서 재사용하도록 정리했습니다. 이를 통해 `documentsBucket.addCorsRule` 호출 시점에 참조 오류가 발생하지 않습니다.
2. 문서 요약 핸들러에서 사용하던 `conflict(...)` 응답 헬퍼를 정상적으로 임포트하여 처리 중 문서에 대한 409 응답이 런타임 예외 없이 반환되도록 했습니다.

## 참고 커밋/파일

- `infra/lib/api-stack.ts`
- `packages/@echo-ai/api-core/src/documents.ts`
- `docs/aws-deployment/pre-deployment-gap-analysis.md`

# 기능 공백 및 품질 리스크 정리 (Section 2)

## 신규로 정리한 리스크

1. Secrets Manager가 제공하는 값이 Lambda에서 활용되지 못하는 구조(placeholder 환경 변수, 모듈 스코프 캐시)를 문서화했습니다.
2. `SUMMARIZE_USE_MOCK` 플래그가 모든 요약 경로를 모의 응답으로 고정하는 문제와 그로 인한 기능 공백을 정리했습니다.
3. AI Processor가 Secrets 하이드레이션을 수행하지 않아 최신 비밀 값을 적용하지 못하는 구조적 리스크를 명시했습니다.
4. Next.js API 경로와 Lambda 이중 구현으로 인한 품질 저하 위험을 추가했습니다.
5. 스터디 서비스 요청 본문 검증 미비로 발생할 수 있는 데이터 품질 문제를 도출했습니다.

## 완료한 조치

1. CDK가 Secrets Manager 값을 Lambda 환경 변수에 직접 주입하고, 구성 하이드레이션이 항상 최신 비밀로 덮어쓰도록 `@echo-ai/config`와 AI Processor를 수정했습니다. 【F:infra/lib/api-stack.ts†L73-L149】【F:packages/@echo-ai/config/src/index.ts†L1-L58】【F:services/ai-processor/src/handler.ts†L20-L170】
2. Stage별 요약 동작을 재구성하여 운영 스테이지에서 모의 응답이 강제로 사용되지 않도록 하고, Gemini 키가 존재하면 실제 요약이 실행되도록 문서/워커 핸들러를 업데이트했습니다. 【F:infra/lib/api-stack.ts†L92-L149】【F:packages/@echo-ai/api-core/src/documents.ts†L252-L306】【F:services/ai-processor/src/handler.ts†L12-L170】
3. Next.js App Router의 API 구현을 제거하고, 공통 Axios 인스턴스가 `NEXT_PUBLIC_API_BASE_URL` 기반으로 API Gateway를 직접 호출하도록 프런트엔드를 정리했습니다. 【F:apps/web/src/lib/axios.ts†L1-L29】【F:apps/web/src/app/documents/page.tsx†L1-L620】【F:apps/web/src/app/study/page.tsx†L1-L560】
4. 스터디 Lambda가 `@echo-ai/api-core`에 추가된 Zod 스키마로 요청 본문을 검증하고 정규화한 뒤 DynamoDB에 저장하도록 수정해 데이터 오염 위험을 해소했습니다. 【F:packages/@echo-ai/api-core/src/schemas/study.ts†L1-L44】【F:services/api/src/lambda/study.ts†L1-L220】

## 참고 파일

- `docs/aws-deployment/pre-deployment-gap-analysis.md`
- `infra/lib/api-stack.ts`
- `packages/@echo-ai/config/src/index.ts`
- `services/ai-processor/src/handler.ts`
- `apps/web/src/lib/axios.ts`
- `apps/web/src/app/documents/page.tsx`
- `apps/web/src/app/study/page.tsx`
- `packages/@echo-ai/api-core/src/schemas/study.ts`
- `services/api/src/lambda/study.ts`

# 운영 및 배포 환경 준비 미비 (Section 3)

## 완료한 조치

1. Stage 문자열을 정규화해 DynamoDB 테이블과 SQS 큐 이름에 자동으로 접미사를 붙이도록 CDK 스택을 수정했습니다. 이제 dev/prod 환경이 동일 리소스 이름으로 충돌하지 않습니다.
2. API 및 AI Processor 서비스에 `tsup` 기반 번들 스크립트를 도입해, `pnpm --filter <workspace> build` 명령으로 Lambda 번들을 재사용할 수 있습니다.
3. 아키텍처 현재 상태 문서를 최신화하여 Secrets Manager 통합 및 Next.js API 제거가 완료된 사실을 반영하고, 잔여 리스크(비밀 회전 자동화 등)만 남도록 정리했습니다.

## 참고 파일

- `infra/lib/api-stack.ts`
- `package.json`
- `services/api/package.json`
- `services/api/tsup.config.ts`
- `services/ai-processor/package.json`
- `services/ai-processor/tsup.config.ts`
- `docs/architecture/current-system.md`
- `docs/aws-deployment/current-deployment-steps.md`
- `docs/aws-deployment/pre-deployment-gap-analysis.md`

# 권장 후속 조치 요약 (Section 4)

## 완료한 조치

1. CDK 스택에서 `allowOrigins` 계산과 Stage 접미사 정규화를 마무리해 dev/prod 동시 배포 시 리소스 충돌 위험을 제거했습니다.
2. 문서 요약 핸들러가 처리 중 요청에 대해 `conflict`(409) 응답을 반환하도록 정비하여 재시도 시나리오에서 안정적으로 동작합니다.
3. Lambda와 AI Processor 실행 시 Secrets Manager에서 비밀 값을 하이드레이션하고 Stage별 요약 동작을 제어하는 구성을 적용했습니다.
4. API/AI Processor 서비스에 `tsup` 번들링 파이프라인을 도입해 수동 배포나 CI에서 일관된 Lambda 아티팩트를 생성할 수 있습니다.

## 지속 추적 항목

- Secrets 회전 자동화, 모니터링, 레거시 앱 정리 등 남은 리스크는 `docs/architecture/current-system.md`에 요약해 두고 후속 계획을 수립하고 있습니다.

## 참고 파일

- `docs/aws-deployment/pre-deployment-gap-analysis.md`
- `infra/lib/api-stack.ts`
- `packages/@echo-ai/api-core/src/documents.ts`
- `packages/@echo-ai/config/src/index.ts`
- `services/ai-processor/src/handler.ts`
- `services/api/tsup.config.ts`
- `services/ai-processor/tsup.config.ts`
- `package.json`
- `docs/architecture/current-system.md`
