# 현행 시스템 → 목표 아키텍처 전환 작업 계획서

## 1. 배경 및 목표
- **배경**: `docs/architecture/current-system.md`에서 정의된 Next.js 모놀리식 구조는 동기식 Gemini 요약, .env 기반 비밀 관리 등 여러 제약을 갖고 있다.
- **목표**: `docs/architecture/todo-system.md`에 정의된 AWS 서버리스 기반 구조로 이전하여 자동화된 배포, 비동기 요약 처리, Secrets Manager 연동을 달성한다.

## 2. 전환 범위
1. 애플리케이션 계층을 Lambda/API Gateway 기반으로 재구성한다.
2. 비동기 요약 워크플로(SQS + `services/ai-processor`)를 활성화한다.
3. UI 정적 배포 파이프라인을 S3/CloudFront로 분리한다.
4. CloudFormation(또는 CDK) 스택을 작성하여 인프라를 코드화한다.
5. GitHub Actions CI/CD 파이프라인을 구축하여 브랜치별 자동 배포를 구성한다.

## 3. 추진 전략 및 단계
본 섹션은 우선순위를 반영하여 2단계부터 재정의했다. 1단계는 완료됨(문서화 및 의사결정 반영 진행).

### 단계 1. 설계 정교화 및 준비 (완료)
- 결과물: [`docs/architecture/step-01-prep-decisions.md`](./step-01-prep-decisions.md), [`docs/architecture/iac-guidelines.md`](./iac-guidelines.md)

### 단계 2. 비동기 요약 경로 로컬 E2E 활성화 (우선순위 1, 1~1.5주)
- 목표: SUMMARIZE_ASYNC를 기본 활성화하고, 로컬 환경에서 업로드 → 큐 → 워커 → 요약 저장까지 E2E 동작.
- 작업
  - `services/ai-processor` SQS 컨슈머 구현: S3에서 문서 로드 → 텍스트 추출 → Gemini 요약 → DynamoDB 상태/결과 업데이트.
  - `docker-compose.yml` LocalStack에 SQS 서비스 추가 및 큐 초기화 스크립트 작성. `SUMMARIZE_SQS_QUEUE_URL` 주입.
  - `packages/@echo-ai/config`에 SQS URL/엔드포인트/타임아웃 등 설정 키 보완. 로컬 기본값 정의.
  - `apps/web` 요약 트리거 라우트는 기본적으로 202(queued) 반환하도록 플래그 기본값 전환(`SUMMARIZE_ASYNC=true`).
  - 파일 형식·크기 정책을 1단계 결정과 일치하도록 presign·서버 검증 동기화(.txt/.md/.pdf/.docs, 25MB).
- 산출물/수용 기준
  - 업로드 후 약 20초 내 대부분의 샘플 문서가 요약 완료 상태로 전환(p95 목표는 이후 단계에서 보완).
  - 로컬에서 큐 길이, 워커 로그로 처리 확인 가능.
  - 문서: 로컬 실행 가이드 업데이트 및 트러블슈팅 항목.

### 단계 3. API 기능 Lambda 추출 및 동등성 확보 (우선순위 2, 2~3주)
- 목표: Next.js API Route와 동등 기능을 `services/api` Lambda로 제공하고, 단일 소스 구현(Shared Handler)로 정합성을 보장.
- 작업
  - Lambda 핸들러 구현(진행): auth(signup/login/me), documents(create/list/get/delete/summarize), presign(createPresign).
  - 동작 정합성 보완
    - summarize: 큐잉 전 PROCESSING 업데이트, 큐잉 실패 시 FAILED 반영. [완료]
    - documents.list: 검색(q), 정렬(sortKey/dir) 옵션 구현. [TODO]
    - presign: 확장자/MIME/사이즈 정책 일치화. [완료]
    - legacy multipart 업로드 경로 지원 여부 결정. [DECIDE]
  - Shared Handler 패턴 도입
    - 공통 서비스 계층(`packages/@echo-ai/api-core` 또는 `services/api/src/shared`)에 순수 핸들러 정의.
    - Next.js Route와 Lambda는 어댑터만 두고 동일 구현 호출.
    - 요청/응답 Normalized 인터페이스 설계(Body/Headers/Auth/Params/Query).
  - 스키마 명세/검증(zod/JSON Schema) 도입 및 응답 계약 통일.
  - 로컬 Invoke 스크립트 확장(완료): signup/login/me 및 documents* 액션 지원.
