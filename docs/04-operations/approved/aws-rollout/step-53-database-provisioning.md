---
title: 53단계. 데이터베이스 프로비저닝
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 53단계. 데이터베이스 프로비저닝

## 목적
- 23단계에서 수립한 데이터베이스 계획에 따라 실제 AWS 데이터베이스 리소스를 생성하고 보안 구성을 적용한다.
- 39단계 백업/DR 전략과 연동 가능한 기본 구성(RPO/RTO, 백업 스케줄)을 마련한다.

## 선행조건
- [23단계 데이터베이스 계획](docs/04-operations/approved/aws-rollout/step-23-database-planning.md) 및 [39단계 백업·DR 전략](docs/04-operations/approved/aws-rollout/step-39-backup-dr-strategy.md).
- 17단계 네트워크 보안 정책과 37단계 태깅 규칙.
- 41단계에서 생성한 DB 관리용 IAM 역할 또는 자격 증명.

## 필요한 입력 자료
- 데이터베이스 엔진/버전, 인스턴스 클래스, 스토리지, 가용성 요구사항.
- 보안 그룹, 서브넷 그룹, 파라미터 그룹 설정값.
- 백업 유지 기간, 암호화 키(KMS) 정보.

## 상세 절차
1. **프로비저닝 파라미터 확정**
   - 인스턴스 크기, 스토리지 유형(IOPS 포함), 멀티 AZ 여부를 결정한다.
   - 자동 백업, 스냅샷 일정, 유지 기간을 정의한다.
2. **네트워크 및 보안 구성**
   - DB 서브넷 그룹에 16단계에서 정의한 서브넷을 지정한다.
   - 보안 그룹 인바운드 규칙을 애플리케이션 서브넷/보안 그룹만 허용하도록 설정한다.
   - IAM DB 인증 또는 Secrets Manager 연동 여부를 결정한다.
3. **프로비저닝 실행**
   - Terraform/CloudFormation/CDK 등 IaC 또는 AWS CLI/콘솔로 리소스를 생성한다.
   - 생성 로그와 변경 세부사항을 95단계 배포 기록 양식에 맞춰 저장한다.
4. **기본 설정 적용**
   - 파라미터 그룹, 옵션 그룹(RDS) 등 엔진별 설정을 적용한다.
   - 이벤트 알림, Enhanced Monitoring, Performance Insights 등 관측 옵션을 활성화한다.
5. **백업/DR 구성 확인**
   - 스냅샷 및 복제(리드 리플리카, 글로벌 데이터베이스 등) 구성을 적용한다.
   - 복구 테스트 일정(72단계)과 연계하여 스냅샷 이름 규칙을 정한다.
6. **보안/감사 검증**
   - CloudTrail, Config, Security Hub에서 리소스 생성 기록을 확인한다.
   - 암호화(KMS), 로그(CloudWatch, Audit logs) 설정이 요구사항에 맞는지 검토한다.

## 의사결정 포인트
- 단일 AZ vs. 멀티 AZ 배치.
- 암호화 키(KMS CMK vs. AWS 관리형) 선택.
- 백업 저장 비용과 복구 목표에 맞는 유지 기간 설정.

## 체크리스트
- [ ] DB 인스턴스가 계획된 파라미터로 생성되었다.
- [ ] 보안 그룹/네트워크 구성이 검증되었다.
- [ ] 백업/모니터링/로그 설정이 활성화되었다.
- [ ] 프로비저닝 결과와 설정값이 문서화되었다.

## 산출물 및 보관 위치
- IaC 템플릿 및 변수 (`infra/databases/` 등).
- DB 구성 보고서 (`docs/reports/database-provisioning.md`).
- 백업/복제 설정 문서 (`docs/runbooks/database-backup.md`).

## 다음 단계 연계
- 54단계 데이터베이스 초기화 및 마이그레이션에서 본 단계 리소스를 사용한다.
- 65단계 최초 배포 시 애플리케이션 연결 테스트를 수행한다.
- 72단계 백업/DR 테스트 계획에 프로비저닝 정보를 반영한다.
