---
title: 11단계. AWS Organizations 및 Control Tower 검토
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 11단계. AWS Organizations 및 Control Tower 검토

## 목적
- 멀티 계정 전략이 필요한지 평가하고, AWS Organizations 또는 Control Tower 도입 여부를 결정한다.
- 계정 생성/프로비저닝 절차와 거버넌스 정책을 표준화한다.

## 선행조건
- 5단계에서 정의한 환경 구분 전략.
- 8단계 거버넌스 원칙과 태깅/정책 기준.
- 10단계에서 확보한 루트 계정 접근 권한 및 보안 설정.

## 필요한 입력 자료
- 조직 내 팀/서비스별 계정 수요 예측.
- 보안 및 규제 준수 요건(감사, 분리 의무 등).
- AWS Control Tower 지원 리전 여부와 비용 견적.

## 상세 절차
1. **멀티 계정 필요성 평가**
   - 환경(개발/스테이징/운영) 및 서비스 단위로 계정 분리가 필요한지 검토한다.
   - 7단계 위험 평가 결과와 비교하여 분리 수준을 결정한다.
2. **옵션 비교**
   - AWS Organizations 수동 운영 vs. Control Tower 자동화 기능을 비교한다.
   - Landing Zone 솔루션이나 타사 관리 도구 필요성도 함께 검토한다.
3. **조직 구조 설계**
   - OU(Organizational Unit) 구조와 정책 상속 체계를 설계한다.
   - Service Control Policy(SCP) 템플릿을 정의하고 8단계 정책과 정합성 검토.
4. **계정 프로비저닝 프로세스 정의**
   - 신규 계정 요청/승인/생성 흐름과 책임자를 명확히 한다.
   - Control Tower 사용 시 Account Factory 설정을 문서화한다.
5. **보안 및 모니터링 가드레일 설정**
   - Guardrail(필수/선택) 목록을 선정하고 적용 계획을 수립한다.
   - CloudTrail, AWS Config, Security Hub 등의 중앙집중 로깅 전략을 정의한다.
6. **비용 및 운영 계획 확정**
   - 6단계 예산 계획과 비교하여 도입 비용을 검증한다.
   - 운영 팀의 역할, 교육 계획, 지원 티켓 프로세스를 수립한다.
7. **결정 승인 및 커뮤니케이션**
   - 최종 결정 사항을 문서화하여 이해관계자에게 공유하고 승인을 획득한다.

## 의사결정 포인트
- Control Tower 도입 여부 및 Landing Zone 구축 범위.
- 계정 분리 기준(환경/팀/서비스)과 OU 구조.

## 체크리스트
- [ ] 멀티 계정 전략 및 OU 구조 다이어그램이 작성되었다.
- [ ] SCP 및 Guardrail 정책이 정의되었다.
- [ ] 계정 프로비저닝 운영 절차가 문서화되었다.
- [ ] 비용/운영 계획이 승인되었다.

## 산출물 및 보관 위치
- 멀티 계정 전략서 (`docs/04-operations/approved/aws-rollout/multi-account-strategy.md`).
- OU 구조 및 SCP 템플릿 (`infra/organizations/`).
- Control Tower 또는 Organizations 운영 가이드 (`docs/04-operations/approved/aws-rollout/orgs-operations-guide.md`).

## 다음 단계 연계
- 12단계 IAM 역할 설계 시 OU/계정 구조를 기준으로 권한 범위를 정의한다.
- 16단계 VPC 계획 및 18단계 DNS 전략에서도 계정 단위 리소스 배치를 고려한다.
