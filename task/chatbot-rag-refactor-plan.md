# HR 챗봇 RAG 개선 작업 계획

## 범위 및 전제
- 대상 영역: HR 문서 업로드/요약 파이프라인, RAG 검색 로직, 챗봇 API 및 SPA UI, 인프라(테이블) 정의.
- 현재 `EchoAI-Main-Table` 하나에 계정/문서/요약이 공존하며, 요약 내용으로만 챗봇이 동작한다는 전제에서 시작.
- Gemini 호출 및 기존 문서 요약 파이프라인은 그대로 재사용하되, **전체 문서 텍스트 저장 및 선택적 문서 기반 RAG**로 변경하는 것이 목표.
- 작업 순서는 기능 영향 범위가 큰 인프라 → 백엔드 → 프론트엔드 → 데이터 마이그레이션 → 테스트/문서 순으로 진행.

## 단계별 작업 가이드

### 1. 현행 구조 분석 및 설계 확정
1. `packages/@echo-ai/api-core/src/documents.ts`, `services/api/src/lambda/chatHr.ts`, `services/api/src/lambda/documents.ts`를 중심으로 현재 흐름(업로드→요약→요약 텍스트 사용)을 다시 정리한다.
2. DynamoDB 테이블에 저장된 항목 샘플을 `scripts/tests/contracts.documents.list.test.ts` 등으로 확인해 필드 구조(예: `tags`, `summaryText`, `status`)를 문서화한다.
3. 요구사항을 바탕으로 **테이블 분리안**과 **문서 전체 텍스트 저장/조회 방식**을 설계하고, 주요 결정을 README나 이 파일 하단에 요약(S3 사용 여부, DynamoDB 항목 구조 등).

### 2. 데이터 저장소 리팩토링 설계 및 인프라 수정
1. 테이블 분리안 확정: 예시
   - `EchoAI-Accounts`: 사용자 계정/프로필 전용.
   - `EchoAI-Documents`: 문서 메타데이터(S3 키, 파일 정보, 상태, 태그 등).
   - `EchoAI-DocumentContent`: 문서 전체 텍스트 및 파생 데이터(요약, 임베딩/청크 레퍼런스) 저장.
2. `infra/lib/api-stack.ts`에서 DynamoDB 리소스를 위 세 테이블로 분리하고, 각 Lambda에 필요한 권한을 재정의한다.
3. `packages/@echo-ai/aws-clients`(사용 중인 경우)와 환경 변수 정의를 새 테이블 이름에 맞춰 갱신한다.
4. `scripts/migration/create-dynamodb-table.ts`를 수정하여 새 테이블을 생성하고, 필요한 GSI(예: `TagsIndex`, `UserIdIndex`)를 정의한다.
5. IaC 변경 후 `pnpm db:migrate`로 로컬에서 테이블 생성이 정상 작동하는지 확인 계획을 세운다.

### 3. 문서 업로드 및 요약 파이프라인 업데이트
1. `createDocumentHandler`를 문서 메타 전용 테이블에 쓰도록 수정하고, 전체 텍스트 저장 위치(새 테이블 또는 S3)에 대한 키 레퍼런스를 남긴다.
2. 요약 작업(`summarizeDocumentSyncHandler` 및 큐 소비자)을 수정하여:
   - S3에서 원본 파일을 텍스트로 변환한 결과를 **문서 전체 텍스트로 저장**.
   - 요약 결과는 별도 필드에 보관하되, RAG용으로는 전체 텍스트를 chunk/embedding 할 수 있도록 구조화(예: 청크 리스트, embedding 키 등).
3. 전체 텍스트 저장 방식 결정:
   - DynamoDB 직접 저장 시: 항목 크기 제한(400KB) 검토, 대용량 문서의 분할 저장 전략 수립.
   - S3 저장 시: 텍스트 객체 업로드 후 DynamoDB에 참조 키(예: `contentS3Key`)와 청크 메타를 기록.
4. 저장 로직 수정 후 관련 스키마(`packages/@echo-ai/api-core/src/schemas`) 및 타입 정의를 업데이트한다.
5. 문서 삭제 시 전체 텍스트/청크/임베딩도 함께 정리되도록 `documents.remove` 핸들러를 확장한다.

### 4. RAG 검색 및 챗봇 API 개편
1. `services/api/src/lambda/chatHr.ts`를 개편하여 요청 페이로드에 **문서 ID 배열(최대 3개)**을 받도록 스키마를 정의한다. 선택하지 않으면 400 응답 또는 가이드를 반환.
2. 선택된 문서를 기준으로 RAG 파이프라인 수행:
   - 전체 텍스트(또는 사전 생성된 청크/임베딩)를 로드.
   - 질문과의 유사도 기반으로 상위 청크를 추출하고, 프롬프트에 포함.
3. RAG 구현 세부:
   - 간단히 BM25/Keyword 기반으로 chunk를 선별하거나, 이미 도입된 벡터 임베딩 서비스가 있다면 해당 경로를 사용.
   - Gemini 호출 전 사용한 청크/출처 메타데이터를 함께 로깅하여 추후 UI에 근거 표기를 추가할 수 있게 준비.
4. 응답 구조에 사용된 문서/청크 참조를 포함하도록(예: `reply`, `sources`) API 응답 스키마를 확장하고, SPA에서 이를 처리한다.
5. 로컬 서버(`services/api/src/local-http.ts`)와 OpenAPI/문서가 있다면 거기에 새로운 페이로드/응답 스펙을 반영한다.

