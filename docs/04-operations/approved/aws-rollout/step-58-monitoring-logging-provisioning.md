---
title: 58단계. 모니터링/로깅 인프라 생성
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 58단계. 모니터링/로깅 인프라 생성

## 목적
- 26단계에서 정의한 관측 프레임워크에 따라 CloudWatch, OpenSearch, Grafana 등 모니터링 및 로깅 리소스를 실제로 구축한다.
- 79단계 Incident 관리 연계가 가능하도록 알람/통지 채널을 구성한다.

## 선행조건
- [26단계 모니터링 및 로깅 프레임워크](docs/04-operations/approved/aws-rollout/step-26-monitoring-logging-framework.md).
- [36단계 비용 모니터링 초안](docs/04-operations/approved/aws-rollout/step-36-cost-monitoring.md) 및 [37단계 태깅 규칙](docs/04-operations/approved/aws-rollout/step-37-resource-tagging.md).
- 41단계 IAM 역할, 43단계 CI 인프라, 45단계 시크릿 주입 설정.

## 필요한 입력 자료
- 수집 대상 지표/로그 목록, 보존 기간, 알람 임계값.
- 대시보드 요구사항(SLA/SLI, 운영 KPI).
- 통지 채널(Slack, 이메일, PagerDuty) 정보 및 자격 증명.

## 상세 절차
1. **수집 파이프라인 설계 확정**
   - 로그 소스(애플리케이션, ALB, VPC Flow Logs 등)와 목적지(CloudWatch Logs, OpenSearch)를 매핑한다.
   - 메트릭 수집 방식(CloudWatch Agent, Prometheus 등)을 정의한다.
2. **리소스 생성 및 권한 설정**
   - 로그 그룹, 메트릭 네임스페이스, 대시보드, SNS 토픽 등을 생성한다.
   - IAM 역할에 필요한 정책을 부여하고 KMS 암호화를 적용한다.
3. **수집 에이전트 배포**
   - 51단계 구성 관리 도구 또는 50단계 IaC 템플릿을 활용해 CloudWatch Agent/Fluent Bit 등을 배포한다.
   - 구성 파일에 태그, 환경, 서비스 이름을 포함한다.
4. **알람 및 통지 구성**
   - 지표/로그 기반 알람을 생성하고 SNS, PagerDuty, Slack 등과 연동한다.
   - 90단계 KPI 추적을 위해 주요 지표를 대시보드로 시각화한다.
5. **테스트 및 튜닝**
   - 63단계 CI 리허설 또는 샘플 애플리케이션 이벤트로 로그/지표가 정상 수집되는지 확인한다.
   - 알람이 예상대로 발송되는지 테스트하고 임계값을 조정한다.
6. **운영 문서화**
   - 대시보드 위치, 알람 목록, 대응 Runbook을 정리한다.
   - 74단계 운영 핸드오프 자료에 포함하고 79단계 Incident 관리와 연계한다.

## 의사결정 포인트
- 관리형 서비스(CloudWatch, X-Ray) vs. 자체 호스팅(OpenSearch, Prometheus) 선택.
- 로그 보존 기간과 아카이빙 전략.
- 알람 노이즈를 줄이기 위한 임계값/집계 전략.

## 체크리스트
- [ ] 모든 주요 서비스에 대한 로그/지표 수집이 구성되었다.
- [ ] 알람이 통지 채널과 연동되어 테스트되었다.
- [ ] 대시보드가 정의된 SLA/SLO를 시각화한다.
- [ ] 운영 Runbook이 작성되었다.

## 산출물 및 보관 위치
- 모니터링 IaC/스크립트 (`infra/monitoring/`, `scripts/observability/`).
- 대시보드 정의 파일(JSON) 및 알람 구성 문서 (`docs/reports/monitoring-setup.md`).
- 운영 Runbook (`docs/runbooks/observability.md`).

## 다음 단계 연계
- 59단계 로그 보존 정책 적용에서 본 단계 리소스를 활용한다.
- 79단계 Incident 관리 연동, 83단계 대시보드 구축과 직접 연결된다.
- 86단계 비용 최적화 검토 시 수집/보존 비용 데이터를 제공한다.
