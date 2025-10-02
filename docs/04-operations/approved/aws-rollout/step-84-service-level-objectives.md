---
title: 84단계. SLA/SLI/SLO 정의
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 84단계. SLA/SLI/SLO 정의

## 목적
- 서비스 수준 계약(SLA), 서비스 수준 지표(SLI), 서비스 수준 목표(SLO)를 명확히 정의하여 운영 품질을 관리한다.
- 83단계에서 구축한 대시보드와 연동해 지속적으로 지표를 모니터링하고 개선 사이클을 수립한다.

## 선행조건
- [83단계 운영용 대시보드](docs/04-operations/approved/aws-rollout/step-83-operations-dashboard.md)에서 주요 지표가 시각화되어 있어야 한다.
- [68단계 성능 테스트 계획](docs/04-operations/approved/aws-rollout/step-68-performance-test-planning.md) 및 [69단계 성능 테스트 실행](docs/04-operations/approved/aws-rollout/step-69-performance-test-execution.md) 결과로 기준 데이터를 확보해야 한다.
- [74단계 운영 핸드오프 계획](docs/04-operations/approved/aws-rollout/step-74-operations-handoff-plan.md)에서 운영 책임 및 대응 체계가 정리되어 있어야 한다.

## 필요한 입력 자료
- 고객/내부 이해관계자의 서비스 수준 요구사항.
- 과거 장애/성능 데이터, 테스트 결과, 현재 모니터링 지표.
- 계약 조건, 벌칙 조항 또는 내부 KPI 기준.

## 상세 절차
1. **비즈니스 요구사항 수집**
   - 이해관계자 인터뷰를 통해 가용성, 응답시간, 데이터 일관성 등 요구사항을 수집한다.
   - 0단계 요구사항 문서 및 9단계 로드맵과 연계하여 서비스 수준을 조율한다.
2. **SLI 후보 정의 및 측정 방법 설계**
   - 가용성(업타임), 오류율, 지연시간 등 SLI를 정의하고 측정 방식(대시보드 지표, 로그 분석)을 결정한다.
   - 83단계 대시보드에 해당 지표가 노출되는지 확인하고 필요 시 추가 패널을 구성한다.
3. **SLO 목표치 설정**
   - 측정 데이터와 산업 표준을 참고하여 목표치를 설정한다(예: 월간 가용성 99.9%).
   - 목표치 달성 실패 시 대응 계획(알람, 역량 강화)을 정의한다.
4. **SLA 문서화 및 승인**
   - 외부 고객 대상이라면 SLA 문서를 작성하여 법무·영업 검토를 받고, 내부 서비스라면 운영 정책에 포함한다.
   - 벌칙 조항, 예외 상황, 유지보수 윈도우(78단계) 등을 명시한다.
5. **운영 및 리뷰 프로세스 수립**
   - SLO 모니터링 주기, 보고 양식, 책임자를 지정하고 90단계 KPI 추적과 연계한다.
   - 목표 미달 시 RCA(96단계) 및 개선 계획 수립 절차를 정의한다.

## 의사결정 포인트
- 외부 SLA를 공개할지 내부 목표로 제한할지 여부.
- 월간/분기별 등 측정 및 보고 주기 결정.
- 벌칙/보상 조항을 포함할지, 또는 내부 개선 중심으로 운영할지 선택.

## 체크리스트
- [ ] SLI 정의와 측정 방법이 문서화되었다.
- [ ] SLO 목표치와 예외/완화 조치가 합의되었다.
- [ ] SLA 문서(또는 내부 정책)가 승인되었다.
- [ ] 모니터링 및 리뷰 주기, 책임자가 지정되었다.

## 산출물 및 보관 위치
- SLA/SLO 문서 (`docs/operations/sla-slo-policy.md`).
- SLI 측정 정의서 (`docs/operations/sli-definitions.xlsx`).
- 월간/분기 보고 템플릿 (`templates/operations/slo-report.docx`).

## 다음 단계 연계
- 90단계 운영 KPI 정의에서 SLA/SLO 결과를 KPI로 포함한다.
- 96단계 장애 포스트모템 시 SLO 미달 원인을 분석한다.
- 97단계 정기 리뷰 회의 안건에 SLO 추세를 포함한다.
