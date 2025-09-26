# 현행 시스템 아키텍처 개요

본 문서는 단계 4(단순화) 반영 이후의 실제 동작 상태를 정리한다. 세부 변경 사항은 `docs/architecture/step-04-simplification-done.md`, 전환 계획은 `docs/architecture/current-to-todo-transition-plan.md`과 목표 구조 `docs/architecture/todo-system.md`를 참고한다.

## 1. 배포 및 실행 환경
- 런타임: Next.js 15 앱이 존재하지만, 서버 기능은 Lambda 핸들러(`services/api/src/lambda/*`)를 단일 소스로 두고 로컬 HTTP 게이트웨이에서 직접 호출한다.
- 로컬 호스팅: Docker Compose로 LocalStack(S3,SQS), DynamoDB Local, `api-local`(게이트웨이, 8787), SPA(5173)를 기동한다.
- 운영 가정: 아직 Next.js 서버 단일 프로세스 가정(서버리스 정식 배포는 목표 단계에서 진행).
- 소스 구조: `apps/web`(Next 앱), `apps/spa`(정적 SPA), 공통 로직은 `packages/@echo-ai/*` 워크스페이스에 위치.

## 2. 애플리케이션 구성 요소
| 계층 | 주요 역할 | 핵심 자산 |
| --- | --- | --- |
| 프레젠테이션 | Next.js(App Router) + 정적 SPA(Vite) 병행 운영(전환 과도기) | `apps/web/src/app/**`, `apps/spa/**` |
| 로컬 HTTP 게이트웨이 | API Gateway v2 이벤트 에뮬레이션으로 Lambda 핸들러를 HTTP에 마운트 | `services/api/src/local-http.ts` |
| Lambda 핸들러 | 인증/문서/프리사인/요약/스터디 기능 구현(단일 소스) | `services/api/src/lambda/*` |
| API Route(과도기) | Next.js API 라우트에서 일부 기능 위임·비활성화 플래그 적용 | `apps/web/src/app/api/**` |
| 도메인/계약 | 인증, 문서, 요약 큐잉, AWS 클라이언트, Zod 스키마/검증 | `packages/@echo-ai/{auth,documents,aws-clients,api-core}` |
| 비동기 워커 | 요약 전용 SQS 컨슈머 Lambda(로컬 실행 가능) | `services/ai-processor` |

주요 추가/변경
- Presign-only 업로드: 서버사이드 멀티파트 업로드 경로는 기본 비활성화(`410 Gone`), 프리사인드 POST만 사용.
- Async-only 요약(기본): 동기 요약 경로는 기본 차단, 큐잉(202)로 일원화. 테스트/과도기엔 `ALLOW_SYNC_SUMMARIZE=true`로만 허용.
- 계약/검증 통일: `@echo-ai/api-core/src/schemas/**`에 Zod 스키마 도입, 핸들러 전반에 일관 적용.
- 스터디 기능 추가: 노트 CRUD/퀴즈/검색/분석 API를 Lambda로 제공(`services/api/src/lambda/study.ts`).

## 3. 외부 연동
- 데이터 저장소: `@aws-sdk/lib-dynamodb` DocumentClient로 DynamoDB 테이블 `EchoAI-Main-Table` 사용.
- 파일 스토리지: S3 버킷 + 프리사인드 업로드(브라우저 직접 업로드). 로컬은 LocalStack 공개 엔드포인트 사용.
- AI 요약: 기본 비동기(SQS → `services/ai-processor`). 동기 경로는 전환 옵션 플래그로만 사용.
- 인증: `@echo-ai/auth`로 JWT 발급/검증, bcrypt 비밀번호 해시.
- 구성/비밀: `.env.local` 기반. Secrets Manager 통합은 목표 단계(미적용).

## 4. 데이터 및 요청 흐름
1) 사용자가 로그인하면 토큰이 발급되고, 프런트는 `Authorization: Bearer`로 호출한다.
2) 업로드는 presign → 브라우저 S3 업로드 → `POST /documents`(메타데이터 저장)로 완결된다.
3) 요약 트리거는 `POST /documents/{id}/summarize`가 202(queued)를 반환하고 SQS에 메시지가 적재된다.
4) `services/ai-processor`가 S3에서 원문을 읽어 텍스트 추출·요약 후 DynamoDB 상태/결과를 갱신한다.
5) 목록/상세 API가 요약 상태와 결과를 조회하여 화면에 반영한다.

## 5. 배포 및 운영 현황
- 버전 관리: pnpm 모노레포. 패키지/서비스 분리 유지.
- 로컬 구동: `docker-compose.yml`로 LocalStack/DynamoDB Local/`api-local`/SPA를 함께 실행.
- CI/CD: 계획 단계. 브랜치·경로 기반 분기는 목표 문서에 정의(실구현 전).
- IaC: CDK/CFN 가이드만 존재, 실제 스택 템플릿/배포 파이프라인은 미구현.
- 모니터링: Next.js 기본 로깅 중심, CloudWatch 연동은 목표 단계에서 구성.

## 6. 확인된 격차 및 리스크
- DynamoDB 사용자 프로필 SK가 `PROFILE#<userId>`로 저장되어 스키마 문서의 `PROFILE`(정적 키)와 불일치.
- Secrets 관리가 `.env`에 의존(프로덕션 요구사항인 Secrets Manager 미적용).
- Next API 라우트와 Lambda 어댑터가 공존(전환 중). 소스 이원화로 변경 누락 위험.
- 운영 배포 파이프라인/스택 부재로 로컬 중심 동작(운영 관측/권한/태깅 미정의).

## 7. 구조적 복잡성 요약(전환 중인 지점)
- 어댑터 이중화: Next API Route(과도기)와 Lambda 핸들러가 공존한다.
- 비동기 기본 전환: 동기/비동기 혼재에서 비동기 기본으로 이동했고, 동기는 옵트인 플래그로만 허용된다.
- 업로드 경로 수렴: 서버사이드 업로드는 기본 폐기되어 정책 일관성이 개선되었으나, 레거시 호출 차단에 따른 호환성 확인 필요.
- 환경/비밀 파편화: `.env.local`과 목표인 Secrets Manager 간 단계 간극 존재.

## 8. 참고(전환 방향 고정)
- 목표 구조와 배포 흐름: `docs/architecture/todo-system.md`
- 단계별 계획과 진행: `docs/architecture/current-to-todo-transition-plan.md`, `docs/architecture/step-04-simplification-plan.md`, `docs/architecture/step-04-simplification-done.md`
