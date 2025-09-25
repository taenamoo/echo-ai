# 단계 1 산출물: IaC 구현 가이드 배포 내역

본 메모는 "IaC 접근 방식(CloudFormation 템플릿 vs CDK)과 공통 태깅, IAM 최소 권한 표준" 문서화 작업의 완료 내역을 기록한다. 이해관계자(요청자)는 본 요약을 확인 즉시 승인된 것으로 간주한다.

## 1. 산출물 개요
- **주요 문서**: [`docs/architecture/iac-guidelines.md`](../architecture/iac-guidelines.md)
- **주요 내용**:
  - AWS CDK(TypeScript)를 1차 표준으로 채택하고, 제한된 범위 내에서 CloudFormation 템플릿을 병행 지원하는 결정.
  - 스택 디렉터리 구조, 환경별 context 관리, Pull Request 시 `cdk diff` 공유 등 운영 절차 정의.
  - 모든 리소스에 적용할 공통 태깅 규칙(Project, Environment, Owner, CostCenter, Confidentiality).
  - Lambda, 배포 파이프라인, 운영 롤에 대한 IAM 최소 권한 가이드와 CDK 코드 예시.
  - 배포 품질 관리를 위한 `cdk synth/diff/deploy` 수행 절차.

## 2. 적용 및 후속 과제
- 4단계 인프라 코드 작성 시 본 가이드를 기반으로 스택을 구현한다.
- CloudFormation 예외가 필요한 경우 `infra/cloudformation` 경로에 템플릿과 승인 사유를 명시한다.
- IAM 권한 검증 자동화를 위해 Access Analyzer 또는 커스텀 감사 파이프라인 도입을 검토한다.

## 3. 승인
- 본 요약과 상세 가이드는 제품 오너(요청자) 확인 즉시 효력이 발생한다. 추가 변경 사항이 있으면 문서를 개정한다.
