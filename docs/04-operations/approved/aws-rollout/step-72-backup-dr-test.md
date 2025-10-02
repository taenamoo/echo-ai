---
title: 72단계. 백업/DR 절차 테스트
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 72단계. 백업/DR 절차 테스트

## 목적
- 39단계에서 수립한 백업 및 재해 복구 전략을 실제로 검증하여 복구 목표(RPO/RTO)를 충족하는지 확인한다.
- 53~55단계에서 구축한 데이터 계층 리소스의 복구 절차를 표준화하고 반복 가능한 Runbook을 마련한다.

## 선행조건
- [39단계 백업·DR 전략](docs/04-operations/approved/aws-rollout/step-39-backup-dr-strategy.md)과 복구 목표 정의 완료.
- [53단계 데이터베이스 프로비저닝](docs/04-operations/approved/aws-rollout/step-53-database-provisioning.md) 및 [54단계 마이그레이션](docs/04-operations/approved/aws-rollout/step-54-database-initialization-migration.md) 결과 확보.
- [55단계 캐시/메시지 서비스 생성](docs/04-operations/approved/aws-rollout/step-55-cache-messaging-provisioning.md)과 [58단계 모니터링 인프라](docs/04-operations/approved/aws-rollout/step-58-monitoring-logging-provisioning.md) 구성 완료.

## 필요한 입력 자료
- 백업 스케줄, 스냅샷/아카이브 위치, 암호화 키 정보.
- 복구 테스트 시나리오(전체 장애, 부분 장애, 리전 장애 등) 및 성공 기준.
- 테스트에 참여하는 담당자 목록, 연락처, 승인 문서.

## 상세 절차
1. **테스트 범위 및 일정 확정**
   - 복구 시나리오를 선정하고 테스트 환경(별도 계정/리전)을 준비한다.
   - 서비스 영향 최소화를 위해 일정과 커뮤니케이션 계획을 공지한다.
2. **복구 실행 단계별 Runbook 준비**
   - DB 스냅샷 복원, 로그 재생, 권한/네트워크 설정 복구 절차를 정리한다.
   - 캐시/메시지 큐 재생성, DNS 전환, 애플리케이션 설정 주입 절차를 포함한다.
3. **복구 테스트 수행**
   - Runbook에 따라 단계별로 복구를 수행하고 주요 지표(복구 소요 시간, 데이터 손실)를 기록한다.
   - 모니터링 대시보드에서 서비스 상태를 확인하고 알람이 정상 동작하는지 점검한다.
4. **검증 및 승인**
   - 복구된 시스템이 애플리케이션 기능 테스트(67단계) 기준을 충족하는지 확인한다.
   - 이해관계자에게 결과를 공유하고 승인 서명을 확보한다.
5. **개선 사항 도출 및 문서화**
   - 목표 대비 미달 항목, 장애 요인, 수동 작업을 분석한다.
   - 개선 과제를 39단계 DR 문서와 75단계 사고 대응 절차에 반영한다.

## 의사결정 포인트
- 복구 테스트를 운영 시간 중에 실행할지, 별도 유지보수 윈도우(78단계)에 배치할지 여부.
- 테스트 환경을 별도 계정/리전으로 분리할지, 기존 dev/stage 환경을 사용할지 여부.
- 자동화 도구(CloudEndure, AWS Backup) 도입 여부와 수동 절차 병행 수준.

## 체크리스트
- [ ] 복구 테스트 계획이 승인되고 일정/책임자가 지정되었다.
- [ ] 모든 복구 단계에서 로그와 근거 자료가 수집되었다.
- [ ] RPO/RTO 목표를 충족하거나 개선 계획이 수립되었다.
- [ ] Runbook과 결과 보고가 버전 관리 시스템에 업로드되었다.

## 산출물 및 보관 위치
- 복구 테스트 보고서 (`reports/dr-test-YYMMDD.md`).
- 업데이트된 DR Runbook (`docs/runbooks/dr-recovery.md`).
- CloudWatch 대시보드/알람 검증 스크린샷.

## 다음 단계 연계
- 75단계 사고 대응 절차에 복구 흐름과 연락망을 연계한다.
- 85단계 재해 복구 문서 정리 시 테스트 결과와 연락처 목록을 반영한다.
- 88단계 용량 계획 업데이트에 복구 테스트에서 확인된 리소스 요구 사항을 활용한다.
