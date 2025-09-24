# AWS Deployment To-Do (0-100 단계)

아래 체크리스트는 AWS에 소스를 배포하여 개발 환경을 구성하기 위한 세부 단계이다. 각 단계는 0단계부터 100단계까지 순차적으로 수행하도록 설계되었으며, 이전 단계에서 준비된 산출물이나 선행조건을 명시하여 누락을 방지한다.

## 단계별 상세 지침

## 0~10단계 상세 가이드

0단계부터 10단계까지는 별도 문서로 세부 절차와 산출물을 정리하였다. 아래 링크를 순차적으로 따라 수행하면 초기 준비가 완료된다.

| 단계 | 제목 | 주요 내용 | 상세 문서 |
| --- | --- | --- | --- |
| 0 | 요구사항 명세 검토 | 요구사항 수집, RTM 작성, 승인 확보 | [step-00-requirements-review.md](docs/aws-deployment/step-00-requirements-review.md) |
| 1 | 이해관계자 식별 및 책임 분장 | RACI 매트릭스 작성, 커뮤니케이션 체계 확립 | [step-01-stakeholder-mapping.md](docs/aws-deployment/step-01-stakeholder-mapping.md) |
| 2 | 배포 대상 애플리케이션 구조 파악 | 기술 스택 분석, 아키텍처 다이어그램 최신화 | [step-02-application-architecture.md](docs/aws-deployment/step-02-application-architecture.md) |
| 3 | 버전 관리 전략 확정 | 브랜치 전략 정의, 릴리스/롤백 프로세스 수립 | [step-03-version-strategy.md](docs/aws-deployment/step-03-version-strategy.md) |
| 4 | IaC 도입 여부 결정 | IaC 도구 평가, 모듈 구조 및 가드레일 설계 | [step-04-iac-decision.md](docs/aws-deployment/step-04-iac-decision.md) |
| 5 | 배포 환경 구분 정의 | 환경 격리 전략, 계정/VPC 분리, 접근 정책 수립 | [step-05-environment-definition.md](docs/aws-deployment/step-05-environment-definition.md) |
| 6 | 예산 및 비용 한도 설정 | 비용 추정, AWS Budgets 구성, 절감 정책 정의 | [step-06-budget-planning.md](docs/aws-deployment/step-06-budget-planning.md) |
| 7 | 보안 및 규제 요구사항 분석 | 규제 식별, 위험 평가, 보안 가드레일 설계 | [step-07-security-compliance.md](docs/aws-deployment/step-07-security-compliance.md) |
| 8 | 거버넌스 원칙 수립 | 태그/명명 규칙, IAM 정책, 변경 관리 절차 수립 | [step-08-governance-principles.md](docs/aws-deployment/step-08-governance-principles.md) |
| 9 | 로드맵 및 일정 수립 | WBS 작성, 마일스톤/의존성 관리, 리스크 계획 | [step-09-roadmap-planning.md](docs/aws-deployment/step-09-roadmap-planning.md) |
| 10 | AWS 계정 생성 또는 온보딩 | 계정 생성/보안 설정, IAM/SSO 구성, 온보딩 보고 | [step-10-account-onboarding.md](docs/aws-deployment/step-10-account-onboarding.md) |

## 11~20단계 상세 가이드

11단계부터 20단계까지는 계정 거버넌스와 네트워크, 컴퓨팅 기반을 구축하는 핵심 구간이다. 아래 링크의 문서를 순차적으로 수행하면 중간 의사결정을 명확히 하고 실무 절차를 빠짐없이 진행할 수 있다.

| 단계 | 제목 | 주요 내용 | 상세 문서 |
| --- | --- | --- | --- |
| 11 | AWS Organizations/Control Tower 검토 | 멀티 계정 전략 수립, OU/SCP 설계, Guardrail 정의 | [step-11-organizations-control-tower.md](docs/aws-deployment/step-11-organizations-control-tower.md) |
| 12 | IAM 사용자/역할 설계 | 역할 분류, 정책 설계, MFA 및 프로비저닝 절차 수립 | [step-12-iam-design.md](docs/aws-deployment/step-12-iam-design.md) |
| 13 | SSO 및 자격 증명 관리 수립 | IdP 통합, 자동 프로비저닝, MFA 및 운영 가이드 | [step-13-sso-identity-management.md](docs/aws-deployment/step-13-sso-identity-management.md) |
| 14 | 네트워크 설계 초안 작성 | VPC/서브넷 구조, 라우팅, 보안 경계 및 고가용성 계획 | [step-14-network-design-draft.md](docs/aws-deployment/step-14-network-design-draft.md) |
| 15 | IP 대역 및 CIDR 계획 확정 | CIDR 배분, 연동 네트워크 충돌 방지, 확장성 검토 | [step-15-cidr-planning.md](docs/aws-deployment/step-15-cidr-planning.md) |
| 16 | VPC 및 서브넷 생성 계획서 작성 | 리소스 매트릭스, IaC/수동 절차, 검증·롤백 계획 | [step-16-vpc-subnet-implementation-plan.md](docs/aws-deployment/step-16-vpc-subnet-implementation-plan.md) |
| 17 | 보안 그룹/네트워크 ACL 정책 수립 | 트래픽 분석, 보안 규칙 정의, 자동화·검증 전략 | [step-17-network-security-policies.md](docs/aws-deployment/step-17-network-security-policies.md) |
| 18 | DNS 및 도메인 전략 수립 | 도메인 구조, DNS 호스팅, 인증서 및 운영 전략 | [step-18-dns-domain-strategy.md](docs/aws-deployment/step-18-dns-domain-strategy.md) |
| 19 | 네트워크 연결성 테스트 계획 | 테스트 범위, 자동화, 보고 및 롤백 절차 수립 | [step-19-connectivity-testing-plan.md](docs/aws-deployment/step-19-connectivity-testing-plan.md) |
| 20 | 컴퓨팅 서비스 선택 | 서비스 비교 평가, PoC, 비용·보안·운영 검토 | [step-20-compute-service-selection.md](docs/aws-deployment/step-20-compute-service-selection.md) |

## 21~30단계 상세 가이드

21단계부터 30단계까지는 애플리케이션 실행 및 배포 자동화에 필요한 데이터/스토리지 계층과 CI/CD 기반을 마련하는 구간이다. 아래 링크를 순차적으로 수행하면 개발 환경 운영에 필요한 기반 서비스를 빠짐없이 준비할 수 있다.

| 단계 | 제목 | 주요 내용 | 상세 문서 |
| --- | --- | --- | --- |
| 21 | 이미지 및 아티팩트 전략 수립 | 아티팩트 유형 정의, 저장소 선정, 버저닝/보안 정책 수립 | [step-21-artifact-strategy.md](docs/aws-deployment/step-21-artifact-strategy.md) |
| 22 | 런타임 환경 변수/시크릿 관리 방안 결정 | 시크릿 인벤토리 작성, 관리 도구 선정, 회전/감사 정책 수립 | [step-22-runtime-secrets-management.md](docs/aws-deployment/step-22-runtime-secrets-management.md) |
| 23 | 데이터베이스 선택 및 프로비저닝 계획 | 서비스 평가, 보안·백업·DR 전략, IaC 자동화 설계 | [step-23-database-planning.md](docs/aws-deployment/step-23-database-planning.md) |
| 24 | 캐시/메시지 브로커 고려 | 캐시·메시징 요구 분석, 서비스 선택, 모니터링/보안 설계 | [step-24-cache-messaging-planning.md](docs/aws-deployment/step-24-cache-messaging-planning.md) |
| 25 | 스토리지 전략 수립 | 데이터 분류, S3/EBS/EFS 전략, 라이프사이클·암호화 정책 수립 | [step-25-storage-strategy.md](docs/aws-deployment/step-25-storage-strategy.md) |
| 26 | 모니터링 및 로깅 프레임워크 결정 | 관측 지표 정의, 도구 선정, 알람/온콜 프로세스 설계 | [step-26-monitoring-logging-framework.md](docs/aws-deployment/step-26-monitoring-logging-framework.md) |
| 27 | CI/CD 파이프라인 요구사항 정의 | 파이프라인 단계, 품질 게이트, 승인/감사 기준 정립 | [step-27-cicd-requirements.md](docs/aws-deployment/step-27-cicd-requirements.md) |
| 28 | CI 도구 선택 | CI 후보 평가, 보안/비용 검토, PoC 및 운영 모델 확정 | [step-28-ci-tool-selection.md](docs/aws-deployment/step-28-ci-tool-selection.md) |
| 29 | CD 도구 선택 | 배포 전략 지원성 검토, 보안/운영 요구 충족 도구 선정 | [step-29-cd-tool-selection.md](docs/aws-deployment/step-29-cd-tool-selection.md) |
| 30 | 아티팩트 빌드 파이프라인 설계 | 빌드/스캔/서명 단계 정의, 시크릿 주입, 모니터링 연계 | [step-30-artifact-build-pipeline.md](docs/aws-deployment/step-30-artifact-build-pipeline.md) |

