## 작업 계획서: 문서 요약 API 구현 (/api/documents/[id]/summarize)
우선순위: 3

### 1. 목표
- 지정 문서를 요약하여 `EchoAI-Main-Table`에 `summaryText`와 `status=COMPLETE`로 저장한다.
- 오류 시 `status=FAILED`로 업데이트하고 원인 로깅을 남긴다.

-----

### 2. 사전 조건
- LLM: `@google/generative-ai` 사용 (기존 의존성 활용)
- 파일 입수: S3 `GetObject`로 텍스트 추출(우선 텍스트/마크다운/간단 PDF)
- 인증: Bearer 토큰 검증

-----

### 3. API 명세
- 경로: `POST /api/documents/[documentId]/summarize`
- 입력: 본문 없음(확장 시 요약 파라미터 추가 가능)
- 동작:
  1) 토큰 검증 → 문서 로드(소유 확인)
  2) 상태 `PROCESSING`으로 업데이트(낙관적 락: 조건식 포함 가능)
  3) S3에서 파일 가져오기 → 텍스트 추출
  4) LLM 호출로 요약 결과 생성
  5) DB에 `summaryText`, `status=COMPLETE`, `updatedAt` 저장
  6) 실패 시 `status=FAILED` 저장
- 응답: `{ documentId, status, summaryText? }`

-----

### 4. 작업 단계 (Step-by-Step)
1) 라우트 파일 생성: `src/app/api/documents/[documentId]/summarize/route.ts`
2) 권한/존재 검증 함수 공통화(`lib/auth`/`lib/documents`)
3) 상태 업데이트 유틸: `updateStatus(userId, docId, status, partial)`
4) S3 파일 로더: `getObjectText(bucket, key)` (ContentType별 분기 최소화)
5) 요약기 래퍼: `summarizeText(text, options)` → LLM 호출
6) 예외 처리 및 상태 전이(FAILED) 보장
7) 타임아웃/최대 토큰 등 운영 제한값 도입(환경 변수)

-----

### 5. 수용 기준
- 정상 호출 시 상태가 COMPLETE로 바뀌고, 상세 조회에서 요약이 보인다.
- 실패 시 FAILED로 반영되고, 재시도 시 API가 허용(또는 처리 중 보호)된다.

-----

### 6. 수동 테스트 시나리오
1) 업로드된 텍스트 파일 대상 요약 호출 → 요약 결과 확인
2) 존재하지 않는 문서/권한 없는 문서 → 404/403 응답 확인
3) LLM 에러 모킹 시 FAILED 저장 확인
