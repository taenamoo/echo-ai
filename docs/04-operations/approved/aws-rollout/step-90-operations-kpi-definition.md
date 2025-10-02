---
title: 90단계. 운영 KPI 정의 및 추적
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 90단계. 운영 KPI 정의 및 추적

## 목적
- 운영 효율성과 안정성을 측정하기 위한 핵심 성과 지표(KPI)를 정의하고 추적 체계를 수립한다.
- 83단계 대시보드와 84단계 SLO, 86단계 비용 분석 결과를 통합하여 경영 지표를 구성한다.

## 선행조건
- [83단계 운영 대시보드](docs/04-operations/approved/aws-rollout/step-83-operations-dashboard.md)와 [84단계 SLA/SLI/SLO 정의](docs/04-operations/approved/aws-rollout/step-84-service-level-objectives.md)가 완료되어야 한다.
- [86단계 비용 최적화 검토](docs/04-operations/approved/aws-rollout/step-86-cost-optimization-review.md)와 [89단계 장애 대응 훈련](docs/04-operations/approved/aws-rollout/step-89-incident-response-drill.md) 결과가 확보되어야 한다.
- [79단계 Incident 관리 연동](docs/04-operations/approved/aws-rollout/step-79-incident-management-integration.md)에서 KPI 데이터 연동이 가능한 상태여야 한다.

## 필요한 입력 자료
- 기존 운영 지표 목록, SLA/SLO 목표, 비용/리소스 사용량 데이터.
- 온콜/Incident 도구에서 제공하는 이벤트 및 해결 시간 데이터.
- 배포 빈도, 실패율 등 DevOps Metrics(CD 파이프라인 로그, 65단계 배포 기록).

## 상세 절차
1. **KPI 후보 수집 및 분류**
   - 가용성, MTTR, 배포 빈도, 실패율, 비용 등 KPI 후보를 수집한다.
   - 이해관계자(운영/개발/경영)와 협의하여 비즈니스 영향도를 평가한다.
2. **정의 및 계산 방식 확정**
   - 각 KPI의 계산 방법, 데이터 소스, 측정 주기를 정의한다.
   - 83단계 대시보드 또는 79단계 Incident 도구에서 자동 수집 가능한지 확인한다.
3. **목표치 및 임계값 설정**
   - 84단계 SLO, 86단계 비용 목표와 정합성을 맞추어 목표치/경고 기준을 설정한다.
   - 임계값 초과 시 대응 절차(75단계)와 커뮤니케이션 플로우를 정의한다.
4. **보고 체계 설계**
   - 주간/월간 리포트 형식을 정하고 자동화(93단계 스크립트)를 고려한다.
   - 경영진/운영팀 등 대상별 맞춤 대시보드 또는 보고서를 설계한다.
5. **운영 및 개선 루프 수립**
   - KPI 리뷰 회의 주기와 책임자를 지정하고 97단계 정기 리뷰와 연계한다.
   - KPI 추세를 기반으로 98단계 로드맵과 99단계 피드백 루프에 반영한다.

## 의사결정 포인트
- KPI 공개 범위(전사 vs. 운영팀 제한) 결정.
- 자동화된 리포트 생성 도구 선택(QuickSight, Looker, Google Sheets 등).
- KPI 목표 미달 시 보상/징계 등 정책 여부 결정.

## 체크리스트
- [ ] KPI 목록과 정의, 데이터 소스가 문서화되었다.
- [ ] 목표치/임계값과 대응 절차가 합의되었다.
- [ ] 보고 템플릿과 배포 일정이 설정되었다.
- [ ] KPI 운영 및 개선 루프가 수립되었다.

## 산출물 및 보관 위치
- KPI 정의 문서 (`docs/operations/kpi-definitions.md`).
- 보고 템플릿 (`templates/operations/kpi-report.pptx`).
- KPI 추적 대시보드/시트 (`dashboards/operations/kpi-tracker.xlsx`).

## 다음 단계 연계
- 95단계 배포 기록, 96단계 포스트모템과 연계하여 KPI 변동 원인을 분석한다.
- 97단계 정기 리뷰에서 KPI 추세를 공유하고 개선 과제를 결정한다.
- 100단계 운영 인수 승인 시 KPI 상태를 보고하여 안정성 입증 자료로 활용한다.
