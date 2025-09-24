# 71단계. 비용 모니터링 알람 활성화

## 목적
- 36단계에서 정의한 비용 모니터링 전략을 실제 AWS 서비스(Budgets, Cost Anomaly Detection, CloudWatch)로 구현한다.
- 비용 초과 징후를 조기에 포착하여 6단계에서 수립한 예산 한도를 지키고 대응 체계를 확립한다.

## 선행조건
- [6단계 예산 및 비용 한도 설정](docs/aws-deployment/step-06-budget-planning.md) 산출물 확보.
- [36단계 비용 모니터링 계획](docs/aws-deployment/step-36-cost-monitoring.md)과 비용 기준선 정의 완료.
- [58단계 모니터링 인프라 생성](docs/aws-deployment/step-58-monitoring-logging-provisioning.md)으로 알람 전송 채널 구성.

## 필요한 입력 자료
- 월간/분기별 예산 한도, 알람 임계값, 서비스별 비용 책임자 목록.
- AWS 계정/OU 구조와 태그 기반 비용 할당 키(Tag keys) 정보.
- Incident/온콜 연락처 목록 및 [79단계 알림 연동](docs/aws-deployment/step-79-incident-management-integration.md)을 위한 채널 정보.

## 상세 절차
1. **비용 기준선 및 알람 정책 재검토**
   - 최신 사용량 리포트와 예산 한도를 비교하여 임계값(예: 80%, 100%, 120%)을 확정한다.
   - 서비스/환경별로 태그 또는 계정 단위 알람 필요 여부를 검토한다.
2. **AWS Budgets 구성**
   - 월간 예산과 실제/예측(Actual/Forecast) 기준 알람을 생성한다.
   - SNS/이메일 수신자를 설정하고, `AWS Chatbot` 또는 PagerDuty 연동 여부를 결정한다.
3. **Cost Anomaly Detection 및 CloudWatch 경보 설정**
   - Cost Explorer에서 Anomaly Monitor를 활성화하고 평가 주기를 설정한다.
   - 필요 시 CloudWatch Metric Alarm을 구성하여 사용량 기반 임계값을 감시한다.
4. **테스트 알람 발송 및 확인**
   - Budgets 테스트 기능 또는 임시 예산을 활용해 경보를 발생시킨다.
   - 79단계 Incident 채널에서 알림 수신, 에스컬레이션 정책이 정상 동작하는지 확인한다.
5. **운영 Runbook 및 대응 시나리오 정비**
   - 비용 초과 시 조치(서비스 축소, 예약 인스턴스 구매, 승인 절차)를 문서화한다.
   - 대응 결과를 기록할 템플릿을 준비하고 36단계 비용 관리 문서에 반영한다.

## 의사결정 포인트
- 비용 알람을 계정/OU 단위로 분리할지, 태그 기반으로 세분화할지 여부.
- Budgets 외에 AWS Cost Anomaly Detection 또는 서드파티(CloudHealth 등)를 병행할지 여부.
- 알람 전달 채널을 이메일, Slack, PagerDuty 등 어느 방식으로 표준화할지 여부.

## 체크리스트
- [ ] Budgets/Anomaly Monitor가 활성화되고 임계값이 예산 정책과 일치한다.
- [ ] 테스트 알람이 온콜 채널(79단계)로 전달되어 대응 로그가 남았다.
- [ ] 비용 대응 Runbook이 최신화되어 운영팀과 공유되었다.
- [ ] 알람 수신자 목록과 연락처가 버전 관리된다.

## 산출물 및 보관 위치
- AWS Budgets 및 Cost Anomaly Detection 설정 스크린샷/Export 파일.
- 비용 대응 Runbook (`docs/runbooks/cost-incident.md`).
- 테스트 알람 결과 보고 (`reports/cost-alert-test-YYMMDD.md`).

## 다음 단계 연계
- 86단계 비용 최적화 검토에서 알람 데이터를 활용해 절감 과제를 도출한다.
- 79단계 Incident 관리 연동과 연결하여 에스컬레이션 정책을 운영한다.
- 80단계 태그 검증 결과를 반영해 비용 알람의 필터 조건을 조정한다.
