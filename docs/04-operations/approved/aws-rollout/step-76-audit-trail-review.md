---
title: 76단계. 접근 로그 및 감사 추적 검토
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 76단계. 접근 로그 및 감사 추적 검토

## 목적
- AWS CloudTrail, Config, IAM Access Analyzer 등 감사 추적 서비스를 활성화하고 로그 보존/검토 절차를 확립한다.
- 7단계 규제 요구사항과 8단계 거버넌스 원칙을 만족하는지 확인하여 감사 대비 준비 상태를 확보한다.

## 선행조건
- [7단계 보안 및 규제 요구사항 분석](docs/04-operations/approved/aws-rollout/step-07-security-compliance.md) 결과 확보.
- [8단계 거버넌스 원칙](docs/04-operations/approved/aws-rollout/step-08-governance-principles.md)과 [37단계 태그 정책](docs/04-operations/approved/aws-rollout/step-37-resource-tagging.md) 정의 완료.
- [58단계 모니터링 인프라](docs/04-operations/approved/aws-rollout/step-58-monitoring-logging-provisioning.md) 및 [59단계 로그 보존 정책](docs/04-operations/approved/aws-rollout/step-59-log-collection-retention.md) 적용 완료.

## 필요한 입력 자료
- 감사 대상 서비스 목록, 규제/컴플라이언스 요구사항, 감사 보고 템플릿.
- 로그 보존 기간, 암호화 키(KMS) 설정, 접근 제어 목록.
- CloudTrail/Config/Access Analyzer 현재 상태 및 비용 추정 정보.

## 상세 절차
1. **감사 범위 정의 및 현황 점검**
   - 규제 요구사항에 따라 필수 서비스(CloudTrail, Config, VPC Flow Logs 등)를 목록화한다.
   - 기존 구성의 활성화 여부, 로그 전달 대상(S3, CloudWatch Logs)을 확인한다.
2. **서비스 구성 및 표준화**
   - Organization Trail 또는 계정별 Trail을 설정하고 암호화·다중 리전 기록을 활성화한다.
   - AWS Config 규칙, Conformance Pack을 배포하여 정책 준수 여부를 모니터링한다.
   - IAM Access Analyzer, CloudTrail Lake, Detective 등의 추가 서비스 필요 여부를 평가한다.
3. **보존 및 접근 제어 정책 정비**
   - 로그 저장소의 라이프사이클, 암호화, 접근 제어를 59단계 정책과 일치시킨다.
   - 감사 로그 접근 절차와 승인 프로세스를 문서화한다.
4. **검토 및 보고 절차 수립**
   - 정기 검토 주기(주간/월간)를 정의하고 책임자를 지정한다.
   - 이상 탐지, 변경 이력 요약, 감사 발견 사항을 보고하는 템플릿을 마련한다.
5. **테스트 및 개선**
   - 샘플 이벤트를 생성해 로그 수집/전달/보고 흐름이 정상인지 확인한다.
   - 개선 과제를 75단계 사고 대응 절차 및 94단계 변경 관리 프로세스에 반영한다.

## 의사결정 포인트
- CloudTrail을 Organization 단위로 통합할지, 계정별 Trail을 유지할지 여부.
- AWS Config 규칙을 AWS 관리형으로 사용할지, 맞춤형(Custom Rule)을 개발할지 여부.
- 감사 로그 저장소를 단일 S3 버킷으로 집중할지, 서비스별로 분리할지 여부.

## 체크리스트
- [ ] CloudTrail/Config/IAM Access Analyzer가 활성화되고 범위가 문서화되었다.
- [ ] 로그 저장소의 암호화 및 접근 제어가 7·8단계 기준과 일치한다.
- [ ] 정기 검토 일정과 책임자가 지정되었다.
- [ ] 감사 보고 템플릿과 샘플 보고서가 준비되었다.

## 산출물 및 보관 위치
- 감사 추적 구성 보고서 (`reports/audit-trail-configuration.md`).
- 로그 검토 체크리스트 (`docs/runbooks/log-review-checklist.md`).
- 테스트 이벤트 및 결과 스크린샷.

## 다음 단계 연계
- 80단계 태그/자원 인벤토리 검증 시 감사 로그를 활용해 미준수 리소스를 식별한다.
- 81단계 보안 정책 준수 감사에서 CloudTrail/Config 데이터를 참고한다.
- 94단계 변경 관리 프로세스에 감사 로그 검토 절차를 통합한다.
