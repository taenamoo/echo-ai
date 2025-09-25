# Echo AI 작업 현황 총정리

## 1. 모노레포 구조와 개발 환경
- pnpm 워크스페이스로 `apps/`, `services/`, `packages/`, `infra/`를 하나의 리포지토리에서 관리하며, 앱·백엔드·공유 패키지를 모듈화했습니다.【F:pnpm-workspace.yaml†L1-L4】
- 루트 `package.json`이 Next.js 웹앱 실행, DynamoDB 마이그레이션, PDF 도구, 테스트 등을 위한 스크립트를 정리해 개발 흐름을 통일합니다.【F:package.json†L5-L49】
- `scripts/` 디렉터리가 로컬 편의, 마이그레이션, 수동 테스트 스크립트를 구분해 관리하도록 안내합니다.【F:scripts/README.md†L1-L9】
- Docker Compose 스택이 Next.js 앱, LocalStack S3, DynamoDB Local, DynamoDB Admin, 초기화 컨테이너를 묶어 로컬에서 AWS 시나리오를 재현합니다.【F:docker-compose.yml†L1-L90】
- DynamoDB·S3 초기화 스크립트가 테이블 생성과 버킷/CORS 구성을 자동화해 컨테이너 기동 즉시 개발 환경을 완성합니다.【F:setting/bash/dynamodb-init.sh†L1-L84】【F:setting/bash/localstack-init-s3.sh†L1-L27】

## 2. 공통 설정과 공유 패키지
- `@echo-ai/config`가 환경 변수 검증, 스테이지 분기, AWS 엔드포인트/큐 URL/해시 솔트 캐싱을 담당해 모든 런타임에서 일관된 설정을 제공합니다.【F:packages/@echo-ai/config/src/index.ts†L1-L74】
- `@echo-ai/aws-clients`는 S3·DynamoDB·SQS 클라이언트를 로컬/배포 환경에 맞춰 자동 구성하고 테이블 이름 상수를 노출합니다.【F:packages/@echo-ai/aws-clients/src/s3.ts†L1-L35】【F:packages/@echo-ai/aws-clients/src/dynamodb.ts†L1-L25】【F:packages/@echo-ai/aws-clients/src/sqs.ts†L1-L20】
- `@echo-ai/auth`가 JWT 발급/검증과 비밀번호 해싱·정책 검사를 제공해 서버와 클라이언트의 인증 규칙을 통합합니다.【F:packages/@echo-ai/auth/src/token.ts†L1-L46】【F:packages/@echo-ai/auth/src/password.ts†L1-L31】
- `@echo-ai/documents`는 문서 도메인 타입, SQS 요약 큐 메시지 전송, 스트림/웹 응답 버퍼링, PDF 경고 필터링을 포함한 텍스트 추출 유틸을 제공합니다.【F:packages/@echo-ai/documents/src/queue.ts†L1-L33】【F:packages/@echo-ai/documents/src/text-extract.ts†L1-L61】【F:packages/@echo-ai/core-domain/src/documents.ts†L1-L21】

## 3. 백엔드 API 및 미들웨어
- 인증 라우트가 이메일 인덱스로 사용자 조회 후 bcrypt 비교·JWT 발급을 수행하고, 비밀번호 정책 검증·중복 검사·프로필 저장까지 포함한 회원가입을 제공합니다.【F:apps/web/src/app/api/auth/login/route.ts†L1-L67】【F:apps/web/src/app/api/auth/signup/route.ts†L1-L78】
- 공통 `requireAuth` 헬퍼와 `/api/me` 라우트가 토큰 상태별 표준 오류 메시지, 사용자 ID 추출, 프로필 조회를 담당합니다.【F:apps/web/src/lib/api/auth.ts†L1-L46】【F:apps/web/src/app/api/me/route.ts†L1-L31】
- 문서 API는 프리사인 업로드 메타 저장·레거시 멀티파트 업로드, 검색·정렬·커서 페이지네이션, 소유권 검증 후 단건 조회/삭제, S3 텍스트 추출과 Gemini 요약 및 SQS 비동기 큐잉까지 포괄합니다.【F:apps/web/src/app/api/documents/route.ts†L1-L255】【F:apps/web/src/app/api/documents/presign/route.ts†L1-L107】【F:apps/web/src/app/api/documents/[documentId]/route.ts†L1-L101】【F:apps/web/src/app/api/documents/[documentId]/summarize/route.ts†L1-L165】
- 스터디 API는 계층 구조 조회·생성, 수정 시 원본 병합과 자식 일괄 삭제, Gemini 기반 분석·검색(RAG)·JSON 모드 퀴즈 생성을 제공해 학습 기능을 뒷받침합니다.【F:apps/web/src/app/api/study/route.ts†L1-L165】【F:apps/web/src/app/api/study/[id]/route.ts†L1-L132】【F:apps/web/src/app/api/study/analyze/route.ts†L1-L117】【F:apps/web/src/app/api/study/search/route.ts†L1-L122】【F:apps/web/src/app/api/study/quiz/route.ts†L1-L103】
- Next.js 미들웨어가 `/api/documents` 하위 경로에 대한 Authorization 헤더 존재 여부를 사전 차단해 라우트 로직 실행 전에 401을 반환합니다.【F:apps/web/middleware.ts†L1-L21】