### 11. AWS Organizations/Control Tower 검토
- 세부 절차는 [상세 문서](docs/aws-deployment/step-11-organizations-control-tower.md)를 참고한다.
- 멀티계정 전략이 필요하면 AWS Organizations 또는 Control Tower 도입을 결정한다 (5단계 참고).
- 계정 분리 시 프로비저닝 절차를 문서화한다.

### 12. IAM 사용자/역할 설계
- 세부 절차는 [상세 문서](docs/aws-deployment/step-12-iam-design.md)를 참고한다.
- 최소 권한 원칙에 따라 IAM 역할과 정책을 설계한다 (8단계 정책 기준).
- Terraform/CDK 사용 시 4단계 결정에 맞게 코드로 정의한다.

### 13. SSO 및 자격 증명 관리 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-13-sso-identity-management.md)를 참고한다.
- AWS IAM Identity Center(SAML 등) 연동 여부를 결정하고 설정한다.
- 12단계 IAM 설계를 바탕으로 역할 매핑을 구성한다.

### 14. 네트워크 설계 초안 작성
- 세부 절차는 [상세 문서](docs/aws-deployment/step-14-network-design-draft.md)를 참고한다.
- VPC, 서브넷, 라우팅, NAT, 보안 그룹 등 네트워크 구성을 설계한다.
- 2단계 아키텍처 문서에 네트워크 다이어그램을 추가한다.

### 15. IP 대역 및 CIDR 계획 확정
- 세부 절차는 [상세 문서](docs/aws-deployment/step-15-cidr-planning.md)를 참고한다.
- 온프레미스/다른 VPC와 겹치지 않는 CIDR 범위를 결정한다.
- 14단계 네트워크 설계에 반영하고 문서화한다.

### 16. VPC 및 서브넷 생성 계획서 작성
- 세부 절차는 [상세 문서](docs/aws-deployment/step-16-vpc-subnet-implementation-plan.md)를 참고한다.
- 퍼블릭/프라이빗 서브넷 수와 AZ 전략을 확정한다.
- IaC를 사용할 경우 4단계에서 정한 레포지토리에 모듈 구조를 설계한다.

### 17. 보안 그룹/네트워크 ACL 정책 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-17-network-security-policies.md)를 참고한다.
- 인바운드/아웃바운드 규칙을 정의하고 8단계 보안 원칙과 정합성을 확인한다.
- 14~16단계 네트워크 설계에 통합한다.

### 18. DNS 및 도메인 전략 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-18-dns-domain-strategy.md)를 참고한다.
- Route 53 사용 여부, 서브도메인 구조, ACM 인증서 요구사항을 파악한다.
- 6단계 예산에 DNS 비용을 반영한다.

### 19. 네트워크 연결성 테스트 계획
- 세부 절차는 [상세 문서](docs/aws-deployment/step-19-connectivity-testing-plan.md)를 참고한다.
- VPC 피어링, VPN, Direct Connect 등 연결 요구사항을 정의한다.
- 14단계 설계에 따라 PoC 테스트 절차를 문서화한다.

### 20. 컴퓨팅 서비스 선택
- 세부 절차는 [상세 문서](docs/aws-deployment/step-20-compute-service-selection.md)를 참고한다.
- EC2, ECS, EKS, Lambda 등 배포 대상에 맞는 컴퓨팅 옵션을 선정한다 (2단계 기술 스택 참고).
- 성능/확장성 요구사항을 0단계 문서와 비교해 결정한다.

### 21. 이미지 및 아티팩트 전략 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-21-artifact-strategy.md)를 참고한다.
- Docker 이미지 레지스트리(ECR) 또는 애플리케이션 빌드 산출물 저장소를 결정한다.
- 20단계에서 선택한 컴퓨팅 서비스와 호환되는 포맷으로 정한다.

### 22. 런타임 환경 변수/시크릿 관리 방안 결정
- 세부 절차는 [상세 문서](docs/aws-deployment/step-22-runtime-secrets-management.md)를 참고한다.
- AWS Secrets Manager, SSM Parameter Store 등 도구를 선택한다.
- 7단계 보안 요구사항과 8단계 정책을 준수한다.

### 23. 데이터베이스 선택 및 프로비저닝 계획
- 세부 절차는 [상세 문서](docs/aws-deployment/step-23-database-planning.md)를 참고한다.
- RDS, DynamoDB, Aurora 등 선택하고 스키마 요구사항을 수집한다 (0단계).
- 백업/복구 전략을 7단계 규제 요구사항과 일치시킨다.

### 24. 캐시/메시지 브로커 고려
- 세부 절차는 [상세 문서](docs/aws-deployment/step-24-cache-messaging-planning.md)를 참고한다.
- ElastiCache, SQS, SNS, Kafka 등 필요한 추가 서비스 여부를 결정한다.
- 20단계 컴퓨팅 선택과 연동 계획을 수립한다.

### 25. 스토리지 전략 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-25-storage-strategy.md)를 참고한다.
- S3 버킷 구조, Glacier 보존 정책, EFS/EBS 사용 계획을 작성한다.
- 8단계 태그 및 암호화 정책을 포함한다.

### 26. 모니터링 및 로깅 프레임워크 결정
- 세부 절차는 [상세 문서](docs/aws-deployment/step-26-monitoring-logging-framework.md)를 참고한다.
- CloudWatch, OpenSearch, Datadog 등 도구를 선택한다.
- 7단계 규제 및 6단계 비용 한도 내에서 구성한다.

### 27. CI/CD 파이프라인 요구사항 정의
- 세부 절차는 [상세 문서](docs/aws-deployment/step-27-cicd-requirements.md)를 참고한다.
- 빌드, 테스트, 배포 단계와 승인 흐름을 명세한다.
- 3단계 버전 관리 전략에 맞춘 브랜치 트리거를 설계한다.

### 28. CI 도구 선택
- 세부 절차는 [상세 문서](docs/aws-deployment/step-28-ci-tool-selection.md)를 참고한다.
- GitHub Actions, CodeBuild, Jenkins 등 선택하고 인프라 접근 권한 요구사항을 문서화한다.
- 27단계 파이프라인 요구사항을 충족하는지 검토한다.

### 29. CD 도구 선택
- 세부 절차는 [상세 문서](docs/aws-deployment/step-29-cd-tool-selection.md)를 참고한다.
- CodeDeploy, Argo CD, Spinnaker 등 배포 자동화 도구를 정한다.
- 20단계 컴퓨팅 옵션과 호환성을 확인한다.

### 30. 아티팩트 빌드 파이프라인 설계
- 세부 절차는 [상세 문서](docs/aws-deployment/step-30-artifact-build-pipeline.md)를 참고한다.
- 테스트, 빌드, 이미지 생성, 보안 스캔 단계 순서를 정의한다.
- 21단계에서 정한 아티팩트 저장소와 연동한다.

## 31~40단계 상세 가이드

31단계부터 40단계까지는 품질 게이트 확립과 거버넌스, 비용 관리, 백업/DR, 네트워크 구축으로 개발 환경을 실제 운영 가능한 상태로 만든다. 아래 링크의 문서를 순차적으로 수행하면 각 영역의 요구사항을 충족할 수 있다.

