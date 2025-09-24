# 61단계. 개발 환경 배포 스크립트 준비

## 목적
- 50단계 IaC 산출물과 29단계 CD 도구 구성을 활용하여 개발 환경(dev)에 배포 가능한 스크립트를 완성한다.
- 재실행 시 멱등성을 보장하고 배포 자동화를 위한 공통 진입점을 마련한다.

## 선행조건
- [50단계 IaC 배포 템플릿](docs/aws-deployment/step-50-iac-deployment-templates.md) 완성.
- [29단계 CD 도구 선정](docs/aws-deployment/step-29-cd-tool-selection.md) 및 [49단계 CD 부트스트랩](docs/aws-deployment/step-49-cd-tool-bootstrap.md) 완료.
- [51단계 구성 관리 계획](docs/aws-deployment/step-51-configuration-management-plan.md)과 [52단계 설정 파일 준비](docs/aws-deployment/step-52-application-config-prep.md) 산출물 확보.

## 필요한 입력 자료
- IaC 템플릿(CloudFormation, Terraform 등)과 파라미터 파일.
- 배포 파이프라인 정의(CD 툴 파이프라인 YAML/JSON 등).
- 환경 변수/시크릿 매핑 테이블, 배포 타겟 정보(계정, 리전, VPC 등).

## 상세 절차
1. **배포 전략 정의**
   - 배포 실행 주체(CI/CD, 개발자 로컬, 운영 스크립트)를 명확히 한다.
   - 롤백/재시도 방식을 33단계 정책과 맞춘다.
2. **스크립트 구조 설계**
   - `scripts/deploy-dev.sh` 또는 CD 파이프라인 템플릿 등 공통 실행 진입점을 정의한다.
   - 입력 파라미터(버전, 환경, 기능 플래그 등)를 명시하고 기본값을 설정한다.
3. **IaC 호출 로직 구현**
   - IaC 템플릿을 호출하여 네트워크, 컴퓨팅, 데이터 계층을 배포한다.
   - 51단계 구성 관리 도구(Ansible, SSM 등) 호출 로직을 포함한다.
4. **시크릿/설정 주입 처리**
   - 45단계 빌드 시크릿 주입 방식과 일치하도록 Parameter Store, Secrets Manager 연동을 구현한다.
   - 민감 정보를 로그에서 마스킹한다.
5. **검증 및 에러 핸들링 추가**
   - 주요 단계마다 성공 여부를 확인하고 실패 시 명확한 오류 메시지를 출력한다.
   - 로그를 CloudWatch나 S3에 업로드해 추적 가능성을 확보한다.
6. **문서화 및 버전 관리**
   - 사용법을 README 또는 `docs/runbooks/deploy-dev.md`에 기록하고 git에 커밋한다.
   - 73단계 문서 정비 시 참고할 수 있도록 변경 이력을 남긴다.

## 의사결정 포인트
- 스크립트를 CLI 형태로 유지할지, CD 파이프라인에서만 실행할지 여부.
- IaC 변경 검증을 위한 드라이런 옵션 사용 여부(Terraform plan, CloudFormation change set 등).
- 배포 대상 리전/계정 확장 시 파라미터화 전략.

## 체크리스트
- [ ] 배포 스크립트가 버전 관리되고 코드 리뷰를 통과했다.
- [ ] 파라미터/시크릿이 안전하게 주입되고 로깅 정책을 준수한다.
- [ ] 실패 시 재시도 및 롤백 절차가 문서화되었다.
- [ ] 실행 로그 저장 위치와 접근 절차가 정의되었다.

## 산출물 및 보관 위치
- 배포 스크립트(`scripts/deploy-dev.sh`, `cd/pipelines/deploy-dev.yml` 등).
- 실행 가이드 문서(`docs/runbooks/deploy-dev.md`).
- IaC 파라미터 파일(`infra/iac/dev/parameters.json`).

## 다음 단계 연계
- 64단계 CD 파이프라인 드라이 런에서 스크립트를 호출하여 결과를 검증한다.
- 65단계 최초 배포, 95단계 배포 기록 작성 시 실행 로그를 재활용한다.
- 71단계 비용 알람 구성 시 배포 스크립트 실행 결과를 참고하여 리소스 변화를 추적한다.
