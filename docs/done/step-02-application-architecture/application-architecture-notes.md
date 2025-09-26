# Step-02 배포 대상 애플리케이션 구조 파악 이행 기록

## 0. 사전 질문 및 응답
- **질문**: 최신 아키텍처 다이어그램이나 별도 시스템 토폴로지 자료가 있는가?
  - **답변**: 추가 자료는 없으며, 저장소의 코드와 문서를 기준으로 판단해야 한다.

## 1. 애플리케이션 구성 요소 식별 (절차 1)
- **현행 구조 개요**: Next.js 15 기반 모놀리식 앱이 프런트엔드와 백엔드 API 라우트를 동시에 제공한다. `apps/web/src/app/api` 아래의 라우트가 인증, 문서 CRUD, 요약 트리거 등 모든 동기 API를 처리한다.
- **프런트엔드(UI)**: `apps/web/src/app` 하위에서 App Router 패턴으로 인증 페이지(`auth/login`, `auth/signup`), 문서 업로드/목록/상세(`documents`, `documents/[id]`), 학습 도구(`study/*`)를 제공한다.
- **백엔드(API)**: Next.js Route Handler가 직접 DynamoDB, S3, Gemini API와 통신한다. 대표 엔드포인트는 `api/auth/*`, `api/documents`, `api/documents/[documentId]/summarize`이다.
- **도메인 패키지 계층**: `packages/@echo-ai/*` 워크스페이스 모듈이 인증(`auth`), AWS 클라이언트(`aws-clients`), 구성(`config`), 문서 처리(`documents`) 로직을 캡슐화하여 Next.js 라우트와 향후 Lambda 코드에서 재사용 가능하도록 한다.
- **비동기 워커 준비 디렉터리**: `services/ai-processor`는 SQS 기반 Lambda 워커를 위한 초기 골격으로, 현재 Next.js 라우트 내에 있는 요약 로직을 분리할 예정인 자리이다. `services/api`도 API Gateway + Lambda 이전을 대비한 프레임워크 위치만 정의되어 있다.
- **인프라 스캐폴딩**: `infra/cdk`, `infra/pipelines` 폴더에 CDK/파이프라인 초안 문서가 있으나 실제 스택 코드는 아직 비어 있다. 배포 전략은 Step-00에서 정의한 CloudFormation 스택 구성을 전제로 한다.

## 2. 기술 스택 정리 (절차 2)
| 계층 | 주요 기술 | 빌드/실행 방식 | 비고 |
| --- | --- | --- | --- |
| 프런트엔드 + SSR | Next.js 15(App Router), React 19, Tailwind CSS 4 | `pnpm --filter @echo-ai/web dev/build` | `Dockerfile` 및 `docker-compose.yml`로 로컬 실행, Node 20 기반 |
| API 라우트 | Next.js Route Handler (TypeScript) | Next.js 빌드에 포함 | 향후 Lambda 이전 시 `services/api`로 추출 예정 |
| 인증/도메인 공통 | TypeScript 워크스페이스(`packages/@echo-ai/auth`, `core-domain`, `documents`) | pnpm workspace | JWT, bcrypt, 문서 큐잉, 텍스트 추출 유틸 포함 |
| 데이터 계층 | AWS SDK v3 (`@aws-sdk/lib-dynamodb`, `@aws-sdk/client-s3`, `@aws-sdk/client-sqs`) | Node.js 런타임 | DynamoDB/S3/SQS 엔드포인트를 Config 패키지가 주입 |
| AI 요약 | Google Generative AI SDK (`@google/generative-ai`) | Next.js API 내 직접 호출 | 요구사항상 ChatGPT로 전환 필요 여부 미정 |
| 로컬 개발 인프라 | Docker Compose (Next.js + DynamoDB Local + LocalStack S3) | `docker compose up -d` | DynamoDB 초기화 스크립트, S3 버킷 준비 |

## 3. 의존성 및 통합 포인트 (절차 3)
- **데이터 저장소**: `packages/@echo-ai/aws-clients`에서 DynamoDB DocumentClient를 생성하고 메인 테이블(`EchoAI-Main-Table`)을 사용한다. Next.js API 라우트는 Query/Put/Update 명령을 통해 사용자별 문서 메타데이터와 요약 상태를 관리한다.
- **파일 스토리지**: 동일한 클라이언트 패키지가 S3 클라이언트를 구성하며, 문서 업로드는 S3에 저장된다. API는 직접 `PutObjectCommand`로 업로드(레거시)하거나 프런트엔드에서 Presigned URL 업로드 후 메타데이터를 기록한다.
- **비동기 처리 경로**: `packages/@echo-ai/documents`의 `enqueueSummarizeJob`은 SQS로 요약 작업 메시지를 발행하도록 준비돼 있지만, 환경변수 `SUMMARIZE_ASYNC` 기본값이 false라서 현재는 동기 실행만 사용된다.
- **AI 통합**: 문서 요약은 Next.js 라우트에서 Gemini Flash 모델을 호출하여 수행한다. 타임아웃은 기본 45초이며, 요약 길이 제한과 출력 토큰 상한을 환경변수로 제어한다.
- **인증 체계**: `packages/@echo-ai/auth`에서 JWT 발급/검증 및 비밀번호 해시를 처리한다. Next.js Route Handler는 `requireAuth` 헬퍼를 통해 토큰을 검증하고 사용자 정보를 추출한다.
- **구성 관리**: `packages/@echo-ai/config`가 환경 변수를 강제 로드하며, 스테이지(`local/develop/production`)에 따라 AWS 엔드포인트와 자격 증명을 설정한다.

