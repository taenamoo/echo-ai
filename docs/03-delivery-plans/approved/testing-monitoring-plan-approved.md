---
title: 작업 계획서: 테스트 및 모니터링 정비
domain: delivery-plans
status: approved
owner: delivery@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
## 작업 계획서: 테스트 및 모니터링 정비
우선순위: 7

### 1. 목표
- 핵심 API/유틸에 대한 단위/통합 테스트를 추가한다.
- 로컬 로깅 규약을 정하고, 배포 시 모니터링(CloudWatch 등) 연계를 설계한다.

-----

### 2. 테스트 범위
- 단위
  - 토큰 유틸(`generate/verify`)
  - S3 presign 로직(만료, 키 생성)
  - DynamoDB 리포지토리(키 빌더, 상태 업데이트)
- 통합
  - `/api/documents/presign`, `/api/documents`(POST), `/api/documents`(GET), `/api/documents/[id]`, `/api/documents/[id]/delete`, `/api/documents/[id]/summarize`

-----

### 3. 작업 단계 (Step-by-Step)
1) 테스트 프레임워크 설정 (예: Vitest/Jest)
2) 단위 테스트 추가: 토큰/키 생성/검증 함수
3) 통합 테스트 환경 구성: LocalStack/DynamoDB Local 의존, 테스트용 .env
4) 통합 테스트 케이스 작성: 주요 성공/실패 경로
5) CI 통합(선택): PR 시 테스트 실행

-----

### 4. 로깅/모니터링
- 로컬: 구조화 로깅 도입(예: pino) 또는 콘솔 규약 수립
- 배포: CloudWatch 로그 그룹/지표 설계 문서화(후속)

-----

### 5. 수용 기준
- 핵심 경로 테스트가 녹색이며, 회귀 회피에 기여
- 로깅 출력이 일관되고, 장애 분석에 유용