### 5. 프론트엔드(챗봇 UI) 개선
1. `apps/spa/src/routes/ChatHr.tsx`에 챗봇 질문 전 **문서 선택 UI**를 추가:
   - HR 문서 목록 호출 시 요약 여부, 태그, 상태 표시.
   - 체크박스 또는 멀티 셀렉터로 최대 3개 문서를 선택하도록 UX 설계.
2. 선택 상태를 `chatHr` API 호출 본문에 포함시키고, 응답에 포함될 수 있는 출처(`sources`)를 렌더링한다.
3. 문서 업로드 모달에서 문서 상태가 `COMPLETE`일 때만 선택 가능하도록 안내 문구 및 필터 추가.
4. 예외 처리: 문서가 하나도 선택되지 않은 경우 UI에서 안내하고, API 호출을 막는다.
5. e2e 관점에서 UX 검증 체크리스트(예: 선택 해제, 3개 초과 시 경고, 로딩 상태 처리)를 작성한다.

### 6. 데이터 마이그레이션 전략
1. 기존 `EchoAI-Main-Table` 데이터를 읽어 새로운 테이블 구조에 맞게 분산하는 마이그레이션 스크립트 작성(예: `scripts/migration/migrate-main-table-to-split.ts`).
2. 기존 `summaryText` 필드만 존재하므로, 가능하면 원본 문서를 다시 처리해 전체 텍스트를 생성하는 **백필 작업(Backfill)** 계획 수립:
   - S3에 원본 문서가 남아 있다면 재처리 큐를 만들어 순차적으로 전체 텍스트/청크를 채운다.
   - 원본이 없을 경우 summary 기반으로만 동작하는 문서는 예외 레코드로 분류하여 관리자에게 보고.
3. 마이그레이션 실행 전/후 검증 체크리스트:
   - 사용자 계정 수, 문서 수가 변하지 않았는지 확인.
   - 새 테이블에 전체 텍스트/참조 키가 채워졌는지 표본 검증.

### 7. 테스트 및 품질 보증
1. 유닛 테스트: `api-core` 문서 핸들러, 새 RAG 서비스, 챗봇 Lambda를 대상으로 입력/출력/에러 케이스 테스트 추가.
2. 통합 테스트: 로컬 환경에서 문서 업로드 → 요약(텍스트 저장 확인) → 문서 선택 → 챗봇 응답까지 시나리오 검증.
3. 부하/비용 확인: 전체 텍스트 저장 방식이 DynamoDB 한계에 근접하지 않는지, S3 사용 시 비용 추정.
4. 보안 점검: 새 테이블 접근 권한이 최소화되었는지(`read/write` 범위 재검토), 텍스트 저장 위치가 암호화 정책을 준수하는지 점검.

### 8. 배포 및 문서화
1. 릴리즈 노트에 테이블 분리 및 문서 선택 기능 추가 사항을 기록한다.
2. 운영자 가이드 업데이트: 
   - 새 테이블 확인 방법, 마이그레이션 실행 요령, 백필 스크립트 사용법.
   - 챗봇 사용 시 문서 선택 안내 및 제한(최대 3개).
3. 배포 순서 제안:
   - IaC 배포 → 새 테이블 생성 확인 → 백엔드/프론트엔드 배포 → 마이그레이션 실행 → 백필 진행.
4. 배포 이후 모니터링 포인트 설정(예: Lambda 오류, DynamoDB WCU/RCU 모니터링, Gemini 호출 실패율).

---
추가 논의 또는 설계 변경 사항은 본 문서 하단에 날짜별로 추적해 후속 작업자가 맥락을 파악할 수 있도록 한다.

## 2025-10-22 설계 메모 (Codex)
- 테이블 구조
  - `EchoAI-Accounts-{stage}`: PK=`USER#<id>`, SK=`PROFILE#<id>` (계정/프로필 전용), `EmailIndex` 유지.
  - `EchoAI-Documents-{stage}`: PK=`USER#<id>`, SK=`DOC#<documentId>`, 메타(파일명, S3 키, 상태, 태그 등). 태그 인덱스는 `TagsIndex`.
  - `EchoAI-DocumentContent-{stage}`: PK=`USER#<id>`, SK=`DOC#<documentId>`, summary, 전체 텍스트 S3 키(`contentS3Key`), 청크 메타(`chunks`), 업데이트 시간 포함. 선택적 `EmbeddingsIndex` 대비 `documentId` GSI(`DocumentIndex`) 추가.
- 전체 텍스트 저장
  - 요약 파이프라인에서 추출된 텍스트를 S3에 `documents/text/<userId>/<documentId>.txt` 로 저장.
  - DynamoDB `DocumentContent` 항목에는 `contentS3Key`, `summaryText`, `chunkSize`, `chunkCount`, `lastProcessedAt` 저장.
- RAG 전략
  - 챗봇 요청은 `{ question, documentIds: string[] }` 형태, 최대 3개 허용.
  - 선택된 각 문서에 대해 S3 텍스트를 로드, 줄바꿈 기준으로 chunk 분할(약 500자 기준) 후 간단한 tf-idf 대체 점수(질문 토큰 교집합 수 + bigram 매치)로 상위 6개 chunk 선택.
  - Gemini 프롬프트에는 선택된 chunk들과 출처 메타데이터(문서명, chunk index) 포함, 응답에는 `sources` 필드 추가.
- 프론트엔드
  - Chat UI 상단에 문서 선택 패널을 추가하고, `COMPLETE` 상태 HR 문서를 다중 선택(체크박스) 지원.
  - 전송 시 선택값과 질문을 함께 전송, 응답의 `sources`를 풍선 아래에 태그 형태로 표시.
