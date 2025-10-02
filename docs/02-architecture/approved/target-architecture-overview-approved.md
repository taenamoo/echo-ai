---
title: 배포 자동화를 위한 목표 아키텍처(단순화 반영)
domain: architecture
status: approved
owner: architecture@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# 배포 자동화를 위한 목표 아키텍처(단순화 반영)

## 1. 추진 목표
- Next.js 모놀리식을 제거하고, 서버 기능은 Lambda-first로 통일한다.
- UI는 정적 SPA(예: Vite + React)로 전환하여 S3/CloudFront에서 서빙한다.
- 인프라는 CloudFormation/CDK로 코드화하고, GitHub Actions에서 브랜치별 자동 배포를 수행한다.
- 백엔드 변경이 없을 때 UI 정적 자산만 독립적으로 배포하는 경로를 제공한다.

## 2. 제안 토폴로지
1. **클라이언트 제공**
   - React 기반 SPA를 정적 자산으로 빌드하여 S3 버킷에 배포하고, CloudFront가 HTTPS 종료·캐싱·무효화를 담당한다.
2. **API 계층**
   - Amazon API Gateway(REST)가 도메인별 Lambda 함수(인증, 문서, 요약 등)로 요청을 전달한다.
   - Lambda 함수는 기존 `packages/@echo-ai/*` 워크스페이스 모듈을 공유 레이어/번들로 사용한다.
3. **데이터 및 스토리지**
   - 사용자 프로필·문서 메타데이터·요약 상태를 DynamoDB 테이블에 저장한다(문서화된 스키마와 정합성 유지).
   - 문서 원문은 S3 버킷에 보관하고, API Gateway + Lambda가 프리사인드 URL 흐름을 유지한다.
4. **비동기 처리**
   - 문서 업로드 Lambda가 `SUMMARIZE_ASYNC` 활성화 시 SQS 큐에 요약 작업 메시지를 발행한다.
   - `services/ai-processor` 기반 요약 전용 Lambda가 큐를 소비하여 S3에서 문서를 읽고 AI 요약(초기에는 Gemini, 필요 시 OpenAI로 전환 가능)을 수행한 뒤 DynamoDB에 결과를 기록한다.
5. **비밀 및 설정**
   - AWS Secrets Manager에 외부 API 키와 민감 설정을 저장하고, Lambda가 배포 시 또는 런타임에 불러와 사용한다.
6. **관측 및 보안**
   - CloudWatch Logs·지표·알람으로 Lambda/API Gateway 상태를 모니터링한다.
   - 모든 스택에 최소 권한 IAM 역할과 태깅 표준을 적용한다.

## 3. CloudFormation 스택 구성
| 스택 | 주요 리소스 | 비고 |
| --- | --- | --- |
| `echoai-shared` | UI용 S3 버킷, 문서 버킷, CloudFront 배포, ACM 인증서 | UI 배포 및 자산 호스팅 |
| `echoai-api` | API Gateway, Lambda 함수(인증·문서·요약·하우스키핑), DynamoDB 테이블, SQS 큐, IAM 역할, Secrets Manager 항목 | 메인 애플리케이션 백엔드 |
| `echoai-ops` (선택) | CloudWatch 알람, 대시보드, 로그 보존 정책 | 모니터링 구성 분리 |

스택 템플릿은 `infra/` 디렉터리에 CDK 또는 순수 CloudFormation 형태로 저장·관리한다.

## 4. CI/CD 워크플로(GitHub Actions) — 단순화 재정의
1. **트리거/분기**
   - `develop` → 개발 환경(dev) 배포, `master` → 운영(prod) 배포.
   - 경로 기반 분기: UI(`apps/spa/**`), 백엔드(`services/api/**`, `services/ai-processor/**`, `packages/**`, `infra/**`).
2. **UI 파이프라인(정적 SPA)**
   - Lint/Test → Build(`pnpm --filter @echo-ai/app-spa build`) → S3 업로드(버킷/프리픽스 분리) → CloudFront 무효화.
   - 백엔드 변경이 없으면 이 Job만 실행.
3. **백엔드 파이프라인(Lambda + IaC)**
   - Lint/Test → Build/Bundle(esbuild/tsup) → CDK synth/diff → Deploy(`cdk deploy --require-approval=never`).
   - 변경 영향 범위에 따라 스택별 배포(Shared/UI 제외) 또는 전체 API 스택 배포.
4. **권한/비밀**
   - GitHub OIDC로 배포 역할을 가정(권한 최소화: CFN deploy, CloudFront 무효화, S3 put, iam:PassRole 제한).
   - 런타임 비밀은 Secrets Manager로 관리하고, 파이프라인에서는 Secret 값 직접 주입을 피한다.

## 5. 마이그레이션 및 구현 단계
1. DynamoDB 스키마 정합성 확정 및 Lambda 실행 환경에 맞춘 공통 패키지 보완.
2. `services/api` Lambda 핸들러 구현 및 공유 핸들러(`@echo-ai/api-core`)로 단일 소스화(Next 경로 제거 전제).
3. `services/ai-processor` SQS 워커 완성(p95 20초 목표) 및 비동기 요약 기본값 적용.
4. CDK 템플릿 작성(IAM 최소권한·태깅 포함), 스택 출력으로 리소스 식별자 노출.
5. GitHub Actions 워크플로 구성: UI-only/백엔드 분기, 캐시 최적화, OIDC 연동.
6. 큐 적체·오류·지연에 대한 알람과 대시보드 구성.

## 6. 결정 사항
- Secrets 스키마: Secrets Manager JSON 형태로 정의한다.
  - Secret 이름: `echoai/{stage}/app` (예: `echoai/develop/app`, `echoai/production/app`)
  - JSON 키: `JWT_SECRET`(필수), `GEMINI_API_KEY`(선택), `OPENAI_API_KEY`(선택), `HASH_SALT`(선택), `SUMMARIZE_PROVIDER`(선택; 기본 'gemini')
  - 주입 전략: 비프로덕션은 `.env` 병행 허용, 프로덕션/스테이징은 런타임 조회 + 캐싱(단계 6에서 구현)
- UI 프레임워크: React SPA + Vite(정적 배포, SSR 미사용)
- Microfrontend: 현 단계 미도입(단일 팀/범위). 다중 팀/독립 배포 필요 시 재검토
- IaC: AWS CDK(TypeScript) 채택

## 7. 로컬 개발 모델(참고)
- LocalStack(S3,SQS) + DynamoDB Local로 인프라 에뮬레이션.
- Lambda 로컬 HTTP 게이트웨이(Express/Hono)로 `services/api/src/lambda/*`를 HTTP에 마운트하여 프론트/테스트가 동일 엔드포인트 사용.
- S3 프리사인드는 LocalStack 공개 엔드포인트를 활용하여 브라우저 업로드 가능.
