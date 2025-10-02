---
title: 단계 1 설계 정교화 의사결정 요약
domain: architecture
status: approved
owner: architecture@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 단계 1 설계 정교화 의사결정 요약

본 문서는 `application-architecture-notes.md`에서 파생된 미확정 항목을 1단계 준비 구간에서 확정하기 위한 결정 사항을 정리한다. 이해관계자 검토자는 제품 오너(요청자)로, 본 문서 내 결정은 즉시 승인된 것으로 간주한다.

## 1. 서비스 수준 및 파일 정책
- **요약 SLA**: 비동기 요약 파이프라인(업로드 → SQS → Lambda → Gemini)은 작업당 _최대 20초_ 내 응답(요약 생성)을 목표로 한다. Lambda 타임아웃은 25초로 설정하고, CloudWatch 알람은 18초 초과 비율(5분 윈도) 5% 이상 시 경보를 발송한다.
- **허용 파일 형식**: `.txt`, `.md`, `.pdf`, `.docs` 4종을 1차 허용 확장자로 고정한다. MIME 검증 로직을 강화하고, 추후 확장 시 문서화·테스트를 병행한다.

## 2. 비밀 관리 및 구동 환경
- **전환 방향**: `.env` 파일 사용을 중단하고 AWS Secrets Manager를 단일 사실 원천(Single Source of Truth)으로 지정한다.
- **정책**:
  - 시크릿 이름 규칙은 `echoai/{stage}/{purpose}` 패턴을 사용한다. 예) `echoai/prod/gemini/api-key`.
  - 키 버저닝을 활성화하고, 변경 시 GitHub Actions 배포 파이프라인에서 최신 버전을 자동 주입한다.
  - Gemini, 향후 추가 AI 엔진(OpenAI 등), 데이터베이스 자격 증명, 서드파티 통합 토큰을 모두 포함한다.

## 3. DynamoDB 정렬키 결정
- **조사 내용**: 현재 Next.js API 라우트는 사용자 프로필을 `PK=USER#<userId>`, `SK=PROFILE#<userId>` 패턴으로 조회한다. `docs/02-architecture/approved/current-system-overview-approved.md` 등 기존 문서에는 `SK=PROFILE`로만 표기되어 있어 정합성 차이가 존재한다.
- **결정**: 다중 프로필 시나리오 대비와 명시적인 사용자 식별을 위해 `PROFILE#<userId>` 패턴을 유지한다. 이 패턴은 기존 코드와 일치하며(`apps/web/src/app/api/me/route.ts`, `apps/web/src/app/api/auth/signup/route.ts`), 향후 `SK=PROFILE#<userId>#<suffix>` 확장도 용이하다.
- **후속 조치**: `docs/02-architecture/approved/current-system-overview-approved.md` 및 `docs/02-architecture/approved/target-architecture-overview-approved.md`의 스키마 섹션을 업데이트하고, 마이그레이션 스크립트에서는 `PROFILE` 패턴 데이터를 `PROFILE#<userId>`로 변환한다.

## 4. 요약 엔진 로드맵
- **초기 배포**: Gemini Flash 모델을 기본 엔진으로 고정한다.
- **확장 전략**: 요약 서비스 계층에 엔진 추상화 인터페이스를 도입하여 OpenAI 등 추가 엔진을 구성 플래그로 주입할 수 있도록 한다. Secrets Manager에는 엔진별 API 키를 병렬 저장한다.
- **검증**: 스테이징 환경에서 Gemini 20초 SLA 충족 여부를 검증하고, 추후 엔진 추가 시 회귀 테스트를 자동화한다.

## 5. 모니터링 및 운영 준비
- **SQS 및 Lambda 용량 계획**:
  - SQS 기본 큐 길이 임계치: 200 메시지 이상 시 경보.
  - Lambda 동시 실행 예약: 25개(선형 확장 가능), 최대 재시도 횟수 2회, DLQ는 별도 큐(`echoai-summarize-dlq`)로 지정한다.
- **관찰성**: CloudWatch 대시보드에 요약 처리 시간 p95, Lambda 에러율, DLQ 적재량을 표시하고, 로그에는 추적 ID와 엔진 정보를 포함한다.

## 6. 승인
- 모든 항목은 제품 오너(요청자)의 지시에 따라 즉시 승인 처리한다. 추가 변경이 필요한 경우 본 문서를 개정한다.