| 단계 | 제목 | 주요 내용 | 상세 문서 |
| --- | --- | --- | --- |
| 31 | 보안 스캔 및 품질 관리 기준 확립 | 스캔 범위/도구 정의, 품질 게이트 임계값, 파이프라인 통합 | [step-31-security-quality-baselines.md](docs/aws-deployment/step-31-security-quality-baselines.md) |
| 32 | 배포 전략 정의 | 배포 전략 비교, 트래픽 전환 설계, 파일럿 검증 | [step-32-deployment-strategy.md](docs/aws-deployment/step-32-deployment-strategy.md) |
| 33 | 롤백 정책 문서화 | 실패 시나리오, 자동화 수준, 게임데이 테스트 계획 | [step-33-rollback-policy.md](docs/aws-deployment/step-33-rollback-policy.md) |
| 34 | 배포 승인 절차 수립 | 승인 역할/기준 정의, 파이프라인 게이트 구성, 감사 절차 | [step-34-deployment-approvals.md](docs/aws-deployment/step-34-deployment-approvals.md) |
| 35 | 코드 저장소 정리 | 저장소 구조 표준화, 브랜치/태그 정책, 접근 제어 강화 | [step-35-repository-governance.md](docs/aws-deployment/step-35-repository-governance.md) |
| 36 | AWS 비용 모니터링 설정 초안 | 비용 목표, Budgets/CUR 구성, 대시보드·알림 설계 | [step-36-cost-monitoring.md](docs/aws-deployment/step-36-cost-monitoring.md) |
| 37 | 리소스 태깅 규칙 상세화 | 태그 카탈로그, 검증 로직, 자동화/감사 구성 | [step-37-resource-tagging.md](docs/aws-deployment/step-37-resource-tagging.md) |
| 38 | 비밀 관리 절차 문서화 | 시크릿 생명주기, 회전/감사, 사고 대응 Runbook | [step-38-secrets-operations.md](docs/aws-deployment/step-38-secrets-operations.md) |
| 39 | 백업 및 DR 전략 확정 | RPO/RTO, 백업·복제 구성, DR 아키텍처/테스트 | [step-39-backup-dr-strategy.md](docs/aws-deployment/step-39-backup-dr-strategy.md) |
| 40 | 개발 환경용 네트워크 구축 | VPC/서브넷 배포, 보안/연결성 검증, 모니터링 설정 | [step-40-dev-network-build.md](docs/aws-deployment/step-40-dev-network-build.md) |

### 31. 보안 스캔 및 품질 관리 기준 확립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-31-security-quality-baselines.md)를 참고한다.
- SAST/SCA/컨테이너/IaC 스캔 도구를 선정하고 30단계 파이프라인에 통합한다.
- 7단계 보안 요구사항과 27단계 파이프라인 요구를 반영해 품질 게이트 임계값을 결정한다.

### 32. 배포 전략 정의
- 세부 절차는 [상세 문서](docs/aws-deployment/step-32-deployment-strategy.md)를 참고한다.
- 블루/그린, 카나리 등 전략을 비교하고 20단계 컴퓨팅 및 29단계 CD 도구와 정합성을 검토한다.
- 26단계 모니터링 지표와 연계해 성공/실패 기준과 트래픽 전환 방법을 수립한다.

### 33. 롤백 정책 문서화
- 세부 절차는 [상세 문서](docs/aws-deployment/step-33-rollback-policy.md)를 참고한다.
- 배포 실패 시나리오별 자동/수동 롤백 절차와 데이터 복구 흐름을 정의한다.
- 26단계 모니터링, 31단계 스캔 결과를 트리거로 활용하고 39단계 DR 계획과 연동한다.

### 34. 배포 승인 절차 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-34-deployment-approvals.md)를 참고한다.
- 환경별 승인 역할·체크리스트를 정의하고 27~29단계 파이프라인에 승인 게이트를 적용한다.
- 승인 기록 보관, 긴급 변경 예외 흐름을 문서화하여 1단계 RACI와 일치시킨다.

### 35. 코드 저장소 정리
- 세부 절차는 [상세 문서](docs/aws-deployment/step-35-repository-governance.md)를 참고한다.
- 저장소 구조와 브랜치/태그 정책을 3단계 버전 전략에 맞춰 정비하고 보호 규칙을 설정한다.
- 12단계 IAM 설계와 연계해 접근 권한을 검토하고 템플릿/자동화 스크립트를 표준화한다.

### 36. AWS 비용 모니터링 설정 초안
- 세부 절차는 [상세 문서](docs/aws-deployment/step-36-cost-monitoring.md)를 참고한다.
- 예산 임계값, Cost Explorer/Budgets/CUR 구성, 알림 채널을 정의한다.
- 26단계 모니터링 플랫폼과 37단계 태깅 정책을 활용해 비용 대시보드를 설계한다.

### 37. 리소스 태깅 규칙 상세화
- 세부 절차는 [상세 문서](docs/aws-deployment/step-37-resource-tagging.md)를 참고한다.
- 필수 태그 세트와 검증 로직을 정의하고 IaC/파이프라인에 적용한다.
- AWS Config/Tag Policies 등 자동화 도구를 구성하고 교육·감사 절차를 마련한다.

### 38. 비밀 관리 절차 문서화
- 세부 절차는 [상세 문서](docs/aws-deployment/step-38-secrets-operations.md)를 참고한다.
- 시크릿 생명주기, 회전/감사 전략을 정의하고 34단계 승인 절차와 연동한다.
- 사고 대응 및 교육 계획을 수립해 7단계 규제 요구사항을 충족한다.

### 39. 백업 및 DR 전략 확정
- 세부 절차는 [상세 문서](docs/aws-deployment/step-39-backup-dr-strategy.md)를 참고한다.
- RPO/RTO 목표, 백업·복제 구성, DR 아키텍처와 테스트 계획을 확정한다.
- 6단계 예산과 36단계 비용 모니터링을 반영하고 33단계 롤백 정책과 정합성을 검토한다.

### 40. 개발 환경용 네트워크 구축
- 세부 절차는 [상세 문서](docs/aws-deployment/step-40-dev-network-build.md)를 참고한다.
- 14~19단계 설계에 따라 VPC/서브넷을 배포하고 보안/연결성 검증을 수행한다.
- 26단계 모니터링, 36단계 비용 추적, 39단계 DR 계획과 연계한 운영 인수인계 자료를 작성한다.

## 41~50단계 상세 가이드

41단계부터 50단계까지는 CI/CD 실행 기반을 실제로 구축하고 배포 자동화에 필요한 인프라와 코드 자산을 완성하는 단계이다. 아래 문서를 순차적으로 수행하면 권한, 시크릿, 테스트, 품질 게이트, 배포 템플릿까지 체계적으로 마련할 수 있다.

