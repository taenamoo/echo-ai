---
title: IaC 구현 가이드 (CloudFormation vs AWS CDK)
domain: architecture
status: approved
owner: architecture@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# IaC 구현 가이드 (CloudFormation vs AWS CDK)

본 가이드는 `docs/02-architecture/approved/current-to-target-transition-plan-approved.md` 1단계 과제 중 하나인 "IaC 접근 방식(CloudFormation 템플릿 vs CDK)과 공통 태깅, IAM 최소 권한 표준" 확립을 위해 작성되었다. AWS CDK를 1차 표준으로 채택하되, 순수 CloudFormation 템플릿이 필요한 예외 상황도 지원하도록 한다.

## 1. 의사결정 요약
- **주 표준**: AWS CDK(TypeScript).
  - 기존 코드베이스가 TypeScript 모노레포로 구성되어 있어 동일 언어 기반의 IaC가 온보딩 비용을 낮춘다.
  - 고수준 Construct를 활용해 반복 리소스 정의를 줄이고, 스택 간 공유 패턴(예: 태그, IAM 정책)을 코드로 재사용할 수 있다.
  - `cdk.json`/`context`를 활용한 환경 파라미터 관리가 용이하며, GitHub Actions에서 `pnpm` 기반 워크플로우와 자연스럽게 통합된다.
- **보조 표준**: CloudFormation 템플릿.
  - 보안·규제상 Change Set 리뷰가 필요한 리소스나, AWS 서비스 팀에서 제공하는 샘플 템플릿을 그대로 사용해야 하는 경우 보조 수단으로 유지한다.
  - CDK `Cfn*` Construct 또는 `cdk synth --no-staging`으로 추출한 템플릿을 소스 관리하여 이중화한다.

## 2. CloudFormation vs CDK 비교
| 항목 | AWS CDK | 순수 CloudFormation |
| --- | --- | --- |
| 언어 | TypeScript(공통 언어 재사용) | YAML/JSON(별도 문법) |
| 재사용성 | Construct, 스택 조합 가능 | 템플릿 조각 재활용 어려움 |
| 변경 추적 | 코드 diff로 의도 파악 용이 | 리소스 변경 시 diff 가독성 낮음 |
| 운영 절차 | `cdk diff/deploy`, Pipeline 구성 쉬움 | Change Set + Manual deploy |
| 러닝 커브 | 기존 TS 개발자에게 친숙 | 인프라/DevOps 팀에는 익숙 |
| 예외 처리 | L1/L2 Construct로 대부분 커버 | 모든 리소스를 원시 수준에서 제어 |

**결론**: 전사 표준은 CDK로 통일하되, 사전 승인된 예외에 한해 CloudFormation 템플릿을 저장소(`infra/cloudformation`)에 병행 보관한다.

## 3. 디렉터리 및 브랜치 전략
- `infra/cdk/` 내 스택 구성
  - `infra/cdk/bin/echoai.ts`: 엔트리 포인트, `SharedStack`, `ApiStack`, `OpsStack` 등 환경별 인스턴스를 생성.
  - `infra/cdk/lib/`: 각 스택 정의. 공통 Construct는 `lib/shared/`에 배치.
  - `infra/cdk/context/dev.json`, `stage.json`, `prod.json`: 환경별 파라미터(도메인, 용량, 엔드포인트 URL 등)를 JSON으로 분리.
- CloudFormation 예외 템플릿은 `infra/cloudformation/<service>/<stack>.yaml` 구조로 보관하고, README에 사용 용도를 명시한다.
- 브랜치 전략은 기존 모노레포와 동일하게 `main`/`develop` 기준을 유지하며, IaC 변경은 Pull Request 설명에 `cdk diff` 결과 요약을 첨부한다.

## 4. 공통 태깅 표준
모든 스택/리소스는 CDK `Tags.of(resource).add(key, value)` 또는 CloudFormation `Tags` 항목을 통해 다음 태그를 필수 부여한다.

| Key | Value 규칙 | 비고 |
| --- | --- | --- |
| `Project` | `echo-ai` | 전체 공통 |
| `Environment` | `dev`/`stage`/`prod` | context 파라미터에서 주입 |
| `Owner` | `platform@echo-ai.internal` | 운영 책임자 메일 |
| `CostCenter` | `ml-ops` | 재무 보고용 |
| `Confidentiality` | `internal`/`restricted` | 데이터 민감도에 따라 선택 |