## 4. 프런트엔드 애플리케이션
- Axios 인스턴스가 401 응답에 따라 토큰 제거·세션 만료 이벤트·로그인 리다이렉트를 수행하고, UserContext가 `/api/me` 결과를 세션 스토리지와 동기화합니다.【F:apps/web/src/lib/axios.ts†L1-L35】【F:apps/web/src/lib/auth/UserContext.tsx†L1-L64】
- ToastProvider, 헤더, 세션 만료 리스너, 루트 레이아웃이 전역 알림·탭 간 인증 상태 동기화·접근성 있는 알림 UI를 구성합니다.【F:apps/web/src/lib/ui/ToastProvider.tsx†L1-L55】【F:apps/web/src/app/components/HeaderBar.tsx†L1-L71】【F:apps/web/src/app/components/SessionExpiredListener.tsx†L1-L33】【F:apps/web/src/app/layout.tsx†L1-L73】
- 로그인/회원가입 화면은 토큰 중복 로그인 차단, 비밀번호 정책 안내, 오류 배너, 성공 시 리디렉션을 처리하고 로그아웃 페이지가 토큰/컨텍스트 정리 후 알림을 제공합니다.【F:apps/web/src/app/auth/login/page.tsx†L1-L103】【F:apps/web/src/app/auth/signup/page.tsx†L1-L103】【F:apps/web/src/app/auth/logout/page.tsx†L1-L28】
- 문서 목록 화면이 프리사인→S3 업로드→메타 저장 파이프라인, 드래그 앤 드롭, 진행률 표시, 검색·정렬·커서 페이지네이션, 요약 요청/폴링, 삭제 토스트를 구현하고 상태 배지·포맷터로 정보를 정리합니다.【F:apps/web/src/app/documents/page.tsx†L1-L544】【F:apps/web/src/app/documents/components/StatusBadge.tsx†L1-L13】【F:apps/web/src/lib/ui/format.ts†L1-L20】
- 문서 상세 페이지는 단건 조회, 비동기 요약 큐잉/폴링, 삭제, 요약 결과 프리뷰와 오류 토스트를 처리합니다.【F:apps/web/src/app/documents/[id]/page.tsx†L1-L159】
- 스터디 페이지는 플로팅 AI 검색 버튼·드래그 이동·대화형 모달, 트리 구조 정렬/선택/삭제, 참고 링크와 AI 분석이 포함된 노트 작성 폼, Gemini 기반 퀴즈 모달을 포함한 학습 워크플로우를 제공합니다.【F:apps/web/src/app/study/page.tsx†L55-L835】
- 학습 로드맵, 코드 연습장, 독립형 AI 퀴즈, React 문서 모달이 탭 전환으로 제공돼 개념 학습과 실습·복습까지 이어집니다.【F:apps/web/src/app/study/learningRoadmap.tsx†L1-L196】【F:apps/web/src/app/study/codePlayground.tsx†L1-L60】【F:apps/web/src/app/study/aiQuiz.tsx†L1-L271】【F:apps/web/src/app/study/conceptModal.tsx†L1-L81】
- 랜딩 페이지가 서비스 소개와 주요 이동 경로를 노출해 인증/기능 화면과 자연스럽게 연결됩니다.【F:apps/web/src/app/page.tsx†L1-L24】

## 5. AI 및 데이터 처리 특징
- 문서 요약 라우트가 S3 객체를 버퍼로 변환한 뒤 Gemini 호출, 타임아웃/최대 문자수 제어, 실패 시 상태 롤백 및 SQS 비동기 옵션을 지원합니다.【F:apps/web/src/app/api/documents/[documentId]/summarize/route.ts†L1-L165】
- 스터디 분석·검색·퀴즈 API가 코드 리뷰 피드백, RAG 검색 응답, JSON 모드 객관식 생성을 통해 학습 경험을 강화합니다.【F:apps/web/src/app/api/study/analyze/route.ts†L1-L117】【F:apps/web/src/app/api/study/search/route.ts†L1-L122】【F:apps/web/src/app/api/study/quiz/route.ts†L1-L103】
- 텍스트 추출 유틸이 Node 스트림과 브라우저 ReadableStream을 모두 처리하고, PDF 경고 억제·버퍼 변환을 제공해 요약 파이프라인을 안정화합니다.【F:packages/@echo-ai/documents/src/text-extract.ts†L1-L61】

## 6. 서버리스 전환 및 인프라 준비
- `services/ai-processor`와 `services/api`가 Lambda 마이그레이션 범위를 설명하는 플레이스홀더로 포함돼 후속 작업의 책임을 명시합니다.【F:services/ai-processor/src/handler.ts†L1-L12】【F:services/api/src/index.ts†L1-L10】
- `infra/cdk`와 `infra/pipelines` 문서가 AWS 스택 정의, CI/CD 파이프라인, 배포 후 검증 TODO를 정리해 서버리스 전환 로드맵을 남겨두었습니다.【F:infra/cdk/README.md†L1-L8】【F:infra/pipelines/README.md†L1-L8】
