---
title: 아키텍처 문서 인덱스 (Architecture Index)
domain: architecture
status: approved
owner: architecture@echo.ai
last-updated: 2025-10-02
linked-issues: []
---

# 아키텍처 문서 인덱스 · Architecture Documentation Index

현행 시스템, 목표 구조, 전환 전략과 같은 기술 청사진을 관리합니다. 승인된 설계 기준은 `approved/`, 진행 중인 구상은 `proposals/`, 이력을 남겨야 하는 완료 문서는 `archive/`에 위치합니다.

## 승인 문서 · Approved References
| 문서 | 설명 |
| --- | --- |
| [현행 시스템 개요](approved/current-system-overview-approved.md) | Stage 4 단순화 이후의 실제 인프라와 서비스 구성을 정리했습니다. |
| [목표 아키텍처 개요](approved/target-architecture-overview-approved.md) | Lambda-first + SPA 구조로 전환할 때 도달해야 할 최종 상태를 설명합니다. |
| [전환 실행 계획](approved/current-to-target-transition-plan-approved.md) | 현행 → 목표 구조 전환 단계와 의존성을 서술합니다. |
| [IaC 가이드라인](approved/iac-guidelines-approved.md) | CloudFormation/CDK 사용 원칙과 태깅, 권한 정책 표준을 정의합니다. |
| [1단계 준비 의사결정 요약](approved/stage-01-prep-decisions-approved.md) | 초기 설계 검토에서 확정된 핵심 결정 사항을 기록했습니다. |
| [시스템 아키텍처 설계서](approved/system-architecture-document-approved.md) | 전체 서비스 컴포넌트 다이어그램과 데이터 흐름을 총괄합니다. |

## 제안 및 기록 · Proposals & Archive
- `proposals/simplification-stage-04-plan-draft.md`: 단순화 프로젝트 단계 계획 초안.
- `archive/simplification-stage-04-outcome-archived.md`: Stage 4 실행 결과와 회고 정리.

## 유지보수 메모 · Maintenance Notes
- 2025-10-02: 산재한 설계 문서를 재분류하고 frontmatter를 추가했습니다.
- 향후 신규 설계 초안은 `proposals/`에 작성 후 승인 시 본 인덱스를 갱신합니다.

