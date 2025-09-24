# 82단계. 원격 디버깅 및 로깅 접근 절차 수립

## 목적
- 운영 중 장애가 발생했을 때 안전하고 감사 가능한 방식으로 원격 접근 및 로깅을 수행할 수 있도록 절차를 정립한다.
- 74단계 운영 인수인계 시 운영팀이 표준화된 접근 경로를 활용해 문제를 해결할 수 있도록 지원한다.

## 선행조건
- [40단계 개발용 네트워크 구축](docs/aws-deployment/step-40-dev-network-build.md) 결과로 Bastion/VPN 구성이 완료되어야 한다.
- [41단계 IAM 프로비저닝](docs/aws-deployment/step-41-iam-provisioning.md)에서 운영/지원 역할이 구분되어 있어야 한다.
- [58단계 모니터링/로그 인프라](docs/aws-deployment/step-58-monitoring-logging-provisioning.md) 및 [73단계 문서화 정비](docs/aws-deployment/step-73-documentation-refresh.md)가 최신 상태여야 한다.

## 필요한 입력 자료
- 접근 제어 정책, MFA 및 세션 제한 정책 문서.
- AWS Systems Manager Session Manager, Bastion host, VPN 구성 정보.
- 로그 수집 경로(CloudWatch Logs, OpenSearch, S3 등)와 접근 권한 목록.

## 상세 절차
1. **접근 채널 식별 및 책임자 지정**
   - Bastion Host, Session Manager, AWS Console 등 허용된 채널을 정의하고 책임자를 할당한다.
   - 각 채널별 접근 권한과 승인 절차를 41단계 IAM 역할과 매핑한다.
2. **접근 절차 문서화**
   - 접근 신청→승인→세션 수립→로그 수집→세션 종료 순으로 표준 운영 절차를 작성한다.
   - Session Manager 사용 시 로그 저장 S3 버킷/CloudWatch Logs 그룹을 명시한다.
3. **보안 통제 적용**
   - MFA, 시간 제한, 명령 기록 등 통제를 활성화하고 81단계 감사 기준에 맞춰 증적을 남긴다.
   - 네트워크 접근 제어(17단계 보안 정책)와 연계하여 승인된 IP/사용자만 접속 가능하도록 한다.
4. **로그 접근 및 보존 전략 확정**
   - 애플리케이션/시스템 로그 위치를 정의하고 필요한 경우 Athena/QuickSight 조회 템플릿을 만든다.
   - 59단계 로그 보존 정책과 정합성을 확인한다.
5. **리허설 및 교육 수행**
   - 운영팀과 함께 모의 장애 상황을 실행하여 절차를 검증하고 개선 사항을 반영한다.
   - 74단계 핸드오프 자료와 91단계 온보딩 문서에 절차를 포함한다.

## 의사결정 포인트
- Bastion Host vs. Session Manager 등 기본 접근 채널 선택.
- 로그 열람에 대한 운영팀 자율 접근 허용 여부 및 승인 체계.
- 비상 접근 계정을 둘지, 일반 계정에서 승격 절차를 사용할지 결정.

## 체크리스트
- [ ] 허용된 접근 채널과 책임자가 문서화되었다.
- [ ] 접근 및 로그 열람 절차가 표준 운영 절차(SOP)로 정리되었다.
- [ ] 접근 로그가 중앙 저장소에 기록되고 감사 가능함을 검증했다.
- [ ] 운영팀과 리허설을 수행하고 개선 사항을 반영했다.

## 산출물 및 보관 위치
- 원격 접근 SOP (`docs/operations/runbooks/remote-access.md`).
- 접근 제어 매트릭스 (`docs/security/access-matrix.xlsx`).
- 리허설 결과 보고서 (`reports/operations/remote-access-drill-YYMMDD.pdf`).

## 다음 단계 연계
- 89단계 장애 대응 훈련에서 원격 접근 절차를 활용해 실전 대응 능력을 검증한다.
- 90단계 운영 KPI 정의 시 접근 승인/해제 시간 등의 지표를 포함할 수 있다.
- 93단계 운영 자동화 스크립트 정리 시 표준화된 접근/로그 수집 스크립트를 버전 관리한다.