- 산출물/수용 기준
  - Next.js ↔ Lambda 엔드포인트별 동작/응답 정합성 계약 테스트 통과.
  - presign/업로드/목록/단건/삭제/요약 큐잉 시나리오 동등 동작.
  - Shared Handler 구조 확립으로 신규 기능이 양측에 자동 반영.

### 단계 3.1 CI/CD 자동화(추가)
- 목표: Next.js 라우트/공통 핸들러 변경 시 Lambda 자동 빌드·배포.
- 작업
  - GitHub Actions 워크플로: 변경 감지(`apps/web/src/app/api/**`, `services/api/**`, `packages/@echo-ai/**`).
  - 빌드: esbuild/tsup 번들 → 아티팩트 업로드 → CDK `echoai-api` 스택 `cdk deploy --require-approval=never`.
  - 배포 권한: GitHub OIDC → `EchoPipelineRole`(cloudformation deploy, iam:PassRole 제한).
  - 프리/포스트 검증: `cdk diff` 요약 코멘트, 헬스체크 Lambda 호출.
- 산출물/수용 기준
  - main/develop 병합 시 자동 배포, 실패 시 알림 및 롤백 가이드.

### 단계 4. CDK 기반 최소 인프라(dev) 배포 (우선순위 3, 1.5~2주)
- 목표: 개발 환경에서 서버리스 리소스 프로비저닝 및 Summarizer/기본 API 배포 자동화.
- 작업
  - 스택 구성: `echoai-shared`(문서 S3, 태깅), `echoai-api`(DynamoDB with EmailIndex, SQS+DLQ, Summarizer Lambda, API GW 스켈레톤, IAM, Log/메트릭), 선택 `echoai-ops`(알람/대시보드).
  - 공통 태그/IAM 최소 권한 적용, 스택 Outputs로 버킷/배포ID/큐URL/테이블ARN/API URL 노출.
  - 배포 스크립트와 파라미터(context dev.json) 정리.
- 산출물/수용 기준
  - `cdk synth/diff/deploy`로 무중단 배포 가능, 리소스가 정상 생성되고 기본 헬스체크 통과.
  - Summarizer Lambda가 SQS 이벤트로 동작(CloudWatch에서 확인).

### 단계 5. Secrets Manager 통합 (우선순위 4, 0.5~1주)
- 목표: `.env` 의존 제거, 런타임 비밀을 Secrets Manager에서 주입/조회.
- 작업
  - Secret 네이밍(`echoai/{stage}/gemini/api-key` 등) 생성 및 CDK로 관리.
  - `@echo-ai/config`에 Secret 조회 로직 추가(로컬은 env, cloud는 Secrets Manager).
  - Lambda 환경변수에는 Secret 이름만 주입, 권한 범위 최소화.
- 산출물/수용 기준
  - 프로덕션/스테이징 Lambda가 Secrets Manager에서 키를 읽어 성공적으로 요약 수행.
  - `.env` 내 민감정보 제거 및 문서화 업데이트.

### 단계 6. CI/CD 초기 파이프라인 (우선순위 5, 1~1.5주)
- 목표: 브랜치 병합 시 자동 빌드/배포 및 UI-only 분기 구현.
- 작업
  - GitHub OIDC → `EchoPipelineRole` 연결, `cdk synth/diff/deploy` 워크플로 추가.
  - 변경 감지: UI 전용 변경 시 S3 업로드+CloudFront 무효화, 백엔드 변경 시 스택 배포.
  - Lint/Test/빌드 캐시 최적화.
