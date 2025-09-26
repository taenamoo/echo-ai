# 배포 자동화를 위한 목표 아키텍처

## 1. 추진 목표
- Next.js 모놀리식 런타임을 AWS 관리형 서비스 기반으로 이전하고, 인프라는 CloudFormation으로 코드화한다.
- GitHub Actions에서 `develop`, `master` 브랜치 머지 시 자동 배포가 이루어지도록 한다.
- 백엔드 스택 변경이 없을 때는 UI 정적 자산만 독립적으로 배포할 수 있는 경로를 마련한다.

## 2. 제안 토폴로지
1. **클라이언트 제공**
   - Next.js UI를 정적 자산으로 빌드하여 S3 버킷에 배포하고, CloudFront가 HTTPS 종료·캐싱·무효화를 담당한다.
2. **API 계층**
   - Amazon API Gateway(REST)가 도메인별 Lambda 함수(인증, 문서, 요약 등)로 요청을 전달한다.
   - Lambda 함수는 기존 `packages/@echo-ai/*` 워크스페이스 모듈을 공유 레이어/번들로 사용한다.
3. **데이터 및 스토리지**
   - 사용자 프로필·문서 메타데이터·요약 상태를 DynamoDB 테이블에 저장한다(문서화된 스키마와 정합성 유지).
   - 문서 원문은 S3 버킷에 보관하고, API Gateway + Lambda가 프리사인드 URL 흐름을 유지한다.
4. **비동기 처리**
   - 문서 업로드 Lambda가 `SUMMARIZE_ASYNC` 활성화 시 SQS 큐에 요약 작업 메시지를 발행한다.
   - `services/ai-processor` 기반 요약 전용 Lambda가 큐를 소비하여 S3에서 문서를 읽고 AI 요약(초기에는 Gemini, 필요 시 OpenAI로 전환 가능)을 수행한 뒤 DynamoDB에 결과를 기록한다.
5. **비밀 및 설정**
   - AWS Secrets Manager에 외부 API 키와 민감 설정을 저장하고, Lambda가 배포 시 또는 런타임에 불러와 사용한다.
6. **관측 및 보안**
   - CloudWatch Logs·지표·알람으로 Lambda/API Gateway 상태를 모니터링한다.
   - 모든 스택에 최소 권한 IAM 역할과 태깅 표준을 적용한다.

## 3. CloudFormation 스택 구성
| 스택 | 주요 리소스 | 비고 |
| --- | --- | --- |
| `echoai-shared` | UI용 S3 버킷, 문서 버킷, CloudFront 배포, ACM 인증서 | UI 배포 및 자산 호스팅 |
| `echoai-api` | API Gateway, Lambda 함수(인증·문서·요약·하우스키핑), DynamoDB 테이블, SQS 큐, IAM 역할, Secrets Manager 항목 | 메인 애플리케이션 백엔드 |
| `echoai-ops` (선택) | CloudWatch 알람, 대시보드, 로그 보존 정책 | 모니터링 구성 분리 |

스택 템플릿은 `infra/` 디렉터리에 CDK 또는 순수 CloudFormation 형태로 저장·관리한다.

## 4. CI/CD 워크플로(GitHub Actions)
1. **트리거**
   - `develop` 머지 → 개발 환경 스택 배포.
   - `master` 머지 → 운영 환경 스택 배포.
2. **파이프라인 단계**
   - Lint/Test → 빌드(`pnpm build`) → Lambda 번들 및 UI 자산 패키징.
   - `sam package`/`aws cloudformation package` 또는 CDK synth로 배포 가능한 템플릿을 생성한다.
   - `aws cloudformation deploy`로 환경/스택 파라미터를 지정해 백엔드 스택을 배포한다.
   - 변경 파일 경로를 검사하여 UI 자산만 수정된 경우 스택 배포를 건너뛰고 UI 전용 Job을 실행한다: 빌드된 자산을 UI용 S3 버킷에 업로드하고 `aws cloudfront create-invalidation`을 호출한다.
3. **비밀 관리**
   - GitHub Actions가 OIDC로 AWS IAM 역할을 가정해 배포 자격을 획득한다.
   - Secrets Manager에 저장된 런타임 비밀은 필요 시 `aws secretsmanager put-secret-value`로 업데이트한다.

## 5. 마이그레이션 및 구현 단계
1. DynamoDB 스키마 정합성을 확정하고 Lambda 실행 환경에 맞게 공통 패키지를 보완한다.
2. Next.js Route Handler와 동일한 기능을 제공하는 `services/api` Lambda 핸들러를 구현한다.
3. SQS 메시지를 처리하고 30초 SLA를 충족하도록 설계된 `services/ai-processor` Lambda를 완성한다.
4. 각 스택에 필요한 IAM 정책과 태깅을 포함한 CloudFormation/CDK 템플릿을 작성한다.
5. GitHub Actions 워크플로를 구성해 백엔드 스택 배포, UI 전용 배포, 공통 빌드 Job을 자동화한다.
6. 지연·오류·큐 적체 등을 모니터링하는 기본 알람을 설정하고 Slack/이메일 알림 연계를 준비한다.

## 6. 미결정 사항
- Gemini와 OpenAI 중 어느 요약 엔진을 표준으로 삼을지 결정하고, 그에 맞춰 Secrets Manager 스키마를 설계해야 한다.
- UI 전용 배포를 언제 실행할지(경로 필터, 커밋 라벨 등) 명확한 기준을 정의해야 한다.
- 순수 CloudFormation 템플릿과 CDK 중 어느 방식을 채택할지 결정해 팀 역량과 향후 거버넌스를 고려한 표준을 마련해야 한다.
