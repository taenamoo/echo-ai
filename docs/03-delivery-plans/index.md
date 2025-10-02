---
title: 전달 계획 인덱스 (Delivery Plans Index)
domain: delivery-plans
status: approved
owner: delivery@echo.ai
last-updated: 2025-10-02
linked-issues: []
---

# 전달 계획 인덱스 · Delivery Planning Index

기능별 작업 계획, 백로그, 실행 체크리스트를 체계적으로 관리합니다. 승인된 실행 계획은 `approved/`에, 진행 중 초안은 `proposals/`, 완료 후 참고용으로 남겨야 하는 문서는 `archive/`에 보관합니다.

## 승인된 작업 계획 · Approved Plans
| 문서 | 초점 |
| --- | --- |
| [AWS 서버리스 구조 개편 계획](approved/aws-serverless-refactor-plan-approved.md) | Next.js 모놀리식을 Lambda-first 아키텍처로 전환하는 6단계 로드맵. |
| [문서 관리 총괄 계획](approved/document-management-plan-approved.md) | CRUD/요약/프런트엔드 작업 묶음을 통합 관리하는 마스터 플랜. |
| [문서 CRUD 계획](approved/documents-crud-plan-approved.md) | API 및 DynamoDB 구조를 확장해 CRUD 기능을 구현. |
| [문서 Presign 계획](approved/documents-presign-plan-approved.md) | 업로드용 presigned URL 흐름과 보안 검증 항목 정의. |
| [문서 요약 계획](approved/documents-summarize-plan-approved.md) | Gemini 연동, 큐 처리, 실패 재시도 정책을 정리. |
| [문서 프런트엔드 계획](approved/documents-frontend-plan-approved.md) | SPA 문서 화면과 상태 표시 컴포넌트를 설계. |
| [Auth UI 계획](approved/auth-ui-plan-approved.md) | 로그인/회원가입/로그아웃 UX 및 상태 관리를 정의. |
| [Auth Hardening 계획](approved/auth-hardening-plan-approved.md) | 인증 토큰 처리, 권한 검증, 세션 만료 대응 강화. |
| [Git History 정리 계획](approved/git-history-purge-plan-approved.md) | 저장소 용량 확보와 비밀 노출 방지를 위한 과거 기록 정리. |
| [LocalStack S3 구성 계획](approved/localstack-s3-plan-approved.md) | 로컬 환경에서 S3 업로드/다운로드를 에뮬레이션. |
| [테스트 & 모니터링 계획](approved/testing-monitoring-plan-approved.md) | 품질 게이트, 관측성, 경보 전략 수립. |

## 진행 중 초안 · Proposals
- `proposals/delivery-backlog-draft.md`: 우선순위가 미확정인 신규 작업 아이디어와 리스크 메모.

## 유지보수 메모 · Maintenance Notes
- 2025-10-02: `docs/task/` 하위 계획서를 모두 재분류하고 naming 규칙을 통일했습니다.
- 계획이 실행 단계로 넘어가면 관련 Runbook을 `04-operations/approved`에 복제하고 `derived-from` 메타데이터를 추가합니다.

