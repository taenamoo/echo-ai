# Echo AI 작업 완료·진행 현황

## 1. 인프라 및 개발 환경
- Docker Compose 스택이 Next.js 앱과 LocalStack S3, DynamoDB Local, DynamoDB Admin, 초기화 컨테이너를 묶어 로컬에서 AWS 시나리오를 재현합니다.【F:docker-compose.yml†L1-L86】
- DynamoDB·S3 초기화 스크립트가 테이블 생성, 버킷 생성, CORS 설정을 자동화해 컨테이너 기동 즉시 개발 환경이 준비됩니다.【F:setting/bash/dynamodb-init.sh†L1-L84】【F:setting/bash/localstack-init-s3.sh†L1-L27】
- 공통 설정 로더가 필수 환경변수, 리전, 엔드포인트, 큐 URL, 해시 솔트를 중앙에서 검증·캐싱합니다.【F:packages/@echo-ai/config/src/index.ts†L1-L74】

## 2. 공용 패키지 & 도메인 모듈
- AWS 클라이언트 래퍼가 로컬/배포 환경에 맞춰 S3, DynamoDB, SQS 설정을 자동 전환합니다.【F:packages/@echo-ai/aws-clients/src/s3.ts†L1-L35】【F:packages/@echo-ai/aws-clients/src/dynamodb.ts†L1-L25】【F:packages/@echo-ai/aws-clients/src/sqs.ts†L1-L20】
- 인증 모듈이 JWT 발급·검증과 비밀번호 해싱/정책 검사를 제공해 서버와 클라이언트가 동일 규칙을 공유합니다.【F:packages/@echo-ai/auth/src/token.ts†L1-L46】【F:packages/@echo-ai/auth/src/password.ts†L1-L31】
- 문서 도메인 모듈이 SQS 요약 큐 메시지 작성과 스트림/버퍼 텍스트 추출(특정 pdf.js 경고 필터링 포함)을 담당하며, 데이터 모델 타입을 정의합니다.【F:packages/@echo-ai/documents/src/queue.ts†L1-L33】【F:packages/@echo-ai/documents/src/text-extract.ts†L1-L61】【F:packages/@echo-ai/core-domain/src/documents.ts†L1-L21】

## 3. 백엔드 API (Next.js App Router)
### 인증 및 사용자
- `POST /api/auth/login`은 EmailIndex로 사용자 조회 후 bcrypt 비교와 1시간 만료 토큰 발급을 처리합니다.【F:apps/web/src/app/api/auth/login/route.ts†L1-L67】
- `POST /api/auth/signup`은 비밀번호 정책 검증, 중복 이메일 검사, 사용자 프로필 저장, 토큰 반환을 수행합니다.【F:apps/web/src/app/api/auth/signup/route.ts†L1-L78】
- `requireAuth` 헬퍼가 표준화된 401 메시지와 토큰 상태를 공통 제공하며 `/api/me`는 사용자 프로필을 조회합니다.【F:apps/web/src/lib/api/auth.ts†L1-L46】【F:apps/web/src/app/api/me/route.ts†L1-L31】

### 문서 관리
- `POST /api/documents`는 프리사인 업로드 메타 저장과 레거시 멀티파트 업로드를 모두 지원하고, `GET /api/documents`는 검색어·정렬·커서 기반 페이지네이션을 제공합니다.【F:apps/web/src/app/api/documents/route.ts†L1-L255】
- `POST /api/documents/presign`이 파일명·형식·용량을 검증한 뒤 브라우저 호환 S3 pre-signed POST 정보를 발급합니다.【F:apps/web/src/app/api/documents/presign/route.ts†L1-L107】
- `GET/DELETE /api/documents/[documentId]`가 소유자 검증 후 DynamoDB와 S3 객체를 일관 삭제합니다.【F:apps/web/src/app/api/documents/[documentId]/route.ts†L1-L101】
- `POST /api/documents/[documentId]/summarize`는 요약 상태 업데이트, S3 텍스트 추출, Gemini 호출, SQS 비동기 큐잉 옵션을 포함합니다.【F:apps/web/src/app/api/documents/[documentId]/summarize/route.ts†L1-L165】

### 스터디 기능
- `GET/POST /api/study`는 사용자별 스터디 노트를 계층 구조로 정렬·생성합니다.【F:apps/web/src/app/api/study/route.ts†L1-L165】
- `PUT/DELETE /api/study/[id]`는 하위 노트 일괄 삭제와 수정 시 원본 병합을 처리합니다.【F:apps/web/src/app/api/study/[id]/route.ts†L1-L132】
- `POST /api/study/analyze`가 Gemini를 활용해 내용·예시 기반 추가 의견을 생성하며, `POST /api/study/search`는 RAG 패턴으로 노트 전수 검색 답변을 제공합니다.【F:apps/web/src/app/api/study/analyze/route.ts†L1-L117】【F:apps/web/src/app/api/study/search/route.ts†L1-L122】
- `POST /api/study/quiz`가 JSON 모드 Gemini 호출로 객관식 퀴즈를 생성합니다.【F:apps/web/src/app/api/study/quiz/route.ts†L1-L103】

