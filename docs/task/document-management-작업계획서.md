## 문서 관리/요약/인증 개선 작업 계획서

상태: 진행 중

공통 사전조건
- 리전: ap-northeast-2 (문서/코드/환경변수 통일)
- LocalStack S3, DynamoDB Local은 docker-compose로 자동 초기화됨
- 환경 변수(.env.local)
  - AWS_REGION=ap-northeast-2
  - DYNAMODB_ENDPOINT=http://dynamodb-local:8998
  - AWS_ACCESS_KEY_ID=dummy, AWS_SECRET_ACCESS_KEY=dummy
  - S3_BUCKET_NAME=test-bucket
  - S3_ENDPOINT=http://localstack:4566 (서버 내부)
  - S3_PUBLIC_ENDPOINT=http://localhost:4566 (브라우저 공개)
  - JWT_SECRET=...

### 1. 목표
- 문서 업로드·관리 API 완성(Pre-signed 업로드, 목록/상세/삭제)
- 문서 요약 API 구현 및 요약 상태/내용 저장
- 인증/보안 정비(라우트 정리, 토큰 만료, 표준화된 401 메시지, FE 만료 처리) — 진행됨
- 프론트엔드 목록/상세/요약 UI 연동

-----

-----

### 2. 우선순위 목록 (링크)

1. Presigned 업로드 URL 발급 API — docs/task/documents-presign-작업계획서.md
2. 문서 목록/상세/삭제 API — docs/task/documents-crud-작업계획서.md
3. 문서 요약 API — docs/task/documents-summarize-작업계획서.md
4. 문서 목록/상세/업로드/요약 UI — docs/task/documents-frontend-작업계획서.md
5. 인증/보안 강화 — docs/task/auth-hardening-작업계획서.md
6. 인증 UI (로그인/회원가입/로그아웃) — docs/task/auth-ui-작업계획서.md
7. 테스트 및 모니터링 — docs/task/testing-monitoring-작업계획서.md

-----

### 3. 작업 목록 (Step-by-Step)

1) 데이터 모델 확정 (DynamoDB)
- 테이블: `EchoAI-Main-Table`
  - 키: `PK` (USER#<userId>), `SK` (DOC#<documentId>)
  - 속성: `userId`, `documentId`, `filename`, `s3Key`, `filetype`, `filesize`, `status`(PENDING|UPLOADED|PROCESSING|COMPLETE|FAILED), `summaryText`, `createdAt`, `updatedAt`
- 수용 기준: 문서 아이템의 생성·조회·삭제가 위 스키마로 정상 동작

2) Pre-signed URL 발급 API
- 경로: `POST /api/documents/presign`
- 입력: `{ filename, contentType, size }`
- 처리:
  - 토큰 검증 → s3Key 생성(`uploads/{userId}/{uuid}/{filename}`)
  - `PutObjectCommand`에 대해 `@aws-sdk/s3-request-presigner`로 URL 발급(유효기간 10분)
  - 개발 환경: endpoint는 `S3_PUBLIC_ENDPOINT`를 사용해 브라우저에서 바로 PUT 가능하도록 함
  - Content-Type 화이트리스트, 최대 크기 제한 등 검증
- 출력: `{ uploadUrl, bucket, key, expiration }`
- 구현 파일: `src/app/api/documents/presign/route.ts`
- 수용 기준: 브라우저에서 pre-signed URL로 직접 S3 업로드 성공

3) 업로드 후 메타데이터 저장 API (레코드 생성)
- 경로: `POST /api/documents`
- 입력: `{ key, filename, filetype, filesize }`
- 처리: 토큰 검증 → DynamoDB에 문서 아이템 생성(status: UPLOADED)
- 참고: 현재 `src/app/api/documents/route.ts`는 서버 업로드 방식. Pre-signed로 전환 시 레코드 저장 용도로 역할 변경 또는 신규 분리.
- 수용 기준: pre-signed 업로드 후 해당 API 호출 시 DB에 레코드가 생성됨

4) 문서 목록 조회 API
- 경로: `GET /api/documents` (사용자별 페이징 지원)
- 처리: `PK = USER#<userId>`로 Query, `SK`가 `DOC#` prefix인 아이템만 반환
  - 검색: `q`(filename 부분 일치, 대소문자 비구분) 지원
