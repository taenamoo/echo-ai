---
title: 로컬 테스트 가이드 — API Lambda 핸들러 및 E2E
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 로컬 테스트 가이드 — API Lambda 핸들러 및 E2E

본 문서는 로컬 개발 환경에서 API Lambda 핸들러(services/api)와 비동기 요약 파이프라인(SQS → ai-processor)을 테스트하는 방법을 안내합니다.

## 1) 목적
- Next.js 라우트와 동등한 기능을 하는 Lambda 핸들러를 단위 수준으로 검증
- 문서 업로드/요약까지 로컬에서 E2E로 검증

## 2) 사전 준비
- Docker, Docker Compose 설치
- 레포 루트에 `.env.local` 존재(템플릿이 커밋되어 있습니다). 필요한 값만 수정
  - 컨테이너 내부 LocalStack 접근: `http://localstack:4566`
  - 브라우저 S3 업로드(프리사인드) 접근: `http://localhost:4566`
- 패키지 매니저: pnpm(이미 Dockerfile에서 corepack enable)

## 3) 서비스 기동 (E2E용)
```bash
# LocalStack(S3/SQS), DynamoDB Local, ai-processor(워커), app(Next.js)
docker compose up -d --build localstack dynamodb-local dynamodb-init ai-processor app
```
- DynamoDB Admin UI: http://localhost:8999
- 웹 앱: http://localhost:3000

E2E 절차는 별도 문서 참고: `docs/runbooks/local-e2e-async-summarization.md`

## 4) Lambda 핸들러 로컬 호출(단위 테스트 대용)
핸들러는 API Gateway v2 이벤트를 흉내 내는 간단한 인보커 스크립트로 호출할 수 있습니다.

### 4-1) 환경 변수 로드
```bash
# 셸에서 환경 변수 적용 (호스트에서 실행 시)
set -a; . ./.env.local; set +a
```

### 4-2) 회원가입 / 로그인 / 내 정보
```bash
# 회원가입
pnpm --filter @echo-ai/service-api run local signup \
  --email=user@example.com --password=Test1234 --name=User

# 로그인 (액세스 토큰 발급)
pnpm --filter @echo-ai/service-api run local login \
  --email=user@example.com --password=Test1234

# 내 정보 조회 (토큰 필요) — 방법 1: 인자로 전달
pnpm --filter @echo-ai/service-api run local me --token=YOUR_JWT

# 내 정보 조회 — 방법 2: 환경 변수로 전달
export TOKEN=YOUR_JWT
pnpm --filter @echo-ai/service-api run local me
```

### 4-3) 문서 API (메타데이터 저장/목록/단건/삭제/요약 큐잉)
사전: 프런트에서 프리사인드 업로드를 통해 S3에 파일이 올라갔다고 가정합니다. 키 형태는 `uploads/{userId}/{documentId}/{filename}` 입니다.

```bash
# 문서 메타데이터 저장
pnpm --filter @echo-ai/service-api run local documents:create \
  --token=$TOKEN \
  --key=uploads/USER#<userId>/<docId>/file.pdf \
  --filename=file.pdf \
  --filetype=application/pdf \
  --filesize=12345 \
  --documentId=<docId>

# 문서 목록
pnpm --filter @echo-ai/service-api run local documents:list --token=$TOKEN --limit=20

# 문서 단건 조회
pnpm --filter @echo-ai/service-api run local documents:get --token=$TOKEN --id=<docId>

# 문서 삭제
pnpm --filter @echo-ai/service-api run local documents:delete --token=$TOKEN --id=<docId>

# 문서 요약 큐잉 (SQS 발행)
pnpm --filter @echo-ai/service-api run local documents:summarize --token=$TOKEN --id=<docId>
```

### 4-4) 처리 확인
- ai-processor 로그: `docker compose logs -f ai-processor`
  - `Starting local runner. Queue: ...`, 처리 후 `Deleted X messages` 출력 확인
- 상태 전환: 목록/단건 조회에서 `status: PROCESSING → COMPLETE`, `summaryText` 확인
- DynamoDB Admin UI에서 항목 상태/요약 텍스트 필드 확인

## 5) 실제 Gemini 호출로 전환(선택)
- `.env.local` 수정: 유효한 `GEMINI_API_KEY` 설정, `SUMMARIZE_USE_MOCK=false`
- 워커 재기동: `docker compose up -d --build ai-processor`
- 에러가 난다면 워커 로그에서 원인(GoogleGenerativeAIFetchError 등) 확인

## 6) 트러블슈팅
- 큐 없음 오류(QueueDoesNotExist)
  - `.env.local`에서 컨테이너용 URL(`http://localstack:4566`) 사용
  - 코드가 로컬에서 큐 미존재 시 자동 생성 재시도 수행
- 동적 라우트 params 에러(Next.js)
  - 웹 경로는 `await context.params`로 수정되어 있음
- 모듈 해석 실패(@echo-ai/*)
  - 컨테이너 엔트리포인트가 `pnpm install` 자동 수행, 그래도 실패 시 `docker compose up -d --build`
- 요약이 모의로만 동작
  - `SUMMARIZE_USE_MOCK=true`이거나 키가 플레이스홀더일 때 발생 → 실제 키 설정 후 false로 전환

## 7) 참고 문서
- 현행/목표/의사결정: 
  - `docs/04-operations/approved/aws-rollout/step-02-application-architecture.md`
  - `docs/done/step-02-application-architecture/application-architecture-notes.md`
  - `docs/02-architecture/approved/stage-01-prep-decisions-approved.md`
  - `docs/02-architecture/approved/target-architecture-overview-approved.md`
- 로컬 E2E 가이드: `docs/runbooks/local-e2e-async-summarization.md`

