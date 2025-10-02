---
title: 62단계. 네트워크 연결성 테스트 실행
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 62단계. 네트워크 연결성 테스트 실행

## 목적
- 19단계 연결성 테스트 계획에 따라 개발 환경의 네트워크 경로(DNS, VPC 피어링, 보안 그룹 등)를 검증한다.
- 배포 후 애플리케이션이 의존하는 내부/외부 서비스와 안정적으로 통신할 수 있는지 확인한다.

## 선행조건
- [19단계 연결성 테스트 계획](docs/04-operations/approved/aws-rollout/step-19-connectivity-testing-plan.md) 수립 완료.
- [16단계 VPC/서브넷 구현 계획](docs/04-operations/approved/aws-rollout/step-16-vpc-subnet-implementation-plan.md) 및 [17단계 네트워크 보안 정책](docs/04-operations/approved/aws-rollout/step-17-network-security-policies.md) 적용.
- [55단계 캐시/메시지 서비스 생성](docs/04-operations/approved/aws-rollout/step-55-cache-messaging-provisioning.md), [53단계 데이터베이스 프로비저닝](docs/04-operations/approved/aws-rollout/step-53-database-provisioning.md) 결과 활용.

## 필요한 입력 자료
- 테스트 시나리오 및 기대 결과 목록.
- DNS 레코드, VPC/서브넷 CIDR, 보안 그룹/네트워크 ACL 설정.
- 테스트 도구 스크립트(`scripts/network/connectivity-check.py` 등)와 접근 자격 증명.

## 상세 절차
1. **테스트 범위 확인**
   - 내부 서비스(API, DB, 캐시, 메시지 브로커)와 외부 서비스(SaaS API, 인터넷 접근) 목록을 확정한다.
   - 68단계 성능 테스트에 영향을 줄 수 있는 경로를 우선순위로 정한다.
2. **테스트 환경 구성**
   - Bastion 호스트, Systems Manager Session Manager 등을 활용해 테스트 실행 위치를 결정한다.
   - 필요 시 임시 보안 그룹 규칙을 추가하되 테스트 종료 후 원복한다.
3. **DNS 및 라우팅 검증**
   - `dig`, `nslookup`으로 도메인 해석 결과를 확인하고 Route 53 규칙을 검토한다.
   - 프라이빗 호스트드 존 연결 상태 및 Resolver 규칙을 점검한다.
4. **포트/프로토콜 테스트**
   - `nc`, `telnet`, `curl`, `psql` 등 도구로 서비스별 포트 접근성을 확인한다.
   - TLS 인증서 유효성, MTLS/프록시 요구사항을 점검한다.
5. **네트워크 지표 수집**
   - VPC Flow Logs, CloudWatch Metrics를 활성화하여 지연 시간, 거부 로그를 확인한다.
   - 이슈 발생 시 17단계 정책 문서를 갱신한다.
6. **결과 정리 및 개선 조치**
   - 실패 케이스를 이슈 트래커에 등록하고 재테스트 일정을 지정한다.
   - 네트워크 설계 변경 시 IaC 템플릿과 파이프라인을 업데이트한다.

## 의사결정 포인트
- 테스트 자동화를 CI/CD에 통합할지, 정기 점검으로 유지할지.
- 외부 서비스 접근을 위한 VPN/프록시/프라이빗 링크 등 연결 방식 선택.
- 문제 발생 시 변경 승인 프로세스를 어떻게 적용할지(34단계 참조).

## 체크리스트
- [ ] 내부 서비스(DB, 캐시, 메시지 브로커) 연결이 모두 성공한다.
- [ ] 외부 API 및 인터넷 접근이 기대대로 동작한다.
- [ ] 실패 로그가 수집되어 원인 분석이 가능하다.
- [ ] 보안 그룹/ACL 임시 변경 사항을 원복했다.

## 산출물 및 보관 위치
- 네트워크 테스트 리포트(`docs/reports/network-connectivity-dev.md`).
- 테스트 스크립트 및 자동화 파이프라인 정의.
- Flow Logs/CloudWatch 로그 스냅샷.

## 다음 단계 연계
- 64단계 CD 드라이 런과 65단계 실제 배포 시 네트워크 검증을 자동으로 실행한다.
- 68~69단계 성능 테스트, 82단계 원격 디버깅 절차에서 네트워크 검증 방법을 재사용한다.
- 76단계 감사 추적 검토에 테스트 결과와 로그를 포함한다.
