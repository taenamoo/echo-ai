---
title: 66단계. 애플리케이션 헬스체크 구성
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 66단계. 애플리케이션 헬스체크 구성

## 목적
- 애플리케이션과 인프라 구성 요소에 대한 헬스체크 경로와 임계값을 설정하여 가용성을 보장한다.
- 65단계 최초 배포 이후 서비스 상태를 자동으로 감지하고 알람으로 연계한다.

## 선행조건
- [65단계 최초 배포](docs/04-operations/approved/aws-rollout/step-65-initial-dev-deployment.md) 완료.
- [26단계 모니터링 프레임워크](docs/04-operations/approved/aws-rollout/step-26-monitoring-logging-framework.md)와 [58단계 관측 인프라](docs/04-operations/approved/aws-rollout/step-58-monitoring-logging-provisioning.md) 구성.
- [52단계 설정 파일](docs/04-operations/approved/aws-rollout/step-52-application-config-prep.md)에서 헬스체크 엔드포인트가 정의되어야 한다.

## 필요한 입력 자료
- 로드 밸런서, Target Group, ECS/EKS 서비스 설정.
- 애플리케이션 헬스체크 엔드포인트 URL 및 응답 포맷.
- 헬스체크 임계값(정상/비정상 판정 횟수, 타임아웃, 주기).

## 상세 절차
1. **대상 자원 식별**
   - ALB, NLB, API Gateway, ECS/EKS, Lambda 등 헬스체크가 필요한 자원을 목록화한다.
   - 내부 서비스, 비동기 워커 등 추가 검증이 필요한 구성 요소를 포함한다.
2. **헬스체크 엔드포인트 정의**
   - 애플리케이션에 `/healthz`, `/readyz` 등 엔드포인트를 구현하고 의존 리소스(DB, 캐시) 상태를 포함할지 결정한다.
   - 인증/인가가 필요한 경우 토큰 또는 IP 제한을 설정한다.
3. **인프라 설정 적용**
   - 로드 밸런서 Target Group 헬스체크 경로, 간격, 실패 허용치를 설정한다.
   - ECS/EKS의 liveness/readiness probe를 구성하고 IaC 템플릿에 반영한다.
4. **알람 연계**
   - CloudWatch Alarm, SNS/Slack 알림을 설정하여 실패 시 즉시 통지되도록 한다.
   - 75단계 사고 대응 절차에 맞춰 알람 수신자와 대응 플로우를 확인한다.
5. **테스트 및 검증**
   - 의도적으로 헬스체크 실패를 유도하여 알람과 복구 동작을 확인한다.
   - 67단계 기능 검증과 병행하여 정상 상태 지표를 기록한다.
6. **문서화 및 유지보수 계획**
   - 헬스체크 엔드포인트, 설정 값, 담당자를 문서화한다.
   - 변경 시 34단계 승인 절차를 통해 관리한다.

## 의사결정 포인트
- 헬스체크에 외부 의존성을 포함할지 여부(예: DB 연결 확인 vs 기본 페이지 응답).
- 헬스체크 실패 시 자동 롤백/재시작 정책 설정.
- 알람 통지 채널과 에스컬레이션 경로.

## 체크리스트
- [ ] 모든 주요 서비스에 헬스체크가 구성되었다.
- [ ] 알람이 정상적으로 발송되고 대응 절차가 확인되었다.
- [ ] 헬스체크 설정이 IaC 및 구성 관리에 반영되었다.
- [ ] 문서화 및 운영 핸드북이 업데이트되었다.

## 산출물 및 보관 위치
- 헬스체크 설정 파일(IaC, Kubernetes 매니페스트 등).
- 알람 구성 문서(`docs/runbooks/healthcheck-monitoring.md`).
- 테스트 로그 및 알람 캡처.

## 다음 단계 연계
- 67단계 기능 검증 시 헬스체크와 연계된 지표를 활용한다.
- 79단계 Incident 대응 전략에 헬스체크 트리거를 포함한다.
- 92단계 운영 SLA 정의에 헬스체크 기준을 반영한다.
