---
title: 80단계. 태그 및 자원 인벤토리 검증
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 80단계. 태그 및 자원 인벤토리 검증

## 목적
- AWS 리소스에 37단계에서 정의한 태깅 규칙이 일관되게 적용되었는지 확인하고, 인벤토리 보고를 통해 미준수 항목을 시정한다.
- 태깅 및 인벤토리 결과를 비용 관리(36단계), 감사 추적(76단계), 변경 관리(94단계)에 활용할 수 있도록 정리한다.

## 선행조건
- [35단계 저장소 거버넌스](docs/04-operations/approved/aws-rollout/step-35-repository-governance.md)와 [37단계 태그 정책](docs/04-operations/approved/aws-rollout/step-37-resource-tagging.md) 준수 기준 확보.
- [58단계 모니터링 인프라](docs/04-operations/approved/aws-rollout/step-58-monitoring-logging-provisioning.md) 및 [76단계 감사 추적 검토](docs/04-operations/approved/aws-rollout/step-76-audit-trail-review.md) 완료.
- [71단계 비용 알람](docs/04-operations/approved/aws-rollout/step-71-cost-monitoring-alerts.md)에서 사용되는 비용 할당 태그 목록 확인.

## 필요한 입력 자료
- 태깅 표준 문서, 필수/선택 태그 목록, 예외 승인 절차.
- AWS Config/AWS Resource Explorer/Tag Editor 보고서, 또는 내부 인벤토리 스크립트 결과.
- 리소스별 책임자 목록과 수정 권한.

## 상세 절차
1. **검증 범위 및 도구 선정**
   - 계정/리전/서비스 범위를 정의하고 AWS Tag Editor, Config, CLI 스크립트 등 점검 도구를 선택한다.
   - IaC 템플릿과 실제 리소스 간 태깅 일관성을 확인한다.
2. **인벤토리 수집 및 분석**
   - 필수 태그 누락, 값 형식 오류, 만료된 태그 등을 식별한다.
   - 리소스별 책임자에게 결과를 공유하고 수정 기한을 설정한다.
3. **시정 조치 및 검증**
   - IaC/수동 작업으로 태그를 보완하고 재검증 보고서를 생성한다.
   - 변경 사항이 CloudTrail/Config 로그에 기록되는지 확인한다.
4. **보고서 작성 및 공유**
   - 미준수 리소스, 시정 조치, 추후 개선 계획을 정리한다.
   - 비용 분석(36단계), 감사 대응(81단계) 팀과 공유한다.
5. **지속적인 관리 체계 확립**
   - 정기 점검 주기와 책임자를 지정하고 자동화 스크립트를 버전 관리한다.
   - 변경 관리 프로세스(94단계)에 태깅 검증 단계를 포함한다.

## 의사결정 포인트
- 태그 검증을 수동 점검으로 할지, AWS Config Rule/스케줄 스크립트로 자동화할지 여부.
- 예외 처리(필수 태그 적용 불가 리소스)에 대한 승인 기준과 보완 전략.
- 인벤토리 보고 주기를 월간/분기별로 설정할지 여부.

## 체크리스트
- [ ] 필수 태그 목록과 실제 리소스 태그 상태가 비교되어 미준수 항목이 식별되었다.
- [ ] 시정 조치가 완료되고 재검증 보고서가 생성되었다.
- [ ] 인벤토리 보고서가 비용/보안/운영팀과 공유되었다.
- [ ] 정기 점검 주기와 자동화 스크립트 관리 계획이 수립되었다.

## 산출물 및 보관 위치
- 태그 검증 보고서 (`reports/tag-audit-YYMMDD.xlsx`).
- 자동화 스크립트 (`scripts/compliance/tag-audit/`).
- 태그 표준/예외 관리 문서 (`docs/governance/tagging-standards.md`).

## 다음 단계 연계
- 86단계 비용 최적화 검토에서 태그 기반 비용 분석에 활용한다.
- 90단계 KPI 정의 시 태그를 활용한 리소스 사용 지표를 구성한다.
- 94단계 변경 관리 프로세스에 태깅 검증 승인 단계를 포함한다.