| 단계 | 제목 | 주요 내용 | 상세 문서 |
| --- | --- | --- | --- |
| 41 | IAM 역할/사용자 생성 및 검증 | 설계된 IAM 역할·사용자 생성, 정책 적용, 감사 로그 검증 | [step-41-iam-provisioning.md](docs/aws-deployment/step-41-iam-provisioning.md) |
| 42 | S3/ECR 등 핵심 리소스 생성 | 아티팩트/스토리지 리소스 생성, 암호화·태깅·모니터링 적용 | [step-42-core-resource-provisioning.md](docs/aws-deployment/step-42-core-resource-provisioning.md) |
| 43 | CI 도구 인프라 구성 | 선택한 CI 도구 설치/연동, IAM·네트워크·모니터링 구성 | [step-43-ci-infrastructure-setup.md](docs/aws-deployment/step-43-ci-infrastructure-setup.md) |
| 44 | 코드 리포지토리와 CI 연동 | 브랜치 트리거 설정, 파이프라인 정의 배치, 알림/감사 구성 | [step-44-repo-ci-integration.md](docs/aws-deployment/step-44-repo-ci-integration.md) |
| 45 | 빌드 환경 변수 및 시크릿 주입 | 시크릿 저장소 연동, 회전/감사 설정, 파이프라인 변수 관리 | [step-45-build-secrets-injection.md](docs/aws-deployment/step-45-build-secrets-injection.md) |
| 46 | 테스트 스위트 통합 | 단위/통합/E2E 테스트 파이프라인 통합, 커버리지·알림 구성 | [step-46-test-suite-integration.md](docs/aws-deployment/step-46-test-suite-integration.md) |
| 47 | 코드 품질 게이트 구성 | 품질 기준 자동화, 브랜치 보호, 예외 관리 절차 확립 | [step-47-quality-gates-configuration.md](docs/aws-deployment/step-47-quality-gates-configuration.md) |
| 48 | 아티팩트 저장소 업로드 검증 | 업로드 자동화, 무결성 검사, 접근 제어·메타데이터 검증 | [step-48-artifact-upload-validation.md](docs/aws-deployment/step-48-artifact-upload-validation.md) |
| 49 | CD 도구 설치 및 초기 설정 | 선택한 CD 도구 배포, 타깃 등록, 인증/모니터링 구성 | [step-49-cd-tool-bootstrap.md](docs/aws-deployment/step-49-cd-tool-bootstrap.md) |
| 50 | 배포 템플릿/IaC 코드 작성 | IaC 템플릿 작성, 파라미터화, 검증·리뷰 절차 정립 | [step-50-iac-deployment-templates.md](docs/aws-deployment/step-50-iac-deployment-templates.md) |

## 51~60단계 상세 가이드

51단계부터 60단계까지는 데이터 계층과 구성 요소를 실제로 구축하고, 애플리케이션 실행을 위한 설정·관측 체계를 검증하는 구간이다. 아래 링크의 문서를 순서대로 수행하면 구성 관리, 데이터베이스, 모니터링, 설정 검증까지 빠짐없이 준비할 수 있다.

| 단계 | 제목 | 주요 내용 | 상세 문서 |
| --- | --- | --- | --- |
| 51 | 구성 관리 플랜 수립 | OS/패키지/설정 자동화 범위 정의, 도구 선정, 검증·롤백 전략 수립 | [step-51-configuration-management-plan.md](docs/aws-deployment/step-51-configuration-management-plan.md) |
| 52 | 애플리케이션 설정 파일 준비 | 환경별 설정 카탈로그 정리, 템플릿·검증 자동화 구성 | [step-52-application-config-prep.md](docs/aws-deployment/step-52-application-config-prep.md) |
| 53 | 데이터베이스 프로비저닝 | RDS 등 DB 리소스 생성, 보안/백업/모니터링 설정 적용 | [step-53-database-provisioning.md](docs/aws-deployment/step-53-database-provisioning.md) |
| 54 | 데이터베이스 초기화 및 마이그레이션 | 스키마/시드 적용, 마이그레이션 자동화, 롤백 전략 수립 | [step-54-database-initialization-migration.md](docs/aws-deployment/step-54-database-initialization-migration.md) |
| 55 | 캐시/메시지 서비스 생성 | 캐시·큐 리소스 생성, 접근 제어, 모니터링/장애 대응 설정 | [step-55-cache-messaging-provisioning.md](docs/aws-deployment/step-55-cache-messaging-provisioning.md) |
| 56 | 애플리케이션 빌드 및 이미지 생성 테스트 | 빌드/이미지 생성 리허설, 테스트 연동, 아티팩트 검증 | [step-56-initial-build-validation.md](docs/aws-deployment/step-56-initial-build-validation.md) |
| 57 | 보안 스캔 실행 및 리포트 검토 | SAST/SCA/컨테이너/IaC 스캔 실행, 결과 분석·조치 계획 수립 | [step-57-security-scan-review.md](docs/aws-deployment/step-57-security-scan-review.md) |
| 58 | 모니터링/로깅 인프라 생성 | 관측 리소스 배포, 알람·대시보드 구성, 통지 채널 연동 | [step-58-monitoring-logging-provisioning.md](docs/aws-deployment/step-58-monitoring-logging-provisioning.md) |
| 59 | 로그 수집 및 보존 정책 적용 | 로그 카탈로그 정리, 보존/접근 정책 적용, 비용 최적화 | [step-59-log-collection-retention.md](docs/aws-deployment/step-59-log-collection-retention.md) |
| 60 | 애플리케이션 설정 값 검증 | 설정·시크릿 주입 확인, 기능/모니터링 검증, 승인 기록 | [step-60-configuration-validation.md](docs/aws-deployment/step-60-configuration-validation.md) |

### 41. IAM 역할/사용자 생성 및 검증
- 세부 절차는 [상세 문서](docs/aws-deployment/step-41-iam-provisioning.md)를 참고한다.
- 12단계 IAM 설계와 13단계 SSO 전략에 따라 역할·사용자를 생성하고 접근 권한을 검증한다.
- CloudTrail, AWS Config 등 감사 로그가 정상 수집되는지 확인하고 결과를 문서화한다.

### 42. S3/ECR 등 핵심 리소스 생성
- 세부 절차는 [상세 문서](docs/aws-deployment/step-42-core-resource-provisioning.md)를 참고한다.
- 21·25단계 전략에 따라 아티팩트/스토리지 리소스를 생성하고 암호화, 버전 관리, 태깅을 적용한다.
- 리소스 접근 테스트와 비용/모니터링 연계를 완료한다.

### 43. CI 도구 인프라 구성
- 세부 절차는 [상세 문서](docs/aws-deployment/step-43-ci-infrastructure-setup.md)를 참고한다.
- 28단계에서 선택한 도구를 설치하거나 SaaS 연동을 구성하고, 41단계 IAM 역할로 인증한다.
- 네트워크/보안 설정과 샘플 파이프라인 실행으로 정상 동작을 검증한다.

### 44. 코드 리포지토리와 CI 연동
- 세부 절차는 [상세 문서](docs/aws-deployment/step-44-repo-ci-integration.md)를 참고한다.
- 브랜치/태그 트리거와 파이프라인 정의 파일을 배치하고, 27단계 요구사항과 일치시키는지 확인한다.
- 알림 및 감사 로그 구성을 완료하고 샘플 커밋으로 연동을 검증한다.

### 45. 빌드 환경 변수 및 시크릿 주입
- 세부 절차는 [상세 문서](docs/aws-deployment/step-45-build-secrets-injection.md)를 참고한다.
- 22·38단계에서 정의한 시크릿 정책에 따라 중앙 저장소와 회전·감사 설정을 적용한다.
- 빌드 로그에 시크릿이 노출되지 않는지 점검하고 교육/운영 계획을 마련한다.

### 46. 테스트 스위트 통합
- 세부 절차는 [상세 문서](docs/aws-deployment/step-46-test-suite-integration.md)를 참고한다.
- 단위/통합/E2E 테스트 순서를 정의하고 커버리지·보고서 생성까지 자동화한다.
- 실패 알림과 테스트 데이터 정리 절차를 마련해 품질 기준(31단계)에 부합하도록 한다.

### 47. 코드 품질 게이트 구성
- 세부 절차는 [상세 문서](docs/aws-deployment/step-47-quality-gates-configuration.md)를 참고한다.
- 31단계 품질 기준을 파이프라인과 브랜치 보호 규칙으로 구현해 기준 미달 시 차단한다.
- 예외 승인 절차와 품질 지표 보고 체계를 구축한다.

### 48. 아티팩트 저장소 업로드 검증
- 세부 절차는 [상세 문서](docs/aws-deployment/step-48-artifact-upload-validation.md)를 참고한다.
- 아티팩트 업로드 자동화와 무결성 검사를 구성하고 실패 시 자동 차단하도록 설정한다.
- 접근 제어·메타데이터·로그 보존 정책을 검증한다.

### 49. CD 도구 설치 및 초기 설정
- 세부 절차는 [상세 문서](docs/aws-deployment/step-49-cd-tool-bootstrap.md)를 참고한다.
- 29단계에서 선정한 CD 도구를 설치/연동하고 41단계 IAM 역할·42단계 아티팩트를 사용하도록 설정한다.
- 배포 타깃과 헬스체크/롤백 구성을 검증하고 모니터링 알림을 연동한다.

