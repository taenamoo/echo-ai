---
title: 로컬 E2E 가이드 — 비동기 요약 경로(SQS → ai-processor)
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 로컬 E2E 가이드 — 비동기 요약 경로(SQS → ai-processor)

## 1) 목적
- 로컬 환경에서 업로드 → 큐잉(SQS) → 워커(ai-processor) → 요약 결과 저장(DynamoDB)까지 종단 간 흐름을 검증한다.

## 2) 사전 준비
- Docker, Docker Compose 설치
- 레포 루트에 `.env.local` 준비(예시는 `.env.local.example` 참고)
  - 컨테이너 내부에서 LocalStack 접근은 `http://localstack:4566` 사용
  - 필수 키(예시):
    - `AWS_REGION=ap-northeast-2`
    - `DYNAMODB_ENDPOINT=http://dynamodb-local:8998`
    - `AWS_ACCESS_KEY_ID=dummy`, `AWS_SECRET_ACCESS_KEY=dummy`
    - `JWT_SECRET=TEST`
    - `S3_BUCKET_NAME=test-bucket`
    - `S3_PUBLIC_ENDPOINT=http://localhost:4566` (브라우저에서 업로드 시 사용)
    - `SQS_ENDPOINT=http://localstack:4566`
    - `SUMMARIZE_SQS_QUEUE_URL=http://localstack:4566/000000000000/echoai-summarize-queue`
    - `SUMMARIZE_ASYNC=true`
    - `SUMMARIZE_USE_MOCK=true` (로컬에서 실제 키 없이 동작하려면 true)

## 3) 서비스 기동
```bash
docker compose up -d --build localstack dynamodb-local dynamodb-init app ai-processor
```
- `app`: Next.js(포트 3000)
- `ai-processor`: SQS 폴링 워커 (로컬 러너)
- `localstack`: S3, SQS
- `dynamodb-local`: DynamoDB Local (관리 UI: `dynamodb-admin` 컨테이너, 포트 8999)

## 4) 동작 검증 체크리스트
1. LocalStack 리소스 확인
   - 큐 목록: `docker compose exec localstack awslocal sqs list-queues`
   - 큐 URL: `docker compose exec localstack awslocal sqs get-queue-url --queue-name echoai-summarize-queue`
   - 버킷 확인: `docker compose exec localstack awslocal s3 ls`
2. 워커 기동 로그 확인
   - `docker compose logs -f ai-processor`
   - 기대 로그: `Starting local runner. Queue: ...`, 처리 후 `Deleted X messages`
3. 업로드/요약 시나리오
   - 브라우저로 `http://localhost:3000` 접속 → 로그인/회원가입 → 문서 업로드
   - 문서 상세에서 “요약” 실행 → API는 202(queued) 반환
   - 잠시 후 상태가 `PROCESSING → COMPLETE`로 전환되고 `summaryText`가 채워짐

## 5) 실제 Gemini 호출로 전환(선택)
- `.env.local`에서 유효한 `GEMINI_API_KEY` 설정
- `SUMMARIZE_USE_MOCK=false`로 변경
- 컨테이너 재기동: `docker compose up -d --build ai-processor`
- 실패 시 워커 로그에서 에러 메시지(GoogleGenerativeAIFetchError 등) 확인

## 6) 트러블슈팅
- 큐 미존재/URL 불일치
  - 증상: `QueueDoesNotExist`
  - 조치: `.env.local`에서 컨테이너용 URL(`http://localstack:4566`) 사용, 워커 재기동
  - 참고: 코드가 로컬에서 큐 미존재 시 자동 생성 재시도를 수행함
- 동적 라우트 에러(Next.js)
  - 증상: `params should be awaited`
  - 조치: 관련 라우트는 `await context.params`로 수정되어 있음
- 모듈 해석 실패(@echo-ai/*)
  - 증상: `Cannot find package '@echo-ai/config'`
  - 조치: 컨테이너 엔트리포인트가 `pnpm install` 자동 수행, 그래도 실패 시 `docker compose up -d --build`
- 요약이 모의로만 동작함
  - 원인: `SUMMARIZE_USE_MOCK=true` 또는 키가 플레이스홀더
  - 실제 호출 필요 시 위 5) 항목 따라 전환

## 7) 보조 명령
```bash
# 큐 길이 모니터링
docker compose exec localstack awslocal sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/echoai-summarize-queue \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible

# DynamoDB Admin UI
# http://localhost:8999 에 접속하여 테이블과 아이템 확인
```

## 8) 산출물 기준(로컬 E2E 완료)
- 업로드 후 요약 트리거 시 큐에 메시지 적재되고, 워커가 소비하여 `COMPLETE` 상태와 `summaryText`가 기록됨
- 에러 시 `FAILED`로 반영되고 로그에서 원인 확인 가능

