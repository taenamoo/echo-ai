---
title: Echo AI 작업 완료·진행 현황
domain: records
status: approved
owner: records@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# Echo AI 작업 완료·진행 현황

## 1. 인프라 및 개발 환경
- Docker Compose 스택이 SPA와 LocalStack S3, DynamoDB Local, DynamoDB Admin, 초기화 컨테이너를 묶어 로컬에서 AWS 시나리오를 재현합니다.【F:docker-compose.yml†L1-L86】
- DynamoDB·S3 초기화 스크립트가 테이블 생성, 버킷 생성, CORS 설정을 자동화해 컨테이너 기동 즉시 개발 환경이 준비됩니다.【F:setting/bash/dynamodb-init.sh†L1-L84】【F:setting/bash/localstack-init-s3.sh†L1-L27】
- 공통 설정 로더가 필수 환경변수, 리전, 엔드포인트, 큐 URL, 해시 솔트를 중앙에서 검증·캐싱합니다.【F:packages/@echo-ai/config/src/index.ts†L1-L74】

## 2. 공용 패키지 & 도메인 모듈
- AWS 클라이언트 래퍼가 로컬/배포 환경에 맞춰 S3, DynamoDB, SQS 설정을 자동 전환합니다.【F:packages/@echo-ai/aws-clients/src/s3.ts†L1-L35】【F:packages/@echo-ai/aws-clients/src/dynamodb.ts†L1-L25】【F:packages/@echo-ai/aws-clients/src/sqs.ts†L1-L20】
- 인증 모듈이 JWT 발급·검증과 비밀번호 해싱/정책 검사를 제공해 서버와 클라이언트가 동일 규칙을 공유합니다.【F:packages/@echo-ai/auth/src/token.ts†L1-L46】【F:packages/@echo-ai/auth/src/password.ts†L1-L31】
- 문서 도메인 모듈이 SQS 요약 큐 메시지 작성과 스트림/버퍼 텍스트 추출(특정 pdf.js 경고 필터링 포함)을 담당하며, 데이터 모델 타입을 정의합니다.【F:packages/@echo-ai/documents/src/queue.ts†L1-L33】【F:packages/@echo-ai/documents/src/text-extract.ts†L1-L61】【F:packages/@echo-ai/core-domain/src/documents.ts†L1-L21】

## 3. 백엔드 API (Lambda + 공유 핸들러)
### 인증 및 사용자
- 로그인과 회원가입 핸들러가 비밀번호 정책 검증, DynamoDB EmailIndex 조회, bcrypt 비교, 1시간 만료 토큰 발급을 수행합니다.【F:packages/@echo-ai/api-core/src/auth.ts†L1-L104】
- `/me` 조회는 토큰을 검증하고 사용자 프로필을 반환하며, Lambda 어댑터가 API Gateway 이벤트를 공유 핸들러로 전달합니다.【F:packages/@echo-ai/api-core/src/auth.ts†L106-L152】【F:services/api/src/lambda/auth.ts†L1-L43】

### 문서 관리
- 문서 생성/목록/상세/삭제/요약 핸들러가 Presign 업로드 메타 저장, 정렬·검색 페이지네이션, 권한 검증, 요약 큐잉과 Gemini 호출을 처리합니다.【F:packages/@echo-ai/api-core/src/documents.ts†L1-L248】【F:packages/@echo-ai/api-core/src/documents.ts†L249-L398】
- 프리사인 발급 로직이 파일명·형식·용량 검증 후 브라우저 호환 POST 정책을 반환합니다.【F:packages/@echo-ai/api-core/src/presign.ts†L1-L143】
- Lambda 어댑터는 REST 경로별로 공유 문서 핸들러를 연결해 API Gateway 이벤트를 HTTP 응답으로 변환합니다.【F:services/api/src/lambda/documents.ts†L1-L129】

### 스터디 기능
- 스터디 노트 CRUD와 하위 노트 일괄 삭제, 계층 정렬, AI 분석/검색/퀴즈 엔드포인트가 Lambda 함수로 제공됩니다.【F:services/api/src/lambda/study.ts†L1-L230】

## 4. 프런트엔드 구현
### 공통 인프라
- SPA API 클라이언트가 표준 401 메시지에 맞춰 토큰 삭제·로그인 리다이렉트·이벤트를 발행합니다.【F:apps/spa/src/api.ts†L1-L71】
- UserProvider는 세션 저장소 캐시와 `/me` 호출을 관리하고, ToastProvider/헤더/세션 리스너가 전역 알림·인증 상태 동기화를 제공합니다.【F:apps/spa/src/providers/UserProvider.tsx†L1-L64】【F:apps/spa/src/providers/ToastProvider.tsx†L1-L55】【F:apps/spa/src/components/Header.tsx†L1-L80】【F:apps/spa/src/components/SessionExpiredListener.tsx†L1-L28】【F:apps/spa/src/main.tsx†L1-L20】

### 인증 화면
- 로그인·회원가입 페이지는 만료 배너, 입력 검증, 토큰 저장 및 라우팅을 처리하며 로그아웃 페이지가 토큰·컨텍스트 정리와 알림을 수행합니다.【F:apps/spa/src/routes/Login.tsx†L1-L150】【F:apps/spa/src/routes/Signup.tsx†L1-L158】【F:apps/spa/src/routes/Logout.tsx†L1-L48】

### 문서 화면
- 문서 목록 페이지가 토큰 검증, 프리사인 업로드→S3 전송→메타 저장, 드래그 앤 드롭, 업로드 진행률, 검색·정렬·커서 페이지네이션, 요약 요청/폴링, 삭제 토스트를 제공하며 상태 배지와 날짜/용량 포맷터를 활용합니다.【F:apps/spa/src/routes/Documents.tsx†L1-L260】【F:apps/spa/src/lib/format.ts†L1-L18】
- 문서 상세 페이지는 단건 조회, 요약 큐잉·폴링, 삭제, 요약 결과 표시를 담당합니다.【F:apps/spa/src/routes/DocumentDetail.tsx†L1-L208】

### 스터디 화면
- Study 페이지가 드래그 가능한 플로팅 검색 버튼과 대화형 AI 검색 모달을 제공하고 `/study/search` Lambda와 연동합니다.【F:apps/spa/src/routes/Study.tsx†L1-L200】

### 랜딩 및 기타 UI
- 홈 랜딩 페이지가 서비스 소개와 주요 이동 경로를 제공하고 레이아웃과 조화를 이룹니다.【F:apps/spa/src/routes/Home.tsx†L1-L84】

## 5. AI 연동 기능 요약
- 문서 요약 핸들러가 Gemini 모델과 타임아웃·토큰 제한을 설정해 동기/비동기 요약을 지원하고, 실패 시 상태를 롤백합니다.【F:packages/@echo-ai/api-core/src/documents.ts†L249-L398】
- 스터디 분석·검색·퀴즈 Lambda가 코드 리뷰 피드백, RAG 응답, JSON 모드 객관식 생성을 처리합니다.【F:services/api/src/lambda/study.ts†L136-L230】
- PDF 텍스트 추출 유틸이 pdf.js 경고를 필터링하고 스트림/브라우저 응답을 유연히 버퍼로 변환합니다.【F:packages/@echo-ai/documents/src/text-extract.ts†L1-L61】

## 6. 서버리스 전환 준비 상태
- `services/ai-processor`와 `services/api` 프로젝트가 Lambda 마이그레이션용 플레이스홀더로 포함되어 후속 작업 범위를 문서화하고 있습니다.【F:services/ai-processor/src/handler.ts†L1-L12】【F:services/api/src/index.ts†L1-L10】