### 50. 배포 템플릿/IaC 코드 작성
- 세부 절차는 [상세 문서](docs/aws-deployment/step-50-iac-deployment-templates.md)를 참고한다.
- 16단계 네트워크 설계와 32·33단계 전략을 반영한 IaC 템플릿을 작성하고 파라미터화한다.
- 검증/코드 리뷰 기록을 남기고 49단계 CD 파이프라인에서 템플릿을 참조하도록 설정한다.

### 51. 구성 관리(예: Ansible, SSM) 플랜 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-51-configuration-management-plan.md)를 참고한다.
- 50단계 IaC 템플릿과 연계해 OS/애플리케이션 구성 자동화 범위와 도구를 확정한다.
- 22·38단계 시크릿 정책과 74단계 운영 인수 계획을 고려해 플레이북과 롤백 전략을 설계한다.

### 52. 애플리케이션 설정 파일 준비
- 세부 절차는 [상세 문서](docs/aws-deployment/step-52-application-config-prep.md)를 참고한다.
- 환경별 설정 카탈로그와 템플릿을 정리하고 22·38단계 시크릿 정책을 준수하도록 관리한다.
- 45단계 시크릿 주입·51단계 구성 관리 흐름과 연계해 검증/배포 자동화를 설계한다.

### 53. 데이터베이스 프로비저닝
- 세부 절차는 [상세 문서](docs/aws-deployment/step-53-database-provisioning.md)를 참고한다.
- 23단계 계획에 맞춰 RDS 등 DB 리소스를 생성하고 17·37단계 보안/태깅 정책을 적용한다.
- 39단계 백업·DR 전략과 연계해 백업/모니터링 구성을 완료하고 결과를 문서화한다.

### 54. 데이터베이스 초기화 및 마이그레이션
- 세부 절차는 [상세 문서](docs/aws-deployment/step-54-database-initialization-migration.md)를 참고한다.
- 53단계 DB에 스키마/시드 데이터를 적용하고 27·30단계 파이프라인과 통합한다.
- 31·33단계 품질/롤백 정책을 반영해 마이그레이션 검증과 복구 절차를 마련한다.

### 55. 캐시/메시지 서비스 생성
- 세부 절차는 [상세 문서](docs/aws-deployment/step-55-cache-messaging-provisioning.md)를 참고한다.
- 24단계 결정에 따라 캐시/메시지 리소스를 생성하고 17·37단계 보안·태깅 기준을 적용한다.
- 45단계 시크릿 주입과 58단계 모니터링 구성에 맞춰 엔드포인트, 알람, 장애 대응 전략을 마련한다.

### 56. 애플리케이션 빌드 및 이미지 생성 테스트
- 세부 절차는 [상세 문서](docs/aws-deployment/step-56-initial-build-validation.md)를 참고한다.
- 30단계 빌드 파이프라인과 동일한 조건에서 빌드를 실행해 로그·아티팩트 품질을 검증한다.
- 46단계 테스트 스위트, 48단계 업로드 검증과 연계해 자동화 개선 사항을 반영한다.

### 57. 보안 스캔 실행 및 리포트 검토
- 세부 절차는 [상세 문서](docs/aws-deployment/step-57-security-scan-review.md)를 참고한다.
- 31단계 기준에 따라 SAST/SCA/컨테이너/IaC 스캔을 실행하고 결과를 분류한다.
- 34단계 승인 절차와 90단계 KPI에 반영할 조치 계획을 수립한다.

### 58. 모니터링/로깅 인프라 생성
- 세부 절차는 [상세 문서](docs/aws-deployment/step-58-monitoring-logging-provisioning.md)를 참고한다.
- 26단계 관측 프레임워크에 맞춰 로그/지표 수집, 알람, 대시보드를 배포한다.
- 41단계 IAM 권한과 79단계 Incident 관리 연계를 고려해 통지 채널과 Runbook을 구성한다.

### 59. 로그 수집 및 보존 정책 적용
- 세부 절차는 [상세 문서](docs/aws-deployment/step-59-log-collection-retention.md)를 참고한다.
- 58단계에서 구축한 로그 파이프라인에 보존/접근 정책을 적용해 규제 요구를 충족한다.
- 71·76단계 비용/감사 절차와 연계해 비용 영향과 감사 추적을 관리한다.

### 60. 애플리케이션 설정 값 검증
- 세부 절차는 [상세 문서](docs/aws-deployment/step-60-configuration-validation.md)를 참고한다.
- 52단계 설정 템플릿과 45·51단계 시크릿/구성 전략을 기반으로 주입 결과를 검증한다.
- 63단계 CI 리허설, 65단계 배포, 67단계 기능 검증에 활용할 자동화와 승인 기록을 정리한다.

## 61~70단계 상세 가이드

61단계부터 70단계까지는 배포 파이프라인 실행, 애플리케이션 검증, 성능·보안 점검을 통해 개발 환경을 안정화하는 단계이다. 아래 표를 따라 문서를 순차적으로 진행하면 배포 자동화, 테스트, 보안 체계까지 일관되게 운영할 수 있다.

| 단계 | 제목 | 주요 내용 | 상세 문서 |
| --- | --- | --- | --- |
| 61 | 개발 환경 배포 스크립트 준비 | 배포 스크립트 구조 설계, IaC/구성 관리 호출, 로그·재시도 전략 수립 | [step-61-deployment-script-prep.md](docs/aws-deployment/step-61-deployment-script-prep.md) |
| 62 | 네트워크 연결성 테스트 실행 | 내부/외부 서비스 연결 검증, DNS·보안 설정 점검, 로그 분석 | [step-62-network-connectivity-test.md](docs/aws-deployment/step-62-network-connectivity-test.md) |
| 63 | CI 파이프라인 전체 실행 리허설 | 전체 CI 파이프라인 실행, 품질 게이트 검증, 로그·아티팩트 검토 | [step-63-ci-rehearsal.md](docs/aws-deployment/step-63-ci-rehearsal.md) |
| 64 | CD 파이프라인 드라이 런 | 변경 계획 드라이 런, 파라미터 검증, 61단계 스크립트와 비교 | [step-64-cd-dry-run.md](docs/aws-deployment/step-64-cd-dry-run.md) |
| 65 | 개발 환경 최초 배포 실행 | CD 파이프라인 실제 배포, 로그·지표 분석, 롤백 대비 | [step-65-initial-dev-deployment.md](docs/aws-deployment/step-65-initial-dev-deployment.md) |
| 66 | 애플리케이션 헬스체크 구성 | 헬스체크 엔드포인트 정의, 로드 밸런서/프로브 설정, 알람 연동 | [step-66-healthcheck-configuration.md](docs/aws-deployment/step-66-healthcheck-configuration.md) |
| 67 | 애플리케이션 기능 검증 | QA 시나리오 실행, 결함 관리, 승인 보고 | [step-67-functional-validation.md](docs/aws-deployment/step-67-functional-validation.md) |
| 68 | 성능 테스트 계획 수립 | 성능 목표 설정, 시나리오/데이터 설계, 모니터링 전략 정의 | [step-68-performance-test-planning.md](docs/aws-deployment/step-68-performance-test-planning.md) |
| 69 | 성능 테스트 실행 | 부하 테스트 수행, 지표 분석, 최적화 과제 도출 | [step-69-performance-test-execution.md](docs/aws-deployment/step-69-performance-test-execution.md) |
| 70 | 보안 점검 수행 | IAM/네트워크/애플리케이션 보안 점검, 취약점 조치 계획 수립 | [step-70-security-review.md](docs/aws-deployment/step-70-security-review.md) |

### 61. 개발 환경 배포 스크립트 준비
- 세부 절차는 [상세 문서](docs/aws-deployment/step-61-deployment-script-prep.md)를 참고한다.
- 50단계 IaC와 29단계 CD 도구를 활용한 배포 스크립트를 작성하고 재실행 시 멱등성을 검증한다.

