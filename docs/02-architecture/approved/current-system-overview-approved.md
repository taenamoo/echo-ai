---
title: 현행 시스템 아키텍처 개요
domain: architecture
status: approved
owner: architecture@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 현행 시스템 아키텍처 개요

본 문서는 단계 4(단순화) 반영 이후의 실제 동작 상태를 정리한다. 세부 변경 사항은 `docs/02-architecture/archive/simplification-stage-04-outcome-archived.md`, 전환 계획은 `docs/02-architecture/approved/current-to-target-transition-plan-approved.md`과 목표 구조 `docs/02-architecture/approved/target-architecture-overview-approved.md`를 참고한다.

## 1. 배포 및 실행 환경
- 런타임: Next.js 15 기반 웹앱은 완전히 폐기했고, 브라우저 프런트는 SPA만 유지한다. 서버 기능은 Lambda 핸들러(`services/api/src/lambda/*`)가 단일 소스로 제공한다.
- 로컬 호스팅: Docker Compose로 LocalStack(S3,SQS), DynamoDB Local, `api-local`(게이트웨이, 8787), SPA(5173)를 기동한다.
- 운영 가정: 서버리스 정식 배포는 목표 단계에서 진행 예정이다.
- 소스 구조: `apps/spa`(정적 SPA)와 `packages/@echo-ai/*` 워크스페이스로 구성되며, 공통 로직은 패키지 레벨에서 공유한다.

## 2. 애플리케이션 구성 요소
| 계층 | 주요 역할 | 핵심 자산 |
| --- | --- | --- |
| 프레젠테이션 | 정적 SPA(Vite) 단일 운영 | `apps/spa/**` |
| 로컬 HTTP 게이트웨이 | API Gateway v2 이벤트 에뮬레이션으로 Lambda 핸들러를 HTTP에 마운트 | `services/api/src/local-http.ts` |
| Lambda 핸들러 | 인증/문서/프리사인/요약/스터디 기능 구현(단일 소스) | `services/api/src/lambda/*` |
| 프런트엔드 HTTP 클라이언트 | SPA API 클라이언트가 API Gateway 배포 URL로 직접 호출 | `apps/spa/src/api.ts` |
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
- 구성/비밀: Secrets Manager를 기본 소스로 사용하며, Lambda/워커는 실행 시 `hydrateConfigFromSecrets`로 비밀을 가져온다. 로컬 개발용 `.env`는 보조 수단으로 유지한다.

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
- IaC: CDK 스택이 Stage 접미사 규칙과 Lambda 번들 스크립트에 맞춰 정비되었으며, CI/CD 파이프라인은 아직 미구현이다.
- 모니터링: Next.js 기본 로깅 중심, CloudWatch 연동은 목표 단계에서 구성.

## 6. 확인된 격차 및 리스크
- DynamoDB 사용자 프로필 SK가 `PROFILE#<userId>`로 저장되어 스키마 문서의 `PROFILE`(정적 키)와 불일치.
- Secrets Manager 연동은 적용되었지만, 키 회전 자동화·권한 위임 절차가 미정이라 운영 가이드가 필요하다.
- 운영 배포 파이프라인/스택, CloudWatch 모니터링, 태깅 전략 등은 후속 작업으로 남아 있다.

## 7. 구조적 복잡성 요약(전환 중인 지점)
- 프런트엔드 이중 운영 해소: Next.js App Router를 제거해 SPA 단일 운영으로 전환했다.
- 비동기 기본 전환: 동기/비동기 혼재에서 비동기 기본으로 이동했고, 동기는 옵트인 플래그로만 허용된다.
- 업로드 경로 수렴: 서버사이드 업로드는 기본 폐기되어 정책 일관성이 개선되었으나, 레거시 호출 차단에 따른 호환성 확인 필요.
- 비밀 운영 절차 미정: Secrets 회전·권한 위임 자동화는 후속 과제로 남아 있다.

## 8. 참고(전환 방향 고정)
- 목표 구조와 배포 흐름: `docs/02-architecture/approved/target-architecture-overview-approved.md`
- 단계별 계획과 진행: `docs/02-architecture/approved/current-to-target-transition-plan-approved.md`, `docs/02-architecture/proposals/simplification-stage-04-plan-draft.md`, `docs/02-architecture/archive/simplification-stage-04-outcome-archived.md`
