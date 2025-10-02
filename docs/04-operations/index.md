---
title: 운영 문서 인덱스 (Operations Index)
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---

# 운영 문서 인덱스 · Operations Documentation Index

배포, 런북, 구성 참조 등 운영 절차를 표준화한 문서를 집계합니다. 승인된 운영 기준은 `approved/` 트리에 유지하며, 신규 실험은 `proposals/`, 역사 기록은 `archive/`에 저장합니다.

## AWS 롤아웃 가이드 · AWS Rollout Guides
`approved/aws-rollout/` 폴더는 0~100단계 체크리스트로 구성된 서버리스 배포 프로그램을 제공합니다.

- [현재 배포 절차](approved/aws-rollout/current-deployment-steps-approved.md): 수동 배포 시퀀스와 자동화 스크립트 사용법.
- [개발 배포 계획](approved/aws-rollout/dev-deployment-plan-approved.md) 및 [결과 기록](../05-records/approved/dev-deployment-summary-approved.md) 연계.
- [사전 격차 점검](approved/aws-rollout/pre-deployment-gap-analysis-approved.md): 배포 전 해결해야 할 리스크 목록.
- 단계별 세부 가이드: `step-00`부터 `step-100`까지 파일을 번호 순으로 따라가면 전체 여정이 완성됩니다.

## 런북 & 구성 참조 · Runbooks & Config
| 경로 | 설명 |
| --- | --- |
| [runbooks/local-api-lambda-testing](approved/runbooks/local-api-lambda-testing-approved.md) | Lambda/API를 로컬에서 검증하는 절차. |
| [runbooks/local-e2e-async-summarization](approved/runbooks/local-e2e-async-summarization-approved.md) | 비동기 요약 파이프라인을 통합 테스트하는 방법. |
| [config/environment-variables-reference](approved/config/environment-variables-reference-approved.md) | Stage별 환경 변수와 Secrets 준비 체크리스트. |

## 유지보수 메모 · Maintenance Notes
- 2025-10-02: 기존 `docs/aws-deployment`와 `docs/runbooks` 자료를 새로운 도메인 구조로 정리했습니다.
- 단계별 Runbook이 업데이트되면 해당 단계 번호를 유지한 채 변경 이력을 `05-records/`에 기록합니다.