- 정렬: `sortKey`(`createdAt|updatedAt|filename|filesize`), `sortDir`(`asc|desc`) 지원(응답 내 정렬)
  - 제한: 현재 검색/정렬은 파티션 내 in-memory 처리로 구현되어 있어 대량 데이터 시 비효율적일 수 있음. 장기적으로는 GSI 또는 검색 엔진(OpenSearch 등) 도입을 고려.
- 수용 기준: 로그인 사용자 문서 목록이 페이지네이션 포함 정상 반환

5) 문서 상세 조회 API
- 경로: `GET /api/documents/[documentId]`
- 처리: PK/SK로 단건 Get → 요약 상태/내용 포함 반환
- 수용 기준: 특정 문서 상세가 정상 반환

6) 문서 삭제 API
- 경로: `DELETE /api/documents/[documentId]`
- 처리: S3 객체 삭제(`DeleteObject`), DynamoDB 아이템 삭제
- 수용 기준: 문서 삭제 시 S3/DB 모두 정리되고 목록에서 제외

7) 문서 요약 API
- 경로: `POST /api/documents/[documentId]/summarize`
- 처리 흐름:
  - 토큰 검증 → 문서 메타 로드 → S3에서 파일 `GetObject` → 텍스트 추출(우선 텍스트·md·pdf 간단 처리) → LLM 호출(의존: `@google/generative-ai`) → `summaryText`, `status=COMPLETE` 업데이트
  - 실패 시 `status=FAILED` 및 에러 로깅
- 수용 기준: 호출 후 요약 결과가 DB에 저장되고 상세 조회에 표시

8) 프론트엔드 문서 목록/상세 페이지
- 경로: `/documents`, `/documents/[id]`
- 기능: 목록 표시(파일명, 크기, 상태), 상세 표시(메타+요약), 요약 실행/삭제 버튼
- 업로드 UI: pre-signed URL로 PUT → 메타 저장 API 호출 플로우 구성
- 수용 기준: 브라우저에서 업로드→목록반영→상세확인→요약→결과표시 전체 플로우 동작

9) 인증/보안 정비 — 완료
- 라우트 정리: `src/app/api/signup/route.ts` 제거(중복), `/api/auth/*` 네임스페이스로 일원화(완료)
- 토큰 만료: Access Token 1시간 적용 및 검증 강화(완료)
- 비밀번호 정책: 최소 길이, 문자 조합 체크(완료)
- 에러 메시지: 401 표준화(누락/만료/무효) 및 공통 헬퍼(`requireAuth`) 적용(완료)
- FE 처리: 401(만료/무효) 시 토큰 삭제 및 재로그인 유도(axios 인터셉터)(완료)
- (선택) 이메일 검증·재설정: 추후 이슈 분리

10) 테스트/모니터링
- 테스트
  - 단위: 토큰 유틸, pre-sign 생성 로직, DynamoDB 리포지토리 함수
  - 통합: 주요 API 라우트(프리사인, 목록/상세/삭제, 요약)
- 로깅/모니터링
  - 로컬: 구조화 로깅 적용(예: pino) 또는 콘솔 규약 정리
  - 배포: CloudWatch 연계 설계(추가 문서화)
- 수용 기준: 핵심 경로 테스트 통과, 주요 실패 케이스 로깅 확인

-----

### 4. 구현 상세 가이드 (발췌)

- Pre-signed URL 생성 시 주의
  - LocalStack를 브라우저에서 호출해야 하므로, URL 호스트는 `S3_PUBLIC_ENDPOINT`(http://localhost:4566) 사용
  - SDK 클라이언트는 컨테이너 내부 접속용 `S3_ENDPOINT`(http://localstack:4566) 유지
  - Path-Style 강제(`forcePathStyle: true`)

- 요약 처리
  - 1차는 동기 처리(요청 대기)로 단순 구현 → 후속으로 비동기(SQS/Lambda) 제안
  - 텍스트 추출은 파일 타입 우선순위에 따라 간소화 후 확장

- 삭제 처리
  - S3 삭제 성공 실패에 따른 롤백/보정 로직 간단화(실패 시 재시도/경고)

-----

### 5. 작업 순서(체크리스트)
1. Pre-signed 발급 API 추가 (`/api/documents/presign`)
2. 업로드 메타 저장 API 전환/추가 (`/api/documents` POST)
3. 목록/상세/삭제 API 구현
4. 요약 API 구현 (`/api/documents/[id]/summarize`)
5. FE 목록/상세/업로드/요약 UI 연결
6. 인증 라우트 정리 및 정책 강화
7. 테스트 작성 및 로깅 정비