- 산출물/수용 기준
  - `develop` 병합 → dev 계정 배포 성공, UI-only 변경 시 빠른 정적 배포 경로 동작.
  - 실패 시 알림 및 롤백 지침 포함.

### 단계 7. 검증·성능·보안 하드닝 및 운영 전환 (우선순위 6, 1.5~2주)
- 목표: SLA(p95 20초), 보안/IAM 검토, 관측성, 운영 절차를 완비하여 프로덕션 전환 준비.
- 작업
  - 통합 테스트: 인증→업로드→요약→조회 E2E, 에러/경계 케이스.
  - 성능: 동시 처리/타임아웃/배치 크기 조정, 큐 적체 알람/대시보드 구성.
  - 보안: IAM 최소 권한 재검토, 로그/비밀 접근 감사, 태깅 준수 검증.
  - 운영 전환 계획: 릴리즈/롤백/장애 대응 절차 정리.
- 산출물/수용 기준
  - CloudWatch 대시보드·알람 가동, p95 20초 충족(스테이징). 운영 전환 체크리스트 승인.

## 4. 산출물
- 업데이트된 시스템 문서: `docs/architecture/todo-system.md` 반영 + 전환 결정 사항.
- Lambda/API 코드 (`services/api`, `services/ai-processor`), 패키지 조정 내역.
- CloudFormation/CDK 템플릿 (`infra/**`).
- GitHub Actions 워크플로 정의 (`.github/workflows/**`).
- 테스트/검증 보고서 및 운영 절차 문서.

## 5. 리스크 및 대응
| 리스크 | 영향 | 대응 전략 |
| --- | --- | --- |
| Lambda 실행 환경과 Next.js 의존성 차이 | 번들 실패, 런타임 오류 | 모듈별 번들 크기/호환성 사전 검토, Lambda Layer 활용 |
| Gemini ↔ OpenAI 전환 결정 지연 | Secrets 구조 변경, 코드 재작업 | 추상화 레이어 설계, 두 엔진을 선택적으로 호출 가능하도록 인터페이스 정의 |
| CI/CD 파이프라인 복잡도 증가 | 배포 실패, 롤백 지연 | 단계별 파이프라인 구축, 스테이징에서 충분한 연습, IaC 변경 시 Change Set 활용 |
| DynamoDB 스키마 불일치 | 데이터 마이그레이션 실패 | 단계 1에서 스키마 확정, 마이그레이션 스크립트/백업 전략 수립 |

## 6. 일정 및 역할 제안
| 역할 | 주요 책임 | 예상 투입 |
| --- | --- | --- |
| 아키텍트/리드 | 설계 확정, 인프라 코드 표준, 일정 관리 | 전체 기간 |
| 백엔드 개발자 | Lambda 구현, 패키지 정비, DynamoDB/SQS 연동 | 단계 2~6 |
| 프런트엔드 개발자 | UI 정적 빌드 최적화, CloudFront 배포 검증 | 단계 3~6 |
| DevOps 엔지니어 | CI/CD, Secrets/IAM 설정, 모니터링 구축 | 단계 4~6 |

## 7. 완료 기준
- `todo-system.md`에 정의된 토폴로지 요소가 프로덕션 환경에서 운영 중이다.
- 비동기 요약 Lambda가 20초 SLA 내에서 동작하며, CloudWatch 지표가 설정되었다.
- GitHub Actions가 브랜치 머지 시 자동으로 적절한 배포 Job을 수행한다.
- Secrets Manager가 모든 민감 정보를 관리하며 `.env` 의존이 제거되었다.
- 운영·장애 대응 문서가 최신 상태로 업데이트되었다.
