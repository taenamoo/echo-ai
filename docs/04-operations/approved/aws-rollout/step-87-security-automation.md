---
title: 87단계. 보안 자동화 구현
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 87단계. 보안 자동화 구현

## 목적
- 반복적으로 발생하는 보안 위반을 자동으로 탐지하고 시정하여 운영 부담을 줄이고 보안 수준을 향상시킨다.
- 81단계 보안 감사 결과를 기반으로 자동화 우선순위를 설정한다.

## 선행조건
- [57단계 보안 스캔 운영](docs/04-operations/approved/aws-rollout/step-57-security-scan-review.md)과 [81단계 보안 정책 준수 감사](docs/04-operations/approved/aws-rollout/step-81-security-compliance-audit.md) 결과가 준비되어야 한다.
- [76단계 감사 추적 검토](docs/04-operations/approved/aws-rollout/step-76-audit-trail-review.md)에서 로그 수집/보존이 정상 동작해야 한다.
- [75단계 보안 사고 대응 절차](docs/04-operations/approved/aws-rollout/step-75-security-incident-response.md)에서 정의된 대응 단계와 일치해야 한다.

## 필요한 입력 자료
- 반복 위반 항목 목록 및 우선순위.
- AWS Config Rules, Security Hub Custom Action, Lambda/Step Functions 템플릿.
- 권한 위임(IAM 역할) 및 네트워크 접근 제어 정보.

## 상세 절차
1. **자동화 대상 선정**
   - 81단계 감사 결과와 57단계 스캔 보고서를 분석하여 자동화 대상 위반 항목을 식별한다.
   - 위험도와 발생 빈도를 기준으로 우선순위를 정한다.
2. **아키텍처 설계**
   - 감지 → 평가 → 시정 → 알림 흐름을 설계하고 필요한 서비스(Config, EventBridge, Lambda 등)를 결정한다.
   - 변경 사항이 IaC(4단계 결정)에 반영될 수 있도록 모듈 구조를 설계한다.
3. **자동화 구현**
   - Lambda/Step Functions/Systems Manager Automation 문서를 작성하여 시정 조치를 구현한다.
   - 필요한 IAM 역할과 권한을 정의하고 최소 권한 원칙을 적용한다.
4. **테스트 및 검증**
   - 샌드박스/개발 계정에서 위반 시나리오를 재현하고 자동화가 올바르게 작동하는지 확인한다.
   - 실패 시 롤백 전략과 수동 개입 경로를 문서화한다.
5. **배포 및 운영 모니터링**
   - 운영 계정에 배포하고 알림(79단계 Incident 도구)을 연동한다.
   - 자동화 결과 로그를 76단계 감사 추적 시스템에 기록하여 추적성을 확보한다.

## 의사결정 포인트
- 완전 자동 시정 vs. 승인 후 자동화 등 운영 모델 결정.
- 보안팀 단독 운영 vs. 운영팀과 공동 운영 여부.
- 교차 계정 자동화 시 역할 위임 방식을 어떻게 구성할지 여부.

## 체크리스트
- [ ] 자동화 대상과 우선순위가 문서화되었다.
- [ ] 자동화 아키텍처 및 권한 구성이 승인되었다.
- [ ] 테스트 시나리오를 통해 자동화 동작이 검증되었다.
- [ ] 운영 배포 및 모니터링 체계가 구축되었다.

## 산출물 및 보관 위치
- 자동화 설계 문서 (`docs/security/automation/architecture.md`).
- Lambda/Step Functions 코드 (`infra/security-automation/`).
- 테스트 및 검증 기록 (`reports/security/automation-validation-YYMMDD.md`).

## 다음 단계 연계
- 89단계 장애 대응 훈련 시 보안 위반 시나리오를 자동화와 함께 검증한다.
- 92단계 보안 교육에서 자동화 절차와 책임을 공유한다.
- 94단계 변경 관리 프로세스에 자동화 배포 승인 단계를 포함한다.
