# 75단계. 보안 사고 대응 절차 수립

## 목적
- 잠재적 보안 사고 발생 시 신속하게 탐지·평가·격리·복구할 수 있는 표준 대응 절차를 수립한다.
- 26단계 모니터링 체계와 38단계 시크릿 운영 정책을 연계하여 위협 대응 자동화 수준을 향상한다.

## 선행조건
- [26단계 모니터링 및 로깅 프레임워크](docs/aws-deployment/step-26-monitoring-logging-framework.md) 설계와 [58단계 인프라 구축](docs/aws-deployment/step-58-monitoring-logging-provisioning.md) 완료.
- [38단계 시크릿 운영 정책](docs/aws-deployment/step-38-secrets-operations.md) 및 [71단계 비용 알람](docs/aws-deployment/step-71-cost-monitoring-alerts.md) 구성 내용 참조.
- [72단계 DR 테스트](docs/aws-deployment/step-72-backup-dr-test.md) 결과와 [79단계 Incident 연동](docs/aws-deployment/step-79-incident-management-integration.md) 계획 활용.

## 필요한 입력 자료
- 위협 시나리오 목록(자격 증명 유출, 네트워크 침해, 데이터 유출 등)과 영향도 분석.
- 주요 연락처/에스컬레이션 체계, 법무/컴플라이언스 요구사항.
- AWS 서비스 가이드(Security Hub, GuardDuty, IAM Access Analyzer 등) 및 기존 Runbook.

## 상세 절차
1. **사고 분류 기준 정의**
   - 심각도(Sev1~Sev3), 영향 범위, 대응 SLA를 설정한다.
   - 법적/규제 보고 의무가 있는 시나리오를 구분한다.
2. **탐지 및 경보 단계 설계**
   - GuardDuty, Security Hub, CloudTrail 이벤트 등 탐지 소스를 목록화한다.
   - 58단계 모니터링/79단계 Incident 채널과 연동하여 경보 플로우를 정의한다.
3. **평가 및 의사결정 흐름 구성**
   - 사고 발생 시 최초 평가자, 승인자, 의사결정 권한을 명시한다.
   - 증거 수집, 포렌식 절차, 커뮤니케이션 템플릿을 마련한다.
4. **격리 및 완화 조치 정의**
   - IAM 자격 증명 비활성화, 네트워크 ACL 차단, 인스턴스 격리 절차를 문서화한다.
   - 시크릿 회전, 키 교체, 패치 적용 등 후속 조치를 포함한다.
5. **복구 및 사후 분석 절차 마련**
   - 서비스 복구 단계와 검증 절차를 정리하고, DR Runbook(72단계)과 연계한다.
   - 사고 보고서 템플릿과 포스트모템 일정(96단계)을 정의한다.

## 의사결정 포인트
- 보안 사고 대응을 내부 팀이 전담할지, MSSP/외부 업체와 협력할지 여부.
- 자동화(예: AWS Systems Manager Automation, Lambda)로 격리 조치를 수행할지 여부.
- 커뮤니케이션 채널(내부/외부 공지, 고객 통지)의 승인 경로를 어떻게 구성할지 여부.

## 체크리스트
- [ ] 사고 대응 Runbook이 작성되고 이해관계자의 검토를 통과했다.
- [ ] 경보→평가→격리→복구의 단계별 책임자와 SLA가 정의되었다.
- [ ] 시크릿 회전, 접근 차단 자동화 스크립트가 테스트되었다.
- [ ] 사고 보고/포스트모템 템플릿이 준비되고 변경 관리 프로세스와 연계되었다.

## 산출물 및 보관 위치
- 보안 Incident Runbook (`docs/runbooks/security-incident.md`).
- 에스컬레이션 연락처 목록 (`records/security-contacts.xlsx`).
- 자동화 스크립트/플레이북 (`scripts/automation/incident-response/`).

## 다음 단계 연계
- 79단계 Incident 관리 연동 테스트 시 보안 사고 시나리오를 포함한다.
- 89단계 장애 대응 훈련에서 보안 사고 GameDay를 수행해 절차를 검증한다.
- 96단계 포스트모템 프로세스와 연계하여 지속적인 개선을 추진한다.
