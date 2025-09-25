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
### 단계 1. 설계 정교화 및 준비 (1~2주)
- `application-architecture-notes.md`의 제약 사항 및 리스크를 기반으로 세부 요구사항을 확정한다.
  - SLA 요구사항(요약 20초), 허용 파일 형식(.txt/.md/.pdf/.docs), 비밀 관리 전환 등 미스매치 항목을 정리하여 이해관계자 승인한다.
  - DynamoDB 정렬키 패턴을 `PROFILE#<userId>`로 확정하고, 기존 문서(`PROFILE`)와의 차이를 보정하기 위한 마이그레이션 및 스키마 업데이트 계획을 작성한다.
  - 요약 엔진 전략(초기 Gemini 고정, 후속 엔진 추가 대비)을 합의하고 Secrets Manager 키 네이밍/버저닝·교차 엔진 구성 정책을 정의한다.
  - 비동기 요약 활성화(`SUMMARIZE_ASYNC=true`) 시 예상되는 SQS 큐 크기, Lambda 동시 실행 한계, 재시도·DLQ 정책을 산정하여 요구되는 모니터링 항목을 목록화한다.
  - IaC 접근 방식(CloudFormation 템플릿 vs CDK)과 공통 태깅, IAM 최소 권한 표준을 문서화해 후속 단계의 구현 가이드로 배포한다.
    - 결과물: [`docs/architecture/iac-guidelines.md`](./iac-guidelines.md) 및 요약본 [`docs/done/step-01-iac-guideline-summary.md`](../done/step-01-iac-guideline-summary.md).
- 의사결정 결과를 `docs/architecture/todo-system.md` 및 부속 설계 문서에 반영하기 위한 업데이트 백로그와 승인 절차를 수립한다.

### 단계 2. 공통 모듈 정비 (1주)
- `packages/@echo-ai/*` 모듈을 Lambda 번들링에 적합하도록 의존성 및 환경 변수 로딩 로직 점검.
- `SUMMARIZE_ASYNC` 기본값을 true로 전환하기 위한 설정 및 테스트 계획 수립.
- 로컬 개발 환경(Docker Compose)에서 Lambda 시뮬레이션 전략 정의.

### 단계 3. 백엔드 기능 분리 (2~3주)
- `services/api`에 인증, 문서 CRUD, 요약 트리거 Lambda 핸들러 구현.
- API Gateway 라우팅 규칙과 요청/응답 스키마 정의.
- `services/ai-processor` Lambda가 SQS 메시지를 처리하여 DynamoDB/S3와 상호작용하도록 구현.
- 30초 SLA 충족을 위한 병렬 처리·타임아웃 설정 적용.

### 단계 4. 인프라 코드 작성 (2주)
- `infra/` 디렉터리에 `echoai-shared`, `echoai-api`, (선택) `echoai-ops` 스택 템플릿 작성.
- IAM 역할 최소 권한, 태깅 정책, CloudWatch 로그/알람 구성을 포함.
- 로컬/스테이징/프로덕션 환경 파라미터 정의 및 문서화.

### 단계 5. CI/CD 파이프라인 구축 (1~2주)
- GitHub Actions 워크플로 추가: Lint/Test → Build → 배포 패키징.
- OIDC 기반 IAM Role 연동 및 비밀 접근 권한 설정.
- 변경 감지 로직 구현: UI 전용 변경 시 S3 업로드 + CloudFront 무효화, 백엔드 변경 시 CloudFormation 배포.
- Secrets Manager 업데이트 자동화 및 실패 알림 채널 구성.

### 단계 6. 전환 및 검증 (2주)
- 스테이징 환경에서 종단 간 통합 테스트(인증, 업로드, 요약, 조회) 수행.
- 성능 검증: 요약 처리 시간, Lambda 동시 실행 한계, SQS 적체 모니터링.
- 보안 검토: IAM 정책, Secrets Manager 접근 제어, 네트워크 구성.
- 운영 환경 전환 계획 수립(릴리즈 창구, 롤백 전략, 장애 대응 절차).

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
