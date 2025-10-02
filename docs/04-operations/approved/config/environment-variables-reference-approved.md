---
title: 런타임 환경 변수 정리
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 런타임 환경 변수 정리

본 문서는 로컬/스테이징/프로덕션에서 사용되는 주요 환경 변수와 의미를 정리합니다.

## 공통
- AWS_REGION: 기본 리전(예: ap-northeast-2)
- JWT_SECRET: 토큰 서명 키
- S3_BUCKET_NAME: 문서 보관 S3 버킷

## LocalStack/로컬 개발
- DYNAMODB_ENDPOINT: `http://dynamodb-local:8998`
- S3_PUBLIC_ENDPOINT: 브라우저 업로드 접근용(예: `http://localhost:4566`)
- S3_ENDPOINT/SQS_ENDPOINT: 컨테이너 내부에서 LocalStack 접근(예: `http://localstack:4566`)
- SUMMARIZE_SQS_QUEUE_URL: 요약 큐 URL
- SUMMARIZE_ASYNC: `true`면 비동기(SQS→Lambda) 경로 사용, `false`면 동기 경로 사용
- SUMMARIZE_USE_MOCK: `true`면 모의 요약 텍스트를 반환(실제 키 없이 로컬 검증용)

## 요약(Generative AI)
- GEMINI_API_KEY: Google Generative AI API 키
- SUMMARIZE_MODEL: 기본 `gemini-1.5-flash`(또는 `gemini-2.0-flash-lite` 등)
- SUMMARIZE_TIMEOUT_MS: 동기 요약 타임아웃(기본 30000)
- SUMMARIZE_MAX_CHARS: 입력 텍스트 최대 길이
- SUMMARIZE_MAX_OUTPUT_TOKENS: 출력 토큰 상한
- SUMMARIZE_PROMPT_TEMPLATE: 요약 프롬프트 템플릿
  - 예시:
  
  아래 문서 내용을 한국어로 간결하게 요약해 주세요.
  ---
  ${text}
  ---
  요약:

## 참고
- 로컬에서 비동기 경로를 권장합니다(SUMMARIZE_ASYNC=true). 동기 경로는 디버깅/데모용으로만 사용하세요.
- 모의 요약(SUMMARIZE_USE_MOCK=true)을 통해 실제 키 없이도 E2E를 검증할 수 있습니다.

