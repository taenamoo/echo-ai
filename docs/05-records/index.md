---
title: 기록 문서 인덱스 (Records Index)
domain: records
status: approved
owner: records@echo.ai
last-updated: 2025-10-02
linked-issues: []
---

# 기록 문서 인덱스 · Historical Records Index

완료된 작업 보고서, 회고, 승인된 결정문을 보관합니다. 최신 참고용 기록은 `approved/`, 과거 스냅샷은 `archive/`에 유지하며 필요 시 `proposals/`에서 회고 초안을 작성합니다.

## 승인된 기록 · Approved Records
| 문서 | 개요 |
| --- | --- |
| [done.me 활동 로그](approved/done-me-log-approved.md) | 주간 진행 상황과 주요 의사결정 요약. |
| [개발 환경 배포 결과](approved/dev-deployment-summary-approved.md) | 개발 환경 배포 진행 내역과 후속 작업 정리. |
| [사전 격차 점검 결과](approved/pre-deployment-gap-analysis-summary-approved.md) | 격차 분석 후 해결된 항목과 남은 리스크. |
| [IaC 가이드라인 요약](approved/iac-guideline-summary-approved.md) | IaC 표준 논의 결과와 확정 사항. |

## 아카이브 · Archive Snapshots
| 문서 | 용도 |
| --- | --- |
| [Step-00 요구사항 검토 이행 기록](archive/aws-rollout-step-00-review-notes-archived.md) | 초기 요구사항 검토 회의 메모. |
| [Step-02 아키텍처 분석 회고](archive/aws-rollout-step-02-architecture-notes-archived.md) | 아키텍처 분석 단계 결과 및 TODO. |

## 유지보수 메모 · Maintenance Notes
- 2025-10-02: `docs/done/` 및 배포 결과 문서를 통합하고 frontmatter를 표준화했습니다.
- 새 회고 작성 시 `proposals/`에 초안을 작성한 뒤 승인되면 `approved/` 혹은 `archive/`로 이동합니다.

