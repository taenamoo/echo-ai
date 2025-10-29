# 백엔드 및 API 설계

## 서비스 계층 구조
- 백엔드 비즈니스 로직은 `packages/@echo-ai/api-core`에 정의된 공통 핸들러가 담당하고, Lambda 어댑터는 API Gateway 이벤트를 이 표준 요청 객체로 변환합니다.【F:packages/@echo-ai/api-core/src/auth.ts†L1-L110】【F:services/api/src/lambda/auth.ts†L1-L36】
- AWS 클라이언트 생성기(`@echo-ai/aws-clients`)가 DynamoDB, S3, SQS, Secrets Manager 인스턴스를 공통 설정(스테이지 접미사, 로컬 엔드포인트 포함)으로 제공해 멀티 환경 지원을 단순화합니다.【F:packages/@echo-ai/aws-clients/src/dynamodb.ts†L1-L46】【F:packages/@echo-ai/aws-clients/src/s3.ts†L1-L32】【F:packages/@echo-ai/config/src/index.ts†L1-L76】
- `services/ai-processor`는 SQS 컨슈머로 동작하며, 문서 요약 메시지를 처리하는 별도 Lambda로 분리되어 확장성과 장애 격리를 확보합니다.【F:services/ai-processor/src/handler.ts†L1-L187】

## 주요 API 엔드포인트 설계
- **인증**: `POST /auth/signup`, `POST /auth/login`, `GET /me`는 가입·로그인·프로필 조회를 제공하며, DynamoDB `EchoAI-Accounts` 테이블을 사용합니다.【F:infra/lib/api-stack.ts†L120-L214】【F:packages/@echo-ai/api-core/src/auth.ts†L11-L110】
- **문서 관리**: `POST /documents`(메타 저장), `GET /documents`, `GET /documents/{id}`, `DELETE /documents/{id}`, `POST /documents/{id}/summarize`, `POST /documents/presign`을 통해 업로드와 요약 요청을 다룹니다.【F:infra/lib/api-stack.ts†L214-L294】【F:packages/@echo-ai/api-core/src/documents.ts†L1-L259】
- **스터디 도구**: `GET /study`, `POST /study`, `PUT /study/{id}`, `DELETE /study/{id}`, `POST /study/quiz`, `POST /study/search`, `POST /study/analyze`를 제공해 노트 관리와 AI 기반 분석을 실행합니다.【F:infra/lib/api-stack.ts†L294-L353】【F:services/api/src/lambda/study.ts†L1-L200】
- **HR/챗봇**: `GET /hr-documents`와 `POST /chatHr`가 HR 문서 전용 목록 및 대화 기능을 담당합니다.【F:infra/lib/api-stack.ts†L267-L293】

## 인증/인가 및 보안 전략
- JWT는 Secrets Manager에서 주입된 `JWT_SECRET`으로 서명·검증하며, 토큰 만료·위변조를 정확히 감지해 401 응답을 표준화합니다.【F:packages/@echo-ai/auth/src/token.ts†L1-L46】【F:packages/@echo-ai/api-core/src/auth.ts†L70-L110】
- 비밀번호는 bcrypt로 해시되고, 길이/공백/문자 조합을 검사하는 정책을 준수해야 가입이 허용됩니다.【F:packages/@echo-ai/auth/src/password.ts†L1-L33】
- 모든 문서 관련 요청은 인증 헤더가 없으면 미들웨어와 서버 핸들러에서 즉시 거부되며, 프리사인드는 사용자별 S3 키 네임스페이스(`uploads/{userId}/{documentId}`)를 검증하여 데이터 격리를 보장합니다.【F:middleware.ts†L1-L18】【F:packages/@echo-ai/api-core/src/documents.ts†L49-L118】
- Secrets Manager는 IaC에서 자동으로 생성되어 Lambda가 읽을 수 있도록 권한을 부여하며, 큐/버킷/테이블 권한도 함수별 최소 권한으로 설정됩니다.【F:infra/lib/api-stack.ts†L120-L366】