- 추가 태그가 필요한 경우 `infra/cdk/lib/tags.ts`에 헬퍼 함수를 두고 일괄 관리한다.
- CloudFormation 예외 템플릿에도 동일 태그를 하드코딩하거나 Parameter + Mapping 조합으로 적용한다.

## 5. IAM 최소 권한 정책 표준
### 5.1 원칙
1. **권한 분리**: 스택별 IAM Role은 리소스 목적(예: API Lambda, Summarizer Lambda, 배포 파이프라인) 기준으로 분리한다.
2. **Least Privilege**: `actions`, `resources`, `conditions`를 모두 명시하고 `*` 사용을 피한다.
3. **정기 감사**: CDK `iam.AccessAnalyzer` 리포트를 CI에서 실행하여 과도한 권한을 감지한다.

### 5.2 역할별 가이드
- **API Lambda Role (`EchoApiLambdaRole`)**
  - 허용 작업: `dynamodb:GetItem`, `dynamodb:Query`, `sqs:SendMessage`, `logs:CreateLogStream/PutLogEvents`.
  - 리소스 범위: 테이블/큐 ARN을 `Fn.importValue` 또는 CDK `Table.fromTableArn`으로 주입해 특정 ARN으로 제한.
  - 조건: 필요 시 `"dynamodb:LeadingKeys": ["USER#"]` 등 프리픽스 조건을 추가.
- **Summarizer Lambda Role (`EchoSummarizerRole`)**
  - 허용 작업: `dynamodb:UpdateItem`, `s3:PutObject`, `secretsmanager:GetSecretValue`, `logs:*` 최소 범위.
  - Secrets 접근은 `Secret.fromSecretNameV2`로 특정 시크릿만 허용.
- **GitHub Actions OIDC Role (`EchoPipelineRole`)**
  - 신뢰 정책: GitHub OIDC Provider + 리포지토리 조건.
  - 작업: `cloudformation:*ChangeSet*`, `cloudformation:Describe*`, `iam:PassRole`(대상 스택 롤만), `lambda:UpdateFunctionCode`, `s3:PutObject`(배포 아티팩트 버킷).
- **Operations Role (`EchoOpsRole`)**
  - 비상 조치를 위해 `cloudwatch:PutMetricAlarm`, `lambda:UpdateEventSourceMapping` 등 제한적 운영 권한.

### 5.3 CDK 구현 예시
```ts
import { Duration, Tags } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

const table = Table.fromTableArn(this, 'ProfilesTable', props.profilesTableArn);
const queue = Queue.fromQueueArn(this, 'SummaryQueue', props.summaryQueueArn);

const apiRole = new Role(this, 'EchoApiLambdaRole', {
  assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
});

apiRole.addToPolicy(new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['dynamodb:GetItem', 'dynamodb:Query'],
  resources: [table.tableArn],
}));

apiRole.addToPolicy(new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['sqs:SendMessage'],
  resources: [queue.queueArn],
}));
```

- CloudFormation 예외 시 동일 정책을 YAML로 변환해 별도 템플릿에 반영한다.
- Lambda 로그 권한은 `aws-cdk-lib/aws-logs` 모듈의 `LogGroup.grantWrite`를 사용해 붙인다.

## 6. CDK 배포 절차 및 품질 관리
1. `pnpm install` 후 `pnpm --filter infra-cdk build`(별도 패키지 구성 시) → `cdk synth`로 템플릿 확인.
2. PR 작성 전 `cdk diff --context env=dev` 출력 요약을 PR 본문에 첨부.
3. main 병합 후 GitHub Actions가 `cdk deploy --require-approval=never`를 실행.
4. 배포 실패 시 Change Set을 검토하고, 필요한 경우 `cdk deploy --app 'npx ts-node bin/echoai.ts' --profile <ops>` 방식으로 수동 복구.

## 7. 후속 조치
- 본 가이드 요약본을 `docs/done/step-01-iac-guideline-summary.md`로 배포해 이해관계자에 공유한다.
- `docs/02-architecture/approved/target-architecture-overview-approved.md` 내 IaC 섹션을 본 표준에 맞게 업데이트할 백로그를 등록한다.
- IAM 템플릿 검증을 위해 Step Functions 기반 권한 감사 워크플로 도입 여부를 평가한다.
