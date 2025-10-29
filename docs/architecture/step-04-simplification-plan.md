# 단계 4. 단순화 작업 상세 계획서 (우선순위 3, 1~1.5주)

본 문서는 전환 계획서의 "단계 4. 단순화 작업"을 상세화한다. 목표는 Lambda-first + SPA 기반으로 구조적 중복을 제거하고, 로컬-클라우드 파리티를 확립하는 것이다.

## 0) 확정된 전제/결정 사항
- UI 프레임워크: React SPA + Vite (SSR/Next.js 제거)
- IaC 방식: AWS CDK(TypeScript)
- Microfrontend: 현재 도입하지 않음(단일 팀/도메인, 페이지 복잡도 낮음). 재검토 기준은 아래 참조.
- Secrets 스키마: 아래 6) 참조(Secrets Manager JSON 스키마 확정)

## 1) 목표와 범위
- Lambda-first: 서버 기능의 단일 출처를 Lambda로 통일(Next API 라우트 제거 경로 수립)
- Presign-only: 파일 업로드는 프리사인드 POST로 일원화(서버사이드 업로드 제거)
- Async-only Summarization: 요약은 202 + SQS 큐잉으로 일원화(동기 경로 제거)
- 계약/검증 통일: `@echo-ai/api-core`에 zod 스키마와 에러 규약을 정의해 모든 어댑터에서 공통 적용
- 로컬 파리티: 로컬 HTTP 게이트웨이 추가로 프런트/테스트가 Lambda와 동일 엔드포인트/계약 사용
- SPA 스캐폴드: 최소 화면(로그인/업로드/목록/상세/요약 트리거) 기능 포팅 기반 마련

## 2) 산출물(DoD)
- 로컬에서 Docker Compose로 `api-local`(HTTP 게이트웨이) + `ai-processor` + LocalStack + DynamoDB Local 구동, 프런트에서 모든 기능 수행
- 업로드는 프리사인드 POST만 사용(정책: 확장자/MIME/크기)하고 서버사이드 업로드 경로 비활성화
- 요약 요청은 202 응답 + 큐잉, 동기 요약 미사용(테스트 유틸 제외)
- 계약 테스트가 로컬 게이트웨이 대상으로 통과(상태코드/본문/헤더 일치)
- 문서화 업데이트: 로컬 실행/트러블슈팅, 업로드 정책, 에러 규약, 아키텍처 개요

## 3) 작업 내역(세부)
1. 로컬 HTTP 게이트웨이 추가
   - 파일: `services/api/src/local-http.ts`
   - 프레임워크: Hono 또는 Express(경량/간단)
   - 엔드포인트 매핑: `/auth/*`, `/documents/*` → `services/api/src/lambda/*` 어댑팅(APIGatewayProxyEventV2 변환)
   - CORS: `VITE_API_BASE_URL` 소비하는 SPA 기원 도메인 허용(로컬: `http://localhost:5173`)
   - 환경: `PORT=8787`(예시), 로깅/에러 핸들링 공통 미들웨어
   - 수용 기준: 모든 계약 테스트가 게이트웨이 대상에서 통과

2. Next.js API 라우트 단계적 제거(비활성화 → 삭제)
   - 현행 경로: `apps/web/src/app/api/**`
   - 1차: 라우트에서 `@echo-ai/api-core` 호출 제거, 사용처를 `VITE_API_BASE_URL`(게이트웨이)로 교체
   - 2차: 경고/비활성화 플래그로 빌드 제외
   - 3차: 폴더 삭제(단계 5 완료 이후)

3. 업로드 경로 단일화(Presign-only)
   - 서버사이드 업로드 분기 제거: `apps/web/src/app/api/documents/route.ts`의 멀티파트 분기 폐기
   - 클라이언트 업로드 플로우: presign → 브라우저 S3 직접 업로드 → `POST /documents` 메타데이터 저장
   - 정책 단일화 소스: `packages/@echo-ai/api-core/src/presign.ts` (확장자/MIME/크기)
   - 수용 기준: UI에서 모든 업로드가 presign + S3 업로드로만 성공, 정책 위반 시 일관된 에러 메시지 수신

4. 요약 경로 일원화(Async-only)
   - `POST /documents/{id}/summarize`는 202만 반환; 동기 핸들러는 제거 또는 테스트 전용 유지
   - 큐잉 실패 시 `FAILED`로 상태 업데이트, 성공 시 `PROCESSING`
   - 워커(`services/ai-processor/src/handler.ts`)가 p95 20초 내 결과 저장 확인