### 62. 네트워크 연결성 테스트 실행
- 세부 절차는 [상세 문서](docs/aws-deployment/step-62-network-connectivity-test.md)를 참고한다.
- 19단계 계획에 따라 내부/외부 연결성과 DNS를 점검하고 문제 발생 시 14~17단계 설계를 보완한다.

### 63. CI 파이프라인 전체 실행 리허설
- 세부 절차는 [상세 문서](docs/aws-deployment/step-63-ci-rehearsal.md)를 참고한다.
- 코드 커밋부터 테스트·아티팩트 업로드까지 리허설을 수행하고 실패 로그를 분석해 27~31단계 정의를 개선한다.

### 64. CD 파이프라인 드라이 런
- 세부 절차는 [상세 문서](docs/aws-deployment/step-64-cd-dry-run.md)를 참고한다.
- 실제 리소스 변경 없이 계획을 검증하고 61단계 스크립트와 비교해 차이를 해소한다.

### 65. 개발 환경 최초 배포 실행
- 세부 절차는 [상세 문서](docs/aws-deployment/step-65-initial-dev-deployment.md)를 참고한다.
- CD 파이프라인으로 dev 환경 첫 배포를 수행하고 로그·지표를 검토하여 기준선을 확립한다.

### 66. 애플리케이션 헬스체크 구성
- 세부 절차는 [상세 문서](docs/aws-deployment/step-66-healthcheck-configuration.md)를 참고한다.
- 로드 밸런서 및 애플리케이션 헬스체크를 구성하고 65단계 배포 결과로 정상 동작을 확인한다.

### 67. 애플리케이션 기능 검증
- 세부 절차는 [상세 문서](docs/aws-deployment/step-67-functional-validation.md)를 참고한다.
- QA 시나리오를 실행해 주요 기능을 검증하고 0단계 요구사항 대비 누락 사항을 기록한다.

### 68. 성능 테스트 계획 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-68-performance-test-planning.md)를 참고한다.
- 부하 수준·지표·성공 기준을 정의하고 26단계 관측 도구 구성을 반영한다.

### 69. 성능 테스트 실행
- 세부 절차는 [상세 문서](docs/aws-deployment/step-69-performance-test-execution.md)를 참고한다.
- 68단계 계획에 따라 부하 테스트를 수행하고 결과로 20·24·25단계 리소스 규모를 조정한다.

### 70. 보안 점검 수행
- 세부 절차는 [상세 문서](docs/aws-deployment/step-70-security-review.md)를 참고한다.
- 침투 테스트, IAM/네트워크 점검을 수행하고 12·17·31단계 기준에 따라 개선한다.

## 71~80단계 상세 가이드

71단계부터 80단계까지는 비용·감사 통제, 백업/운영 절차 검증, 자동화 기반 운영 체계를 완성하는 단계이다. 아래 표를 순차적으로 수행하면 운영 인수인계 전 필요한 준비와 검증 활동을 빠짐없이 진행할 수 있다.

| 단계 | 제목 | 주요 내용 | 상세 문서 |
| --- | --- | --- | --- |
| 71 | 비용 모니터링 알람 활성화 | AWS Budgets/Cost Anomaly 알람 구성, 채널 검증, 비용 기준선 수립 | [step-71-cost-monitoring-alerts.md](docs/aws-deployment/step-71-cost-monitoring-alerts.md) |
| 72 | 백업/DR 절차 테스트 | 복구 리허설 수행, RPO/RTO 측정, 개선 과제 도출 | [step-72-backup-dr-test.md](docs/aws-deployment/step-72-backup-dr-test.md) |
| 73 | 문서화 정비 | 아키텍처·운영 문서 최신화, 링크 정리, 버전 관리 | [step-73-documentation-refresh.md](docs/aws-deployment/step-73-documentation-refresh.md) |
| 74 | 운영 핸드오프 계획 수립 | 인수인계 범위 정의, 교육 일정·자료 준비, 책임자 지정 | [step-74-operations-handoff-plan.md](docs/aws-deployment/step-74-operations-handoff-plan.md) |
| 75 | 보안 사고 대응 절차 수립 | 사고 대응 시나리오, 연락체계, 비밀 회전·격리 절차 정의 | [step-75-security-incident-response.md](docs/aws-deployment/step-75-security-incident-response.md) |
| 76 | 접근 로그 및 감사 추적 검토 | CloudTrail/Config/Access Analyzer 구성, 로그 보존·검토 절차 확립 | [step-76-audit-trail-review.md](docs/aws-deployment/step-76-audit-trail-review.md) |
| 77 | 자동 스케일링 정책 설계 | Autoscaling/HPA 정책 정의, 임계값 산정, 모니터링 연계 | [step-77-auto-scaling-policy.md](docs/aws-deployment/step-77-auto-scaling-policy.md) |
| 78 | 유지보수 윈도우 및 패치 전략 수립 | 패치 주기/윈도우 결정, 자동화 절차 수립, 롤백 전략 문서화 | [step-78-maintenance-patch-strategy.md](docs/aws-deployment/step-78-maintenance-patch-strategy.md) |
| 79 | 알림/Incident 관리 연동 | Incident 도구 연동, 온콜 체계 검증, 알림 테스트 | [step-79-incident-management-integration.md](docs/aws-deployment/step-79-incident-management-integration.md) |
| 80 | 태그 및 자원 인벤토리 검증 | 태그 준수 점검, 미준수 리소스 수정, 인벤토리 보고 | [step-80-tag-inventory-validation.md](docs/aws-deployment/step-80-tag-inventory-validation.md) |

### 71. 비용 모니터링 알람 활성화
- 세부 절차는 [상세 문서](docs/aws-deployment/step-71-cost-monitoring-alerts.md)를 참고한다.
- 36단계 비용 모니터링 계획에 따라 Budgets/Cost Anomaly 알람을 생성하고 6단계 예산 한도와 일치하는지 확인한다.
- 테스트 알람을 발생시켜 통지 채널, 온콜 대상(79단계)까지 정상적으로 전달되는지 검증한다.

### 72. 백업/DR 절차 테스트
- 세부 절차는 [상세 문서](docs/aws-deployment/step-72-backup-dr-test.md)를 참고한다.
- 39단계 DR 전략을 기반으로 DB/스토리지 복구 테스트를 실행하고 53·55단계 리소스를 점검한다.
- 복구 시간(RTO)/데이터 손실(RPO)이 목표치에 부합하는지 기록하고 개선 조치를 도출한다.

### 73. 문서화 정비
- 세부 절차는 [상세 문서](docs/aws-deployment/step-73-documentation-refresh.md)를 참고한다.
- 아키텍처, 네트워크, 파이프라인, 운영 문서를 최신화하고 2·14·27단계 산출물과 링크를 재정리한다.
- 문서 버전을 기록해 74단계 인수인계 및 91단계 개발자 온보딩 자료로 재사용한다.

### 74. 운영 핸드오프 계획 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-74-operations-handoff-plan.md)를 참고한다.
- 운영팀 인수인계 범위(접근 권한, 알람 대응, 배포 절차)를 정의하고 책임자·일정을 확정한다.
- 73단계 정비한 문서와 교육 일정, 실습 자료를 준비해 승인 절차를 진행한다.

### 75. 보안 사고 대응 절차 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-75-security-incident-response.md)를 참고한다.
- 침해사고 발생 시 탐지→평가→격리→회복까지 단계별 시나리오를 정의하고 26단계 모니터링 알람을 연계한다.
- 시크릿 회전, 접근 차단 절차를 38단계 운영 정책과 정합되도록 구성한다.

### 76. 접근 로그 및 감사 추적 검토
- 세부 절차는 [상세 문서](docs/aws-deployment/step-76-audit-trail-review.md)를 참고한다.
- CloudTrail, AWS Config, IAM Access Analyzer 등 감사 서비스를 구성하고 로그 수집/보존 정책을 검토한다.
- 7단계 규제 요구사항과 8단계 거버넌스 기준 충족 여부를 평가하고 미비점은 개선 계획에 반영한다.

