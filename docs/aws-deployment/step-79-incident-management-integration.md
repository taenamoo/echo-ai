# 79단계. 알림/Incident 관리 연동

## 목적
- 모니터링, 비용, 보안 경보를 PagerDuty·Slack·이메일 등 Incident 관리 도구와 연동하여 온콜 대응 체계를 완성한다.
- 74단계 운영 핸드오프 계획과 75단계 사고 대응 절차에서 정의한 역할을 실제 알림 흐름에 반영한다.

## 선행조건
- [58단계 모니터링 인프라 생성](docs/aws-deployment/step-58-monitoring-logging-provisioning.md)으로 경보 소스 구축 완료.
- [71단계 비용 알람 활성화](docs/aws-deployment/step-71-cost-monitoring-alerts.md) 및 [75단계 사고 대응 절차](docs/aws-deployment/step-75-security-incident-response.md) 정비 완료.
- [74단계 운영 핸드오프 계획](docs/aws-deployment/step-74-operations-handoff-plan.md)에서 정의한 온콜 일정과 연락망 확보.

## 필요한 입력 자료
- 온콜 스케줄, 에스컬레이션 정책, 책임자 연락처.
- 알림 채널 설정 정보(SNS 토픽, Slack Webhook, PagerDuty API 키 등).
- 테스트 시나리오(모니터링 경보, 비용 초과, 보안 사고) 및 성공 기준.

## 상세 절차
1. **Incident 도구 구성**
   - PagerDuty/ServiceNow Ops Center 등 선택한 도구에 서비스, 팀, 에스컬레이션 정책을 생성한다.
   - 온콜 일정과 역할을 74단계 계획에 따라 입력한다.
2. **알림 소스 연동**
   - CloudWatch Alarm, Budgets, GuardDuty 등 경보 소스를 SNS/웹훅/이메일을 통해 Incident 도구로 연결한다.
   - 채널별 라우팅 규칙(심각도, 서비스, 시간대)을 설정한다.
3. **테스트 알람 실행**
   - 각 경보 유형별 테스트를 수행해 알림 수신, 에스컬레이션, 확인(Acknowledge) 흐름을 검증한다.
   - Slack/이메일 등 보조 채널로도 알림이 전달되는지 확인한다.
4. **Runbook 및 대응 절차 통합**
   - Incident 도구 티켓 템플릿에 75단계 보안 Runbook, 72단계 DR Runbook 링크를 포함한다.
   - 대응 완료 후 보고서를 95단계 배포 기록/Incident 로그에 연계한다.
5. **운영 모니터링 및 개선**
   - 초기 운영 기간 동안 알림 빈도, 응답 시간, 노이즈를 분석한다.
   - 필요 시 임계값 조정, 알림 억제(Suppression), 운영 로테이션 개선을 추진한다.

## 의사결정 포인트
- 온콜을 단일 팀이 담당할지, 서비스별로 분리할지 여부.
- Slack, Teams 등 협업 도구와 어떤 방식으로 통합할지 여부.
- 알림 억제/자동 해결 기능을 어느 정도까지 사용할지 여부.

## 체크리스트
- [ ] Incident 관리 도구에 서비스/팀/에스컬레이션 정책이 설정되었다.
- [ ] 모니터링, 비용, 보안 경보가 Incident 도구와 성공적으로 연동되었다.
- [ ] 테스트 알람이 온콜 담당자에게 전달되고 응답 시간이 기록되었다.
- [ ] Runbook 링크와 보고 절차가 Incident 티켓 템플릿에 포함되었다.

## 산출물 및 보관 위치
- Incident 관리 구성 문서 (`docs/operations/incident-integration.md`).
- 온콜 일정표 (`records/oncall-schedule.xlsx`).
- 테스트 알람 결과 로그 (`reports/incident-alert-test-YYMMDD.md`).

## 다음 단계 연계
- 89단계 장애 대응 훈련에서 Incident 도구를 활용한 시뮬레이션을 수행한다.
- 90단계 운영 KPI 정의 시 응답 시간, 해결 시간 데이터를 활용한다.
- 95단계 배포 기록 및 96단계 포스트모템 프로세스와 Incident 로그를 연계한다.
