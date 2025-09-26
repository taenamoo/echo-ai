# 단계 4. 단순화 작업 결과 보고서

본 문서는 "단계 4. 단순화 작업" 수행 결과를 요약한다. Lambda-first + SPA 전환을 위한 기초 변경을 코드/환경에 반영했다.

## 1) 코드 변경 요약
- 로컬 HTTP 게이트웨이 추가: `services/api/src/local-http.ts`
  - Node `http` 기반의 경량 서버로 API Gateway v2 이벤트를 에뮬레이션하여 Lambda 어댑터(`services/api/src/lambda/*`)를 직접 호출
  - 매핑 엔드포인트: `/auth/signup`, `/auth/login`, `/me`, `/documents`(GET/POST), `/documents/presign`(POST), `/documents/{id}`(GET/DELETE), `/documents/{id}/summarize`(POST)
  - CORS: 기본 `http://localhost:5173` 허용(환경변수 `CORS_ALLOW_ORIGIN`로 변경 가능)
  - CORS·프리플라이트 보완: `Access-Control-Allow-Methods`에 `PUT/PATCH` 추가, `PUT/PATCH` 본문 파싱 처리(프리플라이트 오류 및 본문 누락 해결)

- 서비스 실행 스크립트 추가: `services/api/package.json`
  - `dev`/`serve`: `tsx src/local-http.ts`
  - 기존 `local`(CLI invoker)은 유지

- Docker Compose 서비스 추가: `docker-compose.yml`
  - `api-local` 서비스(포트 `8787`): 로컬 HTTP 게이트웨이를 기동
  - 의존성: `localstack`(S3,SQS), `dynamodb-local`, 초기화 컨테이너
  - devcontainer 통합: `.devcontainer/devcontainer.json`에서 `runServices`로 `api-local`/`spa`/인프라 자동 기동, `service`는 `api-local`로 접속

- SPA 스캐폴드/개발 서버 추가
  - 정적 SPA(의존성 없이 기본 동작):
    - `apps/spa/index.html`, `apps/spa/main.js`, `apps/spa/styles.css`
  - 개발 서버 스크립트: `scripts/dev/spa-dev-server.ts` (기본 포트 `5173`)
  - 루트 스크립트: `pnpm spa:dev`로 실행, `docker-compose.yml`에 `spa` 서비스 추가
  - Tailwind v4 + PostCSS 적용: `apps/spa/postcss.config.mjs`, CSS 변수/레이아웃 유틸 포팅
  - 브랜딩 자산 동기화 스크립트: `scripts/tools/sync-public-assets.sh` (Next → SPA), `pnpm run spa:sync-assets`

- 서버사이드 업로드 경로 단계적 비활성화: `apps/web/src/app/api/documents/route.ts`
  - `ALLOW_MULTIPART_UPLOAD`가 설정되지 않으면 멀티파트 업로드 경로는 `410 Gone` 반환(프리사인드 업로드 사용 권고)

- 요약 동기 경로 차단(기본): `apps/web/src/app/api/documents/[documentId]/summarize/route.ts`
  - 기본값 비동기(큐잉) 강제, `ALLOW_SYNC_SUMMARIZE=true` 설정 시에만 동기 경로 활성화(과도기 옵션)

- Zod 스키마 도입 및 목록 로직 정리
  - 스키마 추가: `packages/@echo-ai/api-core/src/schemas/**`
    - auth: `LoginSchema`, `SignupSchema`
    - presign: `PresignCreateSchema`
    - documents: `DocumentCreateSchema`, `DocumentListQuerySchema`
  - 핸들러 연계:
    - `auth.ts`/`presign.ts`/`documents.ts`에서 스키마 검증 적용
    - `listDocumentsHandler`의 q/sortKey/sortDir/cursor 검증·정규화 및 커서 처리 보완
  - Documents SPA 화면을 Next와 동등 수준으로 재구성: 업로드(프리사인드·드래그앤드롭·진행률)/검색/정렬/페이지네이션/행동 버튼/모바일 상세 토글(`apps/spa/src/routes/Documents.tsx`)

- SPA 에러 UX 정리(공통 에러 포맷 연계)
  - 공통 에러 객체 `ApiError` 도입 및 활용: `apps/spa/src/api.ts`
    - 서버 에러 응답 `{ message, code, details }`를 그대로 보존하여 UI에서 코드/메시지 출력 가능
  - 문서 목록 화면의 오류 표시 개선: `apps/spa/src/routes/Documents.tsx`에서 `ApiError` 코드/메시지 반영

- Study 노트 UI 개선(1차)
  - 제목/내용/예시/순서(study_order) 편집 폼 추가(인라인): `apps/spa/src/study/StudyNotes.tsx`
  - 클라이언트 검색(제목 필터) 및 정렬(study_order) 적용: 사이드바 검색 입력 + 정렬 유틸
  - 편집 저장 시 `updateStudy` API 연계, 선택 항목 갱신

- 계약 테스트 보완(문서 목록 파라미터 검증)
  - 잘못된 sortKey/cursor에 대한 400 검증 추가: `scripts/tests/contracts.documents.list.test.ts`
  - 기존 invalid limit 시나리오와 함께 Lambda 어댑터/공유 핸들러 동시 확인

- Next.js 앱 로컬/Compose 비활성화 확인(과업 완료)
  - 로컬 개발은 `api-local`(8787) + SPA(5173)만 기동: `docker-compose.yml`
  - Next.js API 라우트는 과도기 비활성화 플래그 적용 및 단계적 제거 계획에 따라 유지(빌드 경로에서 미사용)

