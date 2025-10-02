---
title: 83단계. 운영용 대시보드 구축
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 83단계. 운영용 대시보드 구축

## 목적
- 운영팀이 서비스 상태를 실시간으로 확인할 수 있도록 핵심 지표 대시보드를 구축한다.
- 26단계에서 정의한 관측 지표와 67·69단계 테스트 결과를 통합하여 운영 기준선을 마련한다.

## 선행조건
- [26단계 모니터링/로깅 프레임워크](docs/04-operations/approved/aws-rollout/step-26-monitoring-logging-framework.md)에서 정의한 지표와 도구 구성이 완료되어야 한다.
- [58단계 모니터링/로그 인프라 구축](docs/04-operations/approved/aws-rollout/step-58-monitoring-logging-provisioning.md) 및 [69단계 성능 테스트 실행](docs/04-operations/approved/aws-rollout/step-69-performance-test-execution.md) 결과가 확보되어야 한다.
- [73단계 문서화 정비](docs/04-operations/approved/aws-rollout/step-73-documentation-refresh.md)에서 최신 아키텍처/서비스 맵이 정리되어 있어야 한다.

## 필요한 입력 자료
- 서비스별 KPI, SLI 후보 지표 목록.
- CloudWatch Metrics, OpenSearch 대시보드, Prometheus/Grafana 등 데이터 소스 연결 정보.
- 알람 기준(71단계 비용 알람, 79단계 Incident 연동)과 온콜 연락처 정보.

## 상세 절차
1. **지표 우선순위 선정**
   - 가용성, 지연시간, 오류율, 처리량 등 필수 지표를 선정하고 84단계 SLO 정의와 정합성을 맞춘다.
   - 26단계 지표 카탈로그에서 운영팀과 협의하여 우선순위를 확정한다.
2. **데이터 소스 통합 구성**
   - CloudWatch, X-Ray, Custom Metrics 등 필요한 소스를 연결하고 권한을 설정한다.
   - 시각화 도구(Grafana/QuickSight 등)에 데이터 소스를 등록하고 갱신 주기를 설정한다.
3. **대시보드 설계 및 제작**
   - 서비스별/계층별 패널을 구성하고 임계값 색상, 주석, 링크(Runbook)를 포함한다.
   - 82단계 원격 디버깅 절차와 연계해 문제 발생 시 참조할 문서를 연결한다.
4. **검증 및 튜닝**
   - 운영팀과 함께 대시보드를 검토하고 테스트 알람(71·79단계)을 발생시켜 시각화가 적절히 반영되는지 확인한다.
   - 노이즈가 많거나 불필요한 지표는 제거하고 대시보드를 최적화한다.
5. **배포 및 운영 인수**
   - 접근 권한을 설정하고 온콜 채널에 공유한다.
   - 대시보드 변경 프로세스를 문서화하여 94단계 변경 관리에 포함한다.

## 의사결정 포인트
- 대시보드 도구를 AWS 네이티브(CloudWatch)로 통일할지, 외부 SaaS/온프레미스 도구와 혼용할지 여부.
- 공용 대시보드와 팀별 맞춤 대시보드를 분리할지 결정.
- 실시간 데이터 vs. 배치 데이터 중 어떤 업데이트 주기를 사용할지 선택.

## 체크리스트
- [ ] 핵심 지표 목록과 대시보드 레이아웃이 합의되었다.
- [ ] 데이터 소스 연결 및 권한 구성이 완료되었다.
- [ ] 운영팀과 검증을 수행하여 알람과 연동이 확인되었다.
- [ ] 대시보드 운영/변경 절차가 문서화되었다.

## 산출물 및 보관 위치
- 대시보드 구성 문서 (`docs/operations/dashboards/overview.md`).
- Grafana/QuickSight 내보내기 설정 (`dashboards/*.json` 또는 `.dash`).
- 검증 회의록 (`minutes/operations/dashboard-review-YYMMDD.md`).

## 다음 단계 연계
- 84단계 SLA/SLI/SLO 정의에 대시보드 지표를 기반으로 측정 방법을 제공한다.
- 90단계 운영 KPI 정의 시 해당 대시보드를 참조하여 KPI 시각화를 구현한다.
- 97단계 정기 리뷰 회의에서 대시보드 지표를 활용해 개선 과제를 도출한다.