## 4. 프런트엔드 구현
### 공통 인프라
- Axios 인스턴스가 표준 401 메시지에 맞춰 토큰 삭제·로그인 리다이렉트·이벤트를 발행합니다.【F:apps/web/src/lib/axios.ts†L1-L35】
- UserContext는 세션 저장소 캐시와 `/api/me` 호출을 관리하고, ToastProvider/헤더/세션 리스너가 레이아웃 전역 알림·인증 상태 동기화를 제공합니다.【F:apps/web/src/lib/auth/UserContext.tsx†L1-L64】【F:apps/web/src/lib/ui/ToastProvider.tsx†L1-L55】【F:apps/web/src/app/components/HeaderBar.tsx†L1-L71】【F:apps/web/src/app/components/SessionExpiredListener.tsx†L1-L33】【F:apps/web/src/app/layout.tsx†L1-L72】

### 인증 화면
- 로그인·회원가입 페이지는 만료 배너, 입력 검증, 토큰 저장 및 라우팅을 처리하며 로그아웃 페이지가 토큰·컨텍스트 정리와 알림을 수행합니다.【F:apps/web/src/app/auth/login/page.tsx†L1-L103】【F:apps/web/src/app/auth/signup/page.tsx†L1-L103】【F:apps/web/src/app/auth/logout/page.tsx†L1-L28】

### 문서 화면
- 문서 목록 페이지가 토큰 검증, 프리사인 업로드→S3 전송→메타 저장, 드래그 앤 드롭, 업로드 진행률, 검색·정렬·커서 페이지네이션, 요약 요청/폴링, 삭제 토스트를 제공하며 상태 배지와 날짜/용량 포맷터를 활용합니다.【F:apps/web/src/app/documents/page.tsx†L1-L600】【F:apps/web/src/app/documents/components/StatusBadge.tsx†L1-L13】【F:apps/web/src/lib/ui/format.ts†L1-L19】
- 문서 상세 페이지는 단건 조회, 요약 큐잉·폴링, 삭제, 요약 결과 표시를 담당합니다.【F:apps/web/src/app/documents/[id]/page.tsx†L1-L159】

### 스터디 화면
- AiSearchButton이 드래그 가능한 플로팅 버튼과 대화형 AI 검색 모달을 제공하고 `/api/study/search`와 연동합니다.【F:apps/web/src/app/study/page.tsx†L1-L220】
- StudyForm은 생성/수정 폼, 참고 링크 관리, 저장 후 하위 노트에 대한 AI 분석 호출을 수행하며, 페이지 루트는 스터디 트리 로딩·정렬·선택·삭제·퀴즈 생성 로직을 포함합니다.【F:apps/web/src/app/study/page.tsx†L249-L519】

### 랜딩 및 기타 UI
- 홈 랜딩 페이지가 서비스 소개와 주요 이동 경로를 제공하고 레이아웃과 조화를 이룹니다.【F:apps/web/src/app/page.tsx†L1-L24】

## 5. AI 연동 기능 요약
- 문서 요약 라우트가 Gemini 모델과 타임아웃·토큰 제한을 설정해 동기/비동기 요약을 지원하고, 실패 시 상태를 롤백합니다.【F:apps/web/src/app/api/documents/[documentId]/summarize/route.ts†L1-L165】
- 스터디 분석·검색·퀴즈 라우트는 각각 코드 리뷰 피드백, RAG 응답, JSON 모드 객관식 생성으로 학습 경험을 강화합니다.【F:apps/web/src/app/api/study/analyze/route.ts†L1-L117】【F:apps/web/src/app/api/study/search/route.ts†L1-L122】【F:apps/web/src/app/api/study/quiz/route.ts†L1-L103】
- PDF 텍스트 추출 유틸이 pdf.js 경고를 필터링하고 스트림/브라우저 응답을 유연히 버퍼로 변환합니다.【F:packages/@echo-ai/documents/src/text-extract.ts†L1-L61】

## 6. 서버리스 전환 준비 상태
- `services/ai-processor`와 `services/api` 프로젝트가 Lambda 마이그레이션용 플레이스홀더로 포함되어 후속 작업 범위를 문서화하고 있습니다.【F:services/ai-processor/src/handler.ts†L1-L12】【F:services/api/src/index.ts†L1-L10】

