---
title: 78단계. 유지보수 윈도우 및 패치 전략 수립
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 78단계. 유지보수 윈도우 및 패치 전략 수립

## 목적
- 운영 중단을 최소화하면서 OS/애플리케이션 패치를 적용할 수 있도록 유지보수 윈도우와 자동화 전략을 수립한다.
- 51단계 구성 관리 도구와 65단계 배포 절차를 연계하여 패치 적용, 롤백, 검증 프로세스를 명확히 한다.

## 선행조건
- [51단계 구성 관리 계획](docs/04-operations/approved/aws-rollout/step-51-configuration-management-plan.md) 및 도구 설정 완료.
- [65단계 최초 배포](docs/04-operations/approved/aws-rollout/step-65-initial-dev-deployment.md) 결과와 배포 스크립트 사용 방법 파악.
- [75단계 사고 대응 절차](docs/04-operations/approved/aws-rollout/step-75-security-incident-response.md)와 [77단계 스케일링 정책](docs/04-operations/approved/aws-rollout/step-77-auto-scaling-policy.md) 내용 확인.

## 필요한 입력 자료
- 서비스 가용성 요구사항(SLA/SLO), 고객 통지 정책, 규제 준수 기준.
- 패치 우선순위 목록(CVE, 보안 공지), 패치 테스트 환경 정보.
- 운영팀 온콜 일정, 유지보수 윈도우 후보 시간대, 승인 체계.

## 상세 절차
1. **유지보수 윈도우 정의**
   - 트래픽 분석을 통해 최소 영향 시간대를 파악하고 정기/비정기 유지보수 윈도우를 결정한다.
   - 고객/내부 커뮤니케이션 계획, 사전 공지 기간을 문서화한다.
2. **패치 프로세스 설계**
   - 패치 식별→검토→테스트→배포→검증→롤백 단계별 책임자와 체크리스트를 정의한다.
   - 구성 관리 도구(Ansible, SSM, Systems Manager Patch Manager 등)를 활용한 자동화 흐름을 설계한다.
3. **테스트 및 검증 전략 수립**
   - 스테이징 환경에서 패치를 적용하고 67단계 기능 테스트, 66단계 헬스체크를 재실행한다.
   - 실패 시 롤백 절차와 데이터 백업(72단계)을 연계한다.
4. **운영 및 모니터링 연계**
   - 유지보수 중 모니터링 지표, 알람 임시 조정, Incident 채널 공지 절차를 정의한다.
   - 패치 완료 후 스케일링 정책(77단계)이 정상화되도록 확인한다.
5. **문서화 및 승인**
   - 패치 계획서, 체크리스트, 보고 템플릿을 작성한다.
   - 운영 책임자/보안팀 승인을 받아 유지보수 일정표에 반영한다.

## 의사결정 포인트
- 패치를 Blue/Green 또는 Rolling 방식으로 적용할지 여부.
- 자동 패치 적용(Managed Services)과 수동 검토의 균형을 어떻게 조정할지 여부.
- 고객 공지를 얼마나 사전에 할지, 비상 패치 시 승인 절차를 단축할지 여부.

## 체크리스트
- [ ] 유지보수 윈도우 일정과 커뮤니케이션 계획이 문서화되었다.
- [ ] 패치 프로세스와 롤백 절차가 정의되고 테스트되었다.
- [ ] 구성 관리 도구를 통한 패치 자동화가 검증되었다.
- [ ] 승인 및 보고 템플릿이 준비되어 운영/보안팀 승인을 받았다.

## 산출물 및 보관 위치
- 유지보수 정책 문서 (`docs/operations/maintenance-policy.md`).
- 패치 실행 체크리스트 (`docs/runbooks/patch-management-checklist.md`).
- 패치 결과 보고서 (`reports/patch-summary-YYMMDD.md`).

## 다음 단계 연계
- 79단계 Incident 관리 연동 시 유지보수 공지 및 알람 억제 정책을 포함한다.
- 86단계 비용 최적화 검토에서 유지보수로 인한 리소스 조정 비용을 평가한다.
- 95단계 배포 기록 관리에 패치 이력을 통합한다.
