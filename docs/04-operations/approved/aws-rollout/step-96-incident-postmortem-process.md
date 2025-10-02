---
title: 96단계. 장애 보고 및 사후 분석(포스트모템) 프로세스 정립
domain: operations
status: approved
owner: operations@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 96단계. 장애 보고 및 사후 분석(포스트모템) 프로세스 정립

## 목적
- 장애 발생 시 체계적으로 원인을 분석하고 재발 방지 대책을 마련하기 위한 포스트모템 절차를 수립한다.
- 89단계 장애 대응 훈련과 연계하여 실제 운영 중 사고 대응 성숙도를 높인다.

## 선행조건
- [89단계 장애 대응 훈련](docs/04-operations/approved/aws-rollout/step-89-incident-response-drill.md)과 [75단계 사고 대응 절차](docs/04-operations/approved/aws-rollout/step-75-security-incident-response.md)가 문서화되어 있어야 한다.
- [95단계 릴리즈 기록](docs/04-operations/approved/aws-rollout/step-95-release-notes-management.md)과 [94단계 변경 관리 로그](docs/04-operations/approved/aws-rollout/step-94-change-management-process.md)가 수집되고 있어야 한다.
- Incident 관리 도구(79단계)가 운영 중이어야 한다.

## 필요한 입력 자료
- 사고 타임라인, 감지/경보 로그, 영향 범위, 관련 변경 내역.
- 참가자 명단(Incident Commander, Scribe 등), 회의 일정.
- KPI 지표(90단계) 및 SLA/SLO(84단계) 정보.

## 상세 절차
1. **포스트모템 트리거 정의**
   - 장애 심각도 기준(예: Sev1~Sev3)과 포스트모템 작성 요건을 확정한다.
   - SLA 위반, 고객 영향, 보안 사고 여부 등 필수 트리거를 명시한다.
2. **템플릿 및 역할 지정**
   - 사건 개요, 타임라인, 근본 원인, 조치 사항, 후속 계획을 포함한 템플릿을 작성한다.
   - Incident Commander, Scribe, 액션 오너 등 역할을 지정하고 책임을 명확히 한다.
3. **데이터 수집 및 분석**
   - CloudWatch, X-Ray, 로그 저장소 등에서 이벤트 데이터를 수집한다.
   - 95단계 릴리즈 노트와 94단계 변경 로그를 교차 검증해 원인 후보를 좁힌다.
4. **워크숍 실행 및 후속 조치 정의**
   - 주요 이해관계자와 회의를 열어 타임라인을 검증하고 근본 원인 분석(RCA)을 수행한다.
   - 재발 방지 대책, 프로세스 개선, 자동화 기회(93단계)를 식별한다.
5. **보고 및 추적**
   - 포스트모템 보고서를 작성하여 경영진과 운영팀에 공유한다.
   - 후속 조치를 트래킹 시스템에 등록하고 97단계 정기 리뷰에서 진행 상황을 점검한다.

## 의사결정 포인트
- 포스트모템을 어떤 심각도부터 의무화할지와 보고 마감 기한.
- 비난 없는(Blameless) 문화 채택 여부와 커뮤니케이션 방식.
- 외부 고객에게 공유할 요약 보고 범위를 어느 수준으로 할지.

## 체크리스트
- [ ] 포스트모템 트리거와 심각도 기준이 정의되었다.
- [ ] 템플릿과 역할이 문서화되고 도구에 반영되었다.
- [ ] 회의를 통해 근본 원인과 후속 조치가 확정되었다.
- [ ] 후속 조치가 추적 시스템에 등록되고 진행 상황이 모니터링된다.

## 산출물 및 보관 위치
- 포스트모템 보고서(`reports/incidents/postmortem-YYYYMMDD-<incident>.md`).
- 타임라인 및 로그 아카이브(`evidence/incidents/<incident-id>/`).
- 후속 조치 추적 보드(`trackers/incidents/actions-board.xlsx`).

## 다음 단계 연계
- 97단계 정기 리뷰 회의에서 포스트모템 결과와 진행 상태를 공유한다.
- 98단계 로드맵 업데이트 시 재발 방지 개선 과제를 반영한다.
- 100단계 운영 인수 시 포스트모템 프로세스와 책임자를 지정한다.