5. 계약/검증 통일(zod)
   - 스키마 위치: `packages/@echo-ai/api-core/src/schemas/**`
   - 포함: Auth(Login/Signup/Me), Documents(Create/List/Get/Delete/Summarize), Presign(Create)
   - 에러 규약: `{ message, code?, details? }`, 공통 401/403/404/409/422/429 맵 정의
   - 핸들러 업데이트: 파라미터/본문 검증 → 일관된 에러 포맷 반환
   - 테스트: 스키마 기반 Contract Tests 추가/수정

6. Secrets 스키마 확정(정의만, 구현은 단계 6에서)
   - Secret 이름: `echoai/{stage}/app` (예: `echoai/develop/app`, `echoai/production/app`)
   - 형식: JSON Secret
     - `JWT_SECRET`: string (필수)
     - `GEMINI_API_KEY`: string (선택; 요약 엔진 미결정 대비)
     - `OPENAI_API_KEY`: string (선택)
     - `HASH_SALT`: string (선택; 패스워드 해시용)
     - `SUMMARIZE_PROVIDER`: 'gemini' | 'openai' (선택; 기본값 'gemini')
   - 주입 전략(사전 합의): 단계 6에서 런타임 조회 + 캐싱. 단계 4에선 `.env.local`로 동일 키를 유지해 파리티 보장

7. 목록/검색 정합성 보완
   - `documents.list`: `q`, `sortKey(createdAt|filename)`, `sortDir(asc|desc)`, `cursor` 완성
   - DynamoDB 쿼리 최적화: GSI 도입 여부 검토(파일명 검색/정렬 필요 시)
   - Contract Test로 페이지네이션/정렬/검색 시나리오 추가

8. 로컬-클라우드 파리티 강화
   - LocalStack 공개 엔드포인트 사용: `S3_PUBLIC_ENDPOINT=http://localhost:4566`
   - `@echo-ai/config`에서 `s3PublicEndpoint` 우선 사용(브라우저 presign URL 유효)
   - Docker 네트워크 내 서비스명(`localstack`)과 호스트 접근(`localhost`) 차이를 문서화

9. SPA 스캐폴드 생성
   - 위치: `apps/spa`
   - 최소 라우트: `/login`, `/documents`(목록), `/documents/:id`(상세), 업로드/요약 트리거 UI
   - 설정: `VITE_API_BASE_URL`(로컬 게이트웨이/배포 API GW)
   - 인증: LocalStorage 토큰 보관, 인터셉터로 Authorization 헤더 자동 주입

10. Docker Compose 정리
    - `app`(Next.js) 서비스 제거, `api-local` 추가(포트 8787)
    - 의존성: LocalStack(S3,SQS), DynamoDB Local, `ai-processor`
    - 헬스체크/초기화 스크립트 업데이트

11. 문서화/운영 가이드
    - 로컬 실행/업로드 정책/에러 규약/트러블슈팅 문서 업데이트
    - 마이그레이션 노트: Next API 라우트 제거에 따른 영향/대체 경로

## 4) 일정(캘린더 주 단위 예시)
- W1: 로컬 HTTP 게이트웨이, Presign-only 전환, Async-only 요약, 목록/검색 보완
- W2: SPA 스캐폴드, Compose 정리, 계약 테스트/문서화 업데이트, 버그픽스·여유 버퍼

## 5) 수용 기준(AC)
- 모든 계약 테스트가 로컬 HTTP 게이트웨이 대상으로 통과
- 업로드/요약/조회/삭제 E2E 플로우가 SPA에서 정상 동작
- 서버사이드 업로드/동기 요약 경로가 비활성화되어 호출 불가
- presign 정책 위반 시 일관된 에러 포맷으로 응답

## 6) 리스크 및 대응
- 브라우저 presign 업로드 실패(LocalStack URL/버킷 경로 문제) → `s3PublicEndpoint` 우선 사용 및 CORS 정책 점검
- 계약 변경으로 인한 프런트 적응 필요 → 스키마 기반 타입 생성/공유 및 샘플 요청 제공
- DynamoDB 검색/정렬 한계 → 요구조건 상향 시 GSI/인덱스 확장 계획 수립

## 7) 역할/분장
- 백엔드: 게이트웨이/Presign-only/Async-only/리스트 보완/테스트
- 프런트엔드: SPA 스캐폴드/업로드·요약·목록 화면/토큰 인터셉터/에러 UX
- DevOps: Compose/LocalStack 초기화/CORS·네트워크/문서 갱신

## 8) Microfrontend 도입 판단 기준(권고)
- 도입 권장 시점: 다중 독립 배포 팀, 상이한 기술 스택 병행, 페이지 규모/복잡도 급증, 엄격한 경계 필요
- 현 단계 판단: 도입 불필요(범위·팀 구성·페이지 수 제한). 추후 학습도구 등 대규모 독립 모듈화 필요 시 재검토