- Zod 에러 규약 통일(공통 에러 포맷)
  - 공통 HTTP 유틸 추가: `packages/@echo-ai/api-core/src/http.ts`
    - 에러 응답 본문 형식: `{ message, code, details }`
    - 헬퍼: `ok/created/accepted`, `badRequest/unauthorized/forbidden/notFound/conflict/serverError`, `badRequestFromZod/zodIssues`
  - 핸들러 적용: `auth.ts`, `documents.ts`, `presign.ts`가 공통 포맷으로 응답하도록 리팩터
    - Zod 실패 시 `code: 'VALIDATION_ERROR'`, `details.issues[]`에 경로/코드/메시지 제공
    - 충돌/권한 오류 등은 표준 `code`로 매핑(`CONFLICT`, `UNAUTHORIZED`, …)

- Study 기능 서버/클라이언트 구현
  - Lambda: `services/api/src/lambda/study.ts` (list/create/update/delete/quiz/search)
  - 로컬 라우팅: `services/api/src/local-http.ts`에 `/study/*` 경로 연결
  - SPA: Study 노트/로드맵/퀴즈/코드연습장/개념모달 컴포넌트
    - `apps/spa/src/study/StudyNotes.tsx` (좌측 목록+상세, 간이 추가/삭제)
    - `apps/spa/src/study/LearningRoadmap.tsx` (카드+콘텐츠 목록)
    - `apps/spa/src/study/ConceptModal.tsx` (외부 문서 iframe)
    - `apps/spa/src/study/CodePlayground.tsx` (CodeSandbox 임베드, 높이 70vh)
    - `apps/spa/src/study/AiQuiz.tsx` (생성/풀이/정답/해설/점수)
    - `apps/spa/src/study/AiSearchButton.tsx` (드래그/더블클릭 모달, `/study/search` 호출)
  - SPA 연동 정리
    - 공통 API 헬퍼 사용: `apps/spa/src/api.ts`의 `api()` 경유로 `VITE_API_BASE_URL` 대상 호출
    - AI 검색 경로 일원화: `apps/spa/src/studyApi.ts`에 `searchStudy()` 추가, `AiSearchButton`이 Next 라우트(`/api/study/search`) 대신 게이트웨이(`/study/search`)를 사용하도록 수정
  - Study 페이지 리팩터: 탭(스터디 노트/로드맵) + 뷰 전환 + 플로팅 AI 검색(`apps/spa/src/routes/Study.tsx`)

## 2) 실행/검증 방법
- 로컬 인프라 기동
  - `docker-compose up -d dynamodb-local localstack dynamodb-init`

- API 로컬 게이트웨이 기동
  - `docker-compose up -d api-local`
  - 혹은 호스트에서: `pnpm --filter @echo-ai/service-api run serve` (포트 `8787`)
  - Dev Container: Rebuild 후 자동으로 `api-local`/`spa`/인프라 서비스가 기동됨
  - SPA 자산 동기화: `pnpm run spa:sync-assets` (필요 시 `-- --clean`)

- 주요 환경변수
  - `.env.local` 사용: `AWS_REGION`, `DYNAMODB_ENDPOINT`, `S3_BUCKET_NAME`, `S3_PUBLIC_ENDPOINT`, `SQS_ENDPOINT`, `SUMMARIZE_SQS_QUEUE_URL`, `SUMMARIZE_ASYNC=true`, `GEMINI_API_KEY`(또는 `SUMMARIZE_USE_MOCK=true`)
  - 게이트웨이 전용: `PORT`(기본 8787), `CORS_ALLOW_ORIGIN`(기본 `http://localhost:5173`)
  - SPA 서버: `SPA_PORT=5173`, `API_BASE`(도커 네트워크 내는 `http://api-local:8787`)

- 계약 테스트(예시)
  - presign 계약: `pnpm test:contracts` (필요 시 테스트를 게이트웨이에 맞춰 업데이트)

## 3) 기대 효과
- Next.js 라우트에 대한 의존 없이 로컬에서 Lambda 경로를 그대로 사용 가능(로컬=클라우드 파리티 향상)
- 업로드/요약 경로의 정책 일원화(Presign-only, Async-only)
- CI/CD 재정의(단계 7)의 기반 확보: 프런트 SPA 분리 배포, 백엔드 Lambda 독립 배포
 - 학습 도구(로드맵/퀴즈/연습장/AI검색) 추가로 제품 완성도 향상

## 4) 남은 작업/후속(다음 단계 연계)
- SPA 고도화: 라우팅/상태관리/에러 UX 보완(진행중), 환경변수 처리(Vite `VITE_API_BASE_URL`) [완료]
- IaC 확장: API GW 경로/람다 연결, Secrets/알람 세부 구성, 배포 파이프라인에서 UI 전용/백엔드 전용 Job 분기
- `@echo-ai/api-core`에 zod 스키마 및 에러 규약 반영[에러 규약 반영 완료], 목록/검색 파라미터 최종화 및 계약 테스트 확장(계약 테스트 1차 보완 완료, 추가 시나리오 진행중)
- CDK 스택(dev) 배포(단계 5), Secrets Manager 통합(단계 6), CI/CD 재정의(단계 7)

## 5) 변경 파일 목록
- `services/api/src/local-http.ts` (신규)
- `services/api/package.json` (스크립트 추가)
- `docker-compose.yml` (`api-local` 서비스 추가)
- `apps/web/src/app/api/documents/route.ts` (멀티파트 경로 단계적 비활성화)
- `apps/web/src/app/api/documents/[documentId]/summarize/route.ts` (비동기 기본 강제)