## 4. 아키텍처 다이어그램 최신화 계획 (절차 4)
- 저장소에는 Step-02를 위한 최신 다이어그램 파일이 없다. 기존 시스템 아키텍처 문서는 서버리스 타깃 구조를 설명하지만, 현행 Next.js 모놀리식 배치와 상이하다.
- **조치**: `docs/architecture/current-system.drawio` 파일을 새로 작성하여 다음 요소를 포함하도록 제안한다.
  1. Next.js 앱(프런트 + API)과 Docker 기반 로컬 개발 흐름.
  2. AWS 상 배포 시 API Gateway–Lambda–SQS–S3–DynamoDB–Secrets Manager 간 상호작용.
  3. GitHub Actions → CloudFormation 배포 파이프라인 및 UI 전용 배포 경로(CloudFront/S3) 표시.
- 다이어그램 초안을 작성한 후, Step-01에서 파악된 이해관계자(개발자 3인)와 검토 회의를 거쳐 승인받아야 한다.

## 5. 제약 조건 및 리팩터링 고려사항 (절차 5)
1. **요약 SLA 30초**: 현재 동기식 Gemini 호출 타임아웃(45초)이 요구사항보다 길다. SQS 비동기 처리와 작업 분할을 통해 SLA를 맞출 방안을 마련해야 한다.
2. **Secrets Manager 요구사항**: 현행 구성은 `.env` 기반 환경 변수에 의존한다. AWS 배포 시 Secrets Manager에서 키를 주입하도록 Lambda 환경 구성을 변경해야 한다.
3. **파일 형식 제한 불일치**: API가 `.pdf` 등 다양한 확장자를 허용한다. 요구사항(`.txt/.md` 단일 파일`)과 충돌하므로 정책 결정을 선행해야 한다.
4. **데이터 모델 차이**: DynamoDB `SK` 패턴이 문서에서 정의한 `PROFILE` 대신 `PROFILE#<id>`를 사용한다. 마이그레이션 시 스키마 정합성 조정 또는 문서 갱신이 필요하다.
5. **리소스 태깅/네트워킹**: VPC, IAM, CloudWatch 구성은 아직 코드화되지 않았다. CloudFormation 템플릿에 최소 권한 정책과 태깅 표준을 포함해야 한다.

## 6. 미확정 항목에 대한 추천안
| 이슈 | 현황 | 제안 | 근거 및 실행 가능성 |
| --- | --- | --- | --- |
| 요약 처리 방식 | 동기식 Next.js 라우트가 S3에서 파일을 읽어 Gemini 호출 → 45초 타임아웃 | `SUMMARIZE_ASYNC=true`를 기본값으로 전환하고 SQS 큐(`SUMMARIZE_SQS_QUEUE_URL`) 및 `services/ai-processor` Lambda를 활성화하여 비동기 처리 | 패키지에 SQS 큐잉 유틸이 이미 구현되어 있으며(메시지 스키마 완비), Lambda 워커만 구현하면 30초 SLA 준수 및 확장성 확보 가능 |
| AI 엔진 선택 | 요구사항은 ChatGPT, 구현은 Gemini | 1차 배포는 Gemini 유지(비용/성능 검증 완료 가정) 후, Secrets Manager에 OpenAI 키를 병렬 저장하여 스위치 가능하도록 추상화 레이어 추가 | 현재 Gemini SDK가 통합되어 있어 즉시 전환 시 리스크가 있으므로, 추상화 계층을 추가하면 양쪽 엔진을 선택적으로 호출 가능 |
| UI 전용 배포 경로 | GitHub Actions가 CloudFormation 스택만 트리거, 정적 빌드 핫픽스 경로 미정 | CloudFront 배포 ID와 S3 아티팩트 버킷을 별도 Stack Output으로 관리하고, UI 변경만 감지 시 `pnpm build` → S3 업로드 → CloudFront 무효화 Job을 분리 | CloudFormation Outputs와 GitHub Actions 캐시를 사용하면 수동 개입 없이도 단독 배포 가능. 정적 호스팅은 현재 계획과 일치 |
| 아키텍처 다이어그램 부재 | 서버리스 목표 구조만 문서화 | `docs/architecture/current-system.md/.drawio`에 현행/목표 비교 섹션 추가 | draw.io 또는 Excalidraw로 제작 가능하며, 이해관계자 검토 후 Step-03 저장소 전략 수립에 활용 |

## 7. 체크리스트 상태
- [x] 모든 컴포넌트의 기술 스택과 런타임 정보가 정리되었다.
- [ ] 의존성/통합 포인트에 대한 상세 문서와 다이어그램이 작성되었다. → 텍스트 정리는 완료, 다이어그램 작성이 남음.
- [ ] 아키텍처 다이어그램이 최신 상태로 승인되었다. → 신규 작성 및 검토 필요.
- [ ] AWS 마이그레이션 제약 조건과 고려사항이 문서화되었다. → 핵심 제약을 식별했으나 세부 리스크 로그는 추가 정리 필요.

## 8. 오픈 이슈 및 후속 조치
1. SQS 비동기 요약 워커 구현 (`services/ai-processor`)과 Lambda 배포 파이프라인 설계.
2. Secrets Manager 통합 계획 수립 및 환경 변수 로딩 로직 개선.
3. 파일 형식 정책 확정 및 UI/백엔드 검증 로직 업데이트.
4. CloudFront 기반 UI 단독 배포 워크플로 정의 및 GitHub Actions 파이프라인 분기 설계.
5. `docs/architecture/current-system.drawio` 작성 후 이해관계자 리뷰 세션 일정화.

## 9. 산출물 및 보관 위치
- 본 문서: `docs/done/step-02-application-architecture/application-architecture-notes.md`.
- (작성 예정) 아키텍처 다이어그램: `docs/architecture/current-system.drawio`.
- (작성 예정) 시스템 구성 요약: `docs/architecture/current-system.md`.
