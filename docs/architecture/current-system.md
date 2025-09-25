# 현행 시스템 아키텍처 개요

## 1. 배포 및 실행 환경
- **런타임**: Next.js 15 기반 모놀리식 애플리케이션으로, UI 페이지와 API Route Handler를 단일 프로세스에서 제공한다.
- **호스팅**: 로컬 개발은 Docker Compose로, 운영 환경은 단일 Node.js 프로세스로 Next.js 서버를 실행한다고 가정한다.
- **소스 구조**: `apps/web`이 Next.js 앱을 포함하고, 공통 도메인 로직은 `packages/@echo-ai/*` 워크스페이스에 분산돼 있다.

## 2. 애플리케이션 구성 요소
| 계층 | 주요 역할 | 핵심 자산 |
| --- | --- | --- |
| 프레젠테이션(App Router) | 인증 화면, 문서 업로드/목록/상세 흐름, 학습 도구 제공 | `apps/web/src/app/**` 라우트와 컴포넌트 |
| API Route Handler | 인증, 문서 CRUD, 요약 트리거 처리. AWS SDK와 Gemini 요약 호출을 직접 오케스트레이션 | `apps/web/src/app/api/**` 핸들러 |
| 도메인 패키지 | 인증(JWT·비밀번호 해시), 문서 처리(텍스트 추출·요약 작업 큐잉), 설정, AWS 클라이언트 팩토리 | `packages/@echo-ai/auth`, `config`, `documents`, `aws-clients`, `core-domain` |
| 비동기 워커 스텁 | 향후 Lambda/SQS 워커 및 API Gateway 핸들러를 위한 자리표시자 | `services/ai-processor`, `services/api` |

## 3. 외부 연동
- **데이터 저장소**: `packages/@echo-ai/aws-clients`에서 생성한 `@aws-sdk/lib-dynamodb` DocumentClient로 DynamoDB 테이블 `EchoAI-Main-Table`을 사용한다.
- **파일 스토리지**: S3 버킷을 활용하며, 프리사인드 URL 또는 `PutObjectCommand`로 문서를 업로드한다.
- **AI 요약**: Google Gemini SDK를 Next.js API 라우트에서 동기 호출(기본 타임아웃 45초)하며, 환경 변수로 설정값을 관리한다.
- **인증**: `@echo-ai/auth` 헬퍼를 통해 JWT 발급/검증과 bcrypt 비밀번호 해시를 수행한다.
- **구성 및 비밀**: `packages/@echo-ai/config`가 환경 변수를 로드하며, AWS Secrets Manager 연동은 아직 적용되지 않았다.

## 4. 데이터 및 요청 흐름
1. 사용자가 Next.js 페이지에서 인증하고 `api/auth/*` 라우트가 회원가입/로그인/토큰 관리를 처리한다.
2. 문서 업로드 UI는 여러 파일 형식(.txt, .md, .pdf, 이미지 등)을 허용하며 `api/documents`로 메타데이터를 전송한다.
3. API 라우트는 DynamoDB에 메타데이터를 저장하고 S3에 원문을 업로드한 뒤, 기본적으로 동기 방식으로 Gemini 요약을 호출한다.
4. 요약 결과는 DynamoDB에 저장되며 문서 목록/상세 라우트를 통해 사용자에게 노출된다.
5. SQS 기반 비동기 처리를 위한 헬퍼가 존재하지만 현재는 비활성화 상태(`SUMMARIZE_ASYNC=false`).

## 5. 배포 및 운영 현황
- **버전 관리**: pnpm 워크스페이스 기반 모노레포로, 브랜치 전략은 코드에 명시돼 있지 않다.
- **CI/CD**: GitHub Actions 자동화를 계획하고 있으나 아직 구현되지 않았으며, 배포는 수동/로컬 중심이다.
- **IaC**: CloudFormation/CDK 스캐폴딩 디렉터리가 존재하지만 실행 가능한 스택 템플릿은 마련되지 않았다.
- **모니터링/로깅**: 기본 Next.js 로깅에 의존하며 CloudWatch 연동은 설정돼 있지 않다.

## 6. 확인된 격차 및 리스크
- 업로드 허용 확장자와 요약 SLA(45초 타임아웃 vs 요구사항 30초) 간 불일치가 존재한다.
- 비밀 관리가 `.env` 파일에 의존하여 AWS Secrets Manager 요구사항을 충족하지 못한다.
- DynamoDB 정렬키 패턴(`PROFILE#<id>`)이 문서에 정의된 스키마(`PROFILE`)와 다르다.
- 프로덕션 수준의 비동기 처리 경로가 없어 SQS/Lambda 스텁이 미사용 상태다.
- UI만 변경될 때 CloudFront/S3로 빠르게 배포하는 절차가 정의되지 않아 전체 스택 재배포에 의존한다.