### 77. 자동 스케일링 정책 설계
- 세부 절차는 [상세 문서](docs/aws-deployment/step-77-auto-scaling-policy.md)를 참고한다.
- 20단계 컴퓨팅 선택에 맞는 Auto Scaling/ECS Service/K8s HPA 정책을 설계하고 대상 지표를 정의한다.
- 69단계 성능 테스트 결과와 26단계 모니터링 지표를 반영해 임계값과 알람을 설정한다.

### 78. 유지보수 윈도우 및 패치 전략 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-78-maintenance-patch-strategy.md)를 참고한다.
- OS/애플리케이션 패치 주기와 유지보수 윈도우를 정의하고 65단계 배포 일정과 조율한다.
- 51단계 구성 관리 도구를 활용해 패치 자동화/롤백 절차를 설계한다.

### 79. 알림/Incident 관리 연동
- 세부 절차는 [상세 문서](docs/aws-deployment/step-79-incident-management-integration.md)를 참고한다.
- PagerDuty, Slack, 이메일 등 Incident 관리 도구를 선택하고 온콜 스케줄·에스컬레이션 정책을 설정한다.
- 58단계 모니터링 알람과 71단계 비용 알람을 연동해 테스트 알람을 발송하고 대응 절차를 검증한다.

### 80. 태그 및 자원 인벤토리 검증
- 세부 절차는 [상세 문서](docs/aws-deployment/step-80-tag-inventory-validation.md)를 참고한다.
- 37단계 태깅 규칙과 35단계 레포지토리 거버넌스 기준에 따라 리소스 태그 및 인벤토리를 점검한다.
- 미준수 리소스를 수정하고 결과를 보고서로 정리하여 36단계 비용 관리 및 94단계 변경 관리 프로세스에 공유한다.

## 81~90단계 상세 가이드

81단계부터 90단계까지는 운영 통제 강화와 지속적 개선 체계를 완성하는 단계이다. 아래 표의 문서를 순차적으로 수행하면 보안·운영·비용 관리를 체계적으로 정비할 수 있다.

| 단계 | 제목 | 주요 내용 | 상세 문서 |
| --- | --- | --- | --- |
| 81 | 보안 정책 준수 감사 실시 | Security Hub/Config 기반 정책 준수 점검, 위반 시정, 보고 공유 | [step-81-security-compliance-audit.md](docs/aws-deployment/step-81-security-compliance-audit.md) |
| 82 | 원격 디버깅 및 로깅 접근 절차 수립 | 접근 채널 정의, 승인 절차/SOP 수립, 로그 감사 경로 설정 | [step-82-remote-debugging-access.md](docs/aws-deployment/step-82-remote-debugging-access.md) |
| 83 | 운영용 대시보드 구축 | 핵심 지표 통합, 시각화 구성, 알람 연동 검증 | [step-83-operations-dashboard.md](docs/aws-deployment/step-83-operations-dashboard.md) |
| 84 | SLA/SLI/SLO 정의 | 서비스 수준 요구 수집, SLI 측정 설계, 목표·보고 체계 수립 | [step-84-service-level-objectives.md](docs/aws-deployment/step-84-service-level-objectives.md) |
| 85 | 재해 복구 문서 및 연락망 정리 | DR Runbook 갱신, 연락망/에스컬레이션 정비, 승인·배포 | [step-85-dr-documentation-refresh.md](docs/aws-deployment/step-85-dr-documentation-refresh.md) |
| 86 | 비용 최적화 검토 | 비용 데이터 분석, 절감 기회 도출, 개선 계획 실행 | [step-86-cost-optimization-review.md](docs/aws-deployment/step-86-cost-optimization-review.md) |
| 87 | 보안 자동화 구현 | 반복 위반 자동 시정, 권한 구성, 테스트·운영 모니터링 | [step-87-security-automation.md](docs/aws-deployment/step-87-security-automation.md) |
| 88 | 성능 및 용량 계획 업데이트 | 운영 데이터 분석, 수요 예측, 용량 모델/계획 갱신 | [step-88-capacity-planning-update.md](docs/aws-deployment/step-88-capacity-planning-update.md) |
| 89 | 장애 대응 훈련 실시 | GameDay/Chaos 시나리오 실행, 대응 평가, 개선 과제 도출 | [step-89-incident-response-drill.md](docs/aws-deployment/step-89-incident-response-drill.md) |
| 90 | 운영 KPI 정의 및 추적 | KPI 정의·목표 설정, 보고 체계 구축, 개선 루프 연계 | [step-90-operations-kpi-definition.md](docs/aws-deployment/step-90-operations-kpi-definition.md) |

### 81. 보안 정책 준수 감사 실시
- 세부 절차는 [상세 문서](docs/aws-deployment/step-81-security-compliance-audit.md)를 참고한다.
- Security Hub, IAM Access Analyzer, Config 결과를 수집하고 70단계 보안 점검 대비 잔여 위험을 기록한다.
- 시정 조치와 감사 보고서를 작성해 74단계 운영 핸드오프 및 92단계 보안 교육 자료에 반영한다.

### 82. 원격 디버깅 및 로깅 접근 절차 수립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-82-remote-debugging-access.md)를 참고한다.
- Bastion/Session Manager 등 접근 채널과 승인가이드를 정의해 40·41단계 네트워크·IAM 설계와 연계한다.
- 로그 보존·감사 경로를 58·59단계 기준에 맞게 구성하고 89단계 장애 대응 훈련을 대비해 리허설한다.

### 83. 운영용 대시보드 구축
- 세부 절차는 [상세 문서](docs/aws-deployment/step-83-operations-dashboard.md)를 참고한다.
- 26·58단계에서 정의한 지표와 데이터 소스를 통합해 운영 현황 대시보드를 구성한다.
- 알람 테스트(71·79단계)를 통해 시각화와 온콜 채널 연계가 정상인지 검증한다.

### 84. SLA/SLI/SLO 정의
- 세부 절차는 [상세 문서](docs/aws-deployment/step-84-service-level-objectives.md)를 참고한다.
- 이해관계자 요구와 83단계 대시보드 지표를 기반으로 SLI 측정과 목표치를 정의한다.
- SLA 문서를 승인받아 90단계 KPI 및 97단계 정기 리뷰 지표와 연동한다.

### 85. 재해 복구 문서 및 연락망 정리
- 세부 절차는 [상세 문서](docs/aws-deployment/step-85-dr-documentation-refresh.md)를 참고한다.
- 39·72단계 DR 전략과 테스트 결과를 문서에 반영하고 연락망·에스컬레이션 체계를 최신화한다.
- 운영/보안 승인 후 89단계 장애 대응 훈련과 74단계 핸드오프 자료에 배포한다.

### 86. 비용 최적화 검토
- 세부 절차는 [상세 문서](docs/aws-deployment/step-86-cost-optimization-review.md)를 참고한다.
- Cost Explorer/Budgets 데이터를 태그 기준으로 분석해 6·36·71단계 예산 대비 초과 여부를 점검한다.
- 절감 과제를 정의해 77단계 스케일링 정책과 조율하고 결과를 97단계 리뷰 지표로 공유한다.

### 87. 보안 자동화 구현
- 세부 절차는 [상세 문서](docs/aws-deployment/step-87-security-automation.md)를 참고한다.
- 81단계 감사와 57단계 스캔 결과를 분석해 자동화 대상 위반 항목과 권한 구성을 설계한다.
- 샌드박스 검증 후 운영에 배포하고 79단계 Incident 알람 및 76단계 감사 로그와 연동한다.

### 88. 성능 및 용량 계획 업데이트
- 세부 절차는 [상세 문서](docs/aws-deployment/step-88-capacity-planning-update.md)를 참고한다.
- 83단계 대시보드와 69단계 테스트 결과를 비교해 여유 용량과 병목을 식별한다.
- 수요 예측을 반영해 스케일링 파라미터(77단계)와 투자 계획(98단계 로드맵)을 갱신한다.

### 89. 장애 대응 훈련 실시
- 세부 절차는 [상세 문서](docs/aws-deployment/step-89-incident-response-drill.md)를 참고한다.
- 75·79·82단계에서 정비한 Runbook과 접근 절차를 기반으로 GameDay/Chaos 훈련을 수행한다.
- 대응 결과를 평가해 개선 과제를 도출하고 96단계 포스트모템 및 92단계 교육에 반영한다.

### 90. 운영 KPI 정의 및 추적
- 세부 절차는 [상세 문서](docs/aws-deployment/step-90-operations-kpi-definition.md)를 참고한다.
- 가용성, MTTR, 배포 빈도 등 KPI를 정의하고 83·84·86단계 지표와 연계해 목표치를 설정한다.
- 보고/리뷰 주기를 정해 95단계 배포 기록과 97단계 정기 회의에 KPI 추세를 공유한다.

## 91~100단계 상세 가이드

91단계부터 100단계까지는 운영 지식 전파, 거버넌스 정착, 지속적 개선 체계를 완성하는 구간이다. 아래 표의 문서를 순차적으로 수행하면 개발→운영 전환과 고도화 계획을 안정적으로 마무리할 수 있다.

| 단계 | 제목 | 주요 내용 | 상세 문서 |
| --- | --- | --- | --- |
| 91 | 개발자 온보딩 자료 준비 | 온보딩 패키지 제작, 실습 환경 점검, 문서 정합성 검토 | [step-91-developer-onboarding-materials.md](docs/aws-deployment/step-91-developer-onboarding-materials.md) |
| 92 | 보안 교육 및 인식 제고 | 교육 목표 설정, 자료 제작, 참석 기록 및 평가 | [step-92-security-awareness-training.md](docs/aws-deployment/step-92-security-awareness-training.md) |
| 93 | 운영 자동화 스크립트 정리 | 자동화 후보 선정, 스크립트 구현, 로그/문서화 정비 | [step-93-operations-automation-scripts.md](docs/aws-deployment/step-93-operations-automation-scripts.md) |
| 94 | 감사 추적 및 변경 관리 프로세스 확립 | 변경 유형 정의, 워크플로우 구성, CI/CD·감사 연동 | [step-94-change-management-process.md](docs/aws-deployment/step-94-change-management-process.md) |
| 95 | 릴리즈 노트 및 배포 기록 관리 | 템플릿 정의, 메타데이터 자동 수집, 이해관계자 공유 | [step-95-release-notes-management.md](docs/aws-deployment/step-95-release-notes-management.md) |
| 96 | 장애 보고 및 사후 분석 프로세스 정립 | 포스트모템 트리거 설정, RCA 실행, 후속 조치 추적 | [step-96-incident-postmortem-process.md](docs/aws-deployment/step-96-incident-postmortem-process.md) |
| 97 | 정기 리뷰 및 개선 회의 운영 | 회의 주기 정의, KPI 검토, 개선 과제 관리 | [step-97-regular-review-meetings.md](docs/aws-deployment/step-97-regular-review-meetings.md) |
| 98 | 향후 기능 확장 대비 로드맵 업데이트 | 데이터 분석, 우선순위 재정의, 승인·커뮤니케이션 | [step-98-future-roadmap-update.md](docs/aws-deployment/step-98-future-roadmap-update.md) |
| 99 | 운영/개발 피드백 루프 구축 | 피드백 채널 설계, 프로세스 운영, 지표 관리 | [step-99-feedback-loop-establishment.md](docs/aws-deployment/step-99-feedback-loop-establishment.md) |
| 100 | 최종 운영 인수 및 고도화 계획 승인 | 인수인계 검증, 성숙도 리뷰, 고도화 계획 확정 | [step-100-operations-handover-approval.md](docs/aws-deployment/step-100-operations-handover-approval.md) |

### 91. 개발자 온보딩 자료 준비
- 세부 절차는 [상세 문서](docs/aws-deployment/step-91-developer-onboarding-materials.md)를 참고한다.
- 73단계 문서화 정비와 74단계 핸드오프 계획을 바탕으로 계정 신청부터 배포까지 따라할 수 있는 온보딩 패키지를 구성한다.
- 실습 환경과 자료를 점검해 온보딩 세션을 준비하고, 설문 결과를 99단계 피드백 루프 개선 항목으로 연결한다.

### 92. 보안 교육 및 인식 제고
- 세부 절차는 [상세 문서](docs/aws-deployment/step-92-security-awareness-training.md)를 참고한다.
- 75단계 사고 대응 절차와 81단계 감사 결과를 반영해 교육 커리큘럼과 자료를 준비한다.
- 교육 일정·참석 기록을 관리하고 이해도 평가 결과를 94단계 변경 관리 및 99단계 피드백 루프와 공유한다.

### 93. 운영 자동화 스크립트 정리
- 세부 절차는 [상세 문서](docs/aws-deployment/step-93-operations-automation-scripts.md)를 참고한다.
- 51·61단계 구성/배포 스크립트를 기반으로 반복 작업을 자동화하고 IAM 권한을 검토한다.
- 실행 로그를 58·59단계 모니터링 시스템과 연동하고 Runbook·온보딩 자료를 업데이트한다.

### 94. 감사 추적 및 변경 관리 프로세스 확립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-94-change-management-process.md)를 참고한다.
- 변경 유형과 역할, 승인 절차를 정의하고 도구에 템플릿·필수 필드를 구성한다.
- CI/CD 파이프라인과 감사 로그를 변경 요청 ID와 연동해 95단계 릴리즈 기록과 일관성을 유지한다.

### 95. 릴리즈 노트 및 배포 기록 관리
- 세부 절차는 [상세 문서](docs/aws-deployment/step-95-release-notes-management.md)를 참고한다.
- 릴리즈 노트 템플릿을 정의하고 43~49단계 CI/CD 메타데이터를 자동으로 수집한다.
- 배포 후 결과를 기록해 이해관계자와 공유하고 90·97단계 지표와 리포트에 반영한다.

### 96. 장애 보고 및 사후 분석(포스트모템) 프로세스 정립
- 세부 절차는 [상세 문서](docs/aws-deployment/step-96-incident-postmortem-process.md)를 참고한다.
- 포스트모템 트리거와 역할을 정의하고 Incident 로그, 릴리즈 기록(95단계)을 기반으로 RCA를 수행한다.
- 후속 조치를 등록해 97단계 정기 회의와 98단계 로드맵 개선 과제에 반영한다.

### 97. 정기 리뷰 및 개선 회의 운영
- 세부 절차는 [상세 문서](docs/aws-deployment/step-97-regular-review-meetings.md)를 참고한다.
- 회의 주기와 의제를 정의하고 86·88·90단계 지표, 95단계 릴리즈 기록을 사전 준비한다.
- 회의 결과를 개선 과제로 등록해 추적하고 요약을 99단계 피드백 채널에 공유한다.

### 98. 향후 기능 확장 대비 로드맵 업데이트
- 세부 절차는 [상세 문서](docs/aws-deployment/step-98-future-roadmap-update.md)를 참고한다.
- 97단계 회의 결과와 86·88단계 리포트를 분석해 우선순위를 재조정하고 로드맵 초안을 작성한다.
- 34단계 승인 절차로 로드맵을 확정하고 커뮤니케이션 후 추적 체계를 업데이트한다.

### 99. 운영/개발 피드백 루프 구축
- 세부 절차는 [상세 문서](docs/aws-deployment/step-99-feedback-loop-establishment.md)를 참고한다.
- 피드백 채널과 프로세스를 설계하고 91·92단계 교육, 97단계 회의와 연계한다.
- 수집된 피드백을 분류·추적해 94단계 변경 관리와 98단계 로드맵 개선에 반영한다.

### 100. 최종 운영 인수 및 고도화 계획 승인
- 세부 절차는 [상세 문서](docs/aws-deployment/step-100-operations-handover-approval.md)를 참고한다.
- 74단계 핸드오프 체크리스트와 95·96·99단계 산출물을 검증해 인수 준비 상태를 확인한다.
- 운영 성숙도 리뷰와 고도화 계획을 승인받아 최종 전환 일정을 공지하고 지원 체계를 확정한다.

