## Gemini-CLI 작업 계획서: LocalStack/DynamoDB 초기화 + S3 업로드 연동

### 1\. 목표

`Echo AI` 프로젝트의 파일 업로드 기능을 **로컬 개발 환경**에서도 원활하게 테스트하고 개발할 수 있도록 **LocalStack** 기반의 S3 연동을 구현합니다. `NODE_ENV` 환경 변수를 기준으로 실제 AWS S3와 LocalStack S3를 동적으로 전환하는 로직을 추가합니다.

-----

### 2\. 주요 작업 내용

| 작업 단계 | 파일 위치 | 작업 내용 | Gemini-CLI 프롬프트 예시 |
| --- | --- | --- | --- |
| **1단계** | `src/lib/aws/s3.ts` | **S3 Client 동적 설정**\<br/\>- `NODE_ENV`가 'development'일 경우 LocalStack 엔드포인트(`http://localhost:4566`)를 사용하도록 S3 Client 설정을 수정합니다.\<br/\>- LocalStack은 실제 자격증명이 필요 없으므로, 더미 값을 사용하도록 설정합니다.\<br/\>- `forcePathStyle: true` 옵션을 추가하여 LocalStack과 호환성을 확보합니다. | `src/lib/aws/s3.ts` 파일을 수정해줘. `NODE_ENV`가 'development'일 때는 LocalStack(엔드포인트: 'http://localhost:4566', 리전: 'ap-northeast-2', 자격증명: 'dummy')을 사용하고, 그렇지 않을 때는 기존 AWS S3 설정을 사용하도록 S3 클라이언트 초기화 로직을 수정해줘. LocalStack을 사용할 때는 `forcePathStyle: true` 옵션을 추가해줘. |
| **2단계** | `env.local_test` | **로컬 환경 변수 추가**\<br/\>- 로컬 개발에 필요한 `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` 환경 변수를 추가하고, LocalStack에서 사용할 임의의 값을 할당합니다. | `env.local_test` 파일의 이름을 `.env.local`로 변경하고, LocalStack 연동에 필요한 `AWS_REGION=ap-northeast-2`, `AWS_ACCESS_KEY_ID=test`, `AWS_SECRET_ACCESS_KEY=test` 환경 변수를 추가해줘. |
| **3단계**| `package.json` | **개발용 스크립트 수정**\<br/\>- `dev` 스크립트 실행 시 `NODE_ENV`가 'development'로 설정되도록 수정하여, `next dev` 명령어 실행 시 LocalStack을 바라보게 합니다. | `package.json` 파일의 `scripts` 섹션에서 `dev` 스크립트를 `cross-env NODE_ENV=development next dev`로 수정해줘. `cross-env`가 설치되어 있지 않다면 설치하는 명령어도 알려줘. |
| **4단계**| `docker-compose.yml` | **LocalStack S3 버킷 자동 생성 (초기 1회, idempotent)**\<br/\>- LocalStack 컨테이너 준비 완료(ready) 시 실행되는 스크립트를 `/etc/localstack/init/ready.d`에 마운트합니다.\<br/\>- 버킷명은 `.env.local`의 `S3_BUCKET_NAME`(기본값: `test-bucket`)을 사용합니다. | LocalStack 서비스에 `setting/bash/localstack-init-s3.sh`를 `/etc/localstack/init/ready.d/10-init-s3.sh`로 마운트하도록 `docker-compose.yml`을 수정해줘. |
| **5단계**| `setting/bash/localstack-init-s3.sh` | **S3 버킷 생성 스크립트 작성**\<br/\>- `awslocal`을 사용해 버킷이 없을 경우 생성합니다. 실행은 매 부팅마다 되지만, 존재 시 스킵하도록 idempotent하게 작성합니다. | 아래 스니펫을 참고해 `setting/bash/localstack-init-s3.sh` 파일을 생성해줘: `#!/bin/bash` → `set -euo pipefail` → `BUCKET=\${S3_BUCKET_NAME:-test-bucket}` → 존재 확인 후 `awslocal s3api create-bucket ...` 실행. |
| **6단계**| `docker-compose.yml` | **DynamoDB 테이블 자동 생성(처음 켜질 때)**\<br/\>- `dynamodb-local`이 기동된 뒤 테이블을 1회성으로 생성하는 `init` 컨테이너를 추가합니다.\<br/\>- `amazon/aws-cli` 이미지를 사용해 `aws dynamodb create-table --endpoint-url http://dynamodb-local:8998 ...` 형태로 생성합니다(존재 시 스킵). | `dynamodb-init` 서비스를 추가하고 `depends_on: [dynamodb-local]`로 설정해줘. init 스크립트는 `setting/bash/dynamodb-init.sh`를 마운트해 `sh /init/dynamodb-init.sh`로 실행해줘. |
| **7단계**| `setting/bash/dynamodb-init.sh` | **테이블 정의 및 생성 로직 작성**\<br/\>- 테이블 1: `EchoAI-Main-Table` → PK: `PK`(HASH), SK: `SK`(RANGE), GSI `EmailIndex`(PK: `email`)\<br/\>- 테이블 2: `EchoAi-Studies` → PK: `user_id`(HASH), SK: `study_id`(RANGE)\<br/\>- 존재 여부 확인 후 없을 때만 생성하고 `aws dynamodb wait table-exists`로 대기 | 스크립트에서 `AWS_REGION=ap-northeast-2`, `AWS_ACCESS_KEY_ID=dummy`, `AWS_SECRET_ACCESS_KEY=dummy`, `ENDPOINT=http://dynamodb-local:8998`를 사용해 idempotent하게 생성하도록 작성해줘. |

-----

### 3\. 기대 효과

  * **개발 효율성 향상**: 실제 AWS 리소스 없이도 로컬 환경에서 S3 파일 업로드 기능의 전체 플로우를 완벽하게 테스트하고 개발할 수 있습니다.
  * **비용 절감**: 개발 및 테스트 단계에서 불필요한 AWS S3 사용 비용을 절감할 수 있습니다.
  * **안정적인 테스트 환경**: 외부 네트워크나 실제 AWS 서비스의 상태에 영향을 받지 않는 독립적이고 안정적인 테스트 환경을 구축할 수 있습니다.

-----

### 4\. 구현 상세 스니펫

- `setting/bash/localstack-init-s3.sh`

  ```bash
  #!/bin/bash
  set -euo pipefail

  BUCKET="${S3_BUCKET_NAME:-test-bucket}"
  REGION="${AWS_REGION:-ap-northeast-2}"

  echo "[LocalStack Init] Ensure S3 bucket: ${BUCKET} in ${REGION}"

  if awslocal s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
    echo "Bucket already exists: $BUCKET"
  else
    # Region-aware create (LocalStack는 us-east-1 이외 리전일 경우 LocationConstraint 필요)
    if [ "$REGION" = "us-east-1" ]; then
      awslocal s3api create-bucket --bucket "$BUCKET"
    else
      awslocal s3api create-bucket \
        --bucket "$BUCKET" \
        --create-bucket-configuration LocationConstraint="$REGION"
    fi
    echo "Bucket created: $BUCKET"
  fi
  ```

- `setting/bash/dynamodb-init.sh`

  ```bash
  #!/bin/sh
  set -euo pipefail

  REGION="${AWS_REGION:-ap-northeast-2}"
  ENDPOINT="${DYNAMODB_ENDPOINT:-http://dynamodb-local:8998}"

  export AWS_REGION="$REGION"
  export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-dummy}"
  export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-dummy}"

  echo "[DynamoDB Init] Endpoint: $ENDPOINT, Region: $REGION"

  ensure_table() {
    NAME="$1";
    DESC_JSON="$2";
    if aws dynamodb describe-table --endpoint-url "$ENDPOINT" --table-name "$NAME" >/dev/null 2>&1; then
      echo "Table already exists: $NAME"
    else
      echo "Creating table: $NAME"
      echo "$DESC_JSON" | jq .
      aws dynamodb create-table \
        --endpoint-url "$ENDPOINT" \
        --cli-input-json "$DESC_JSON"
      aws dynamodb wait table-exists --endpoint-url "$ENDPOINT" --table-name "$NAME"
      echo "Table created: $NAME"
    fi
  }

  MAIN_TABLE_JSON='{
    "TableName": "EchoAI-Main-Table",
    "AttributeDefinitions": [
      {"AttributeName": "PK", "AttributeType": "S"},
      {"AttributeName": "SK", "AttributeType": "S"},
      {"AttributeName": "email", "AttributeType": "S"}
    ],
    "KeySchema": [
      {"AttributeName": "PK", "KeyType": "HASH"},
      {"AttributeName": "SK", "KeyType": "RANGE"}
    ],
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "EmailIndex",
        "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
        "Projection": {"ProjectionType": "ALL"},
        "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
      }
    ],
    "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
  }'

  STUDY_TABLE_JSON='{
    "TableName": "EchoAi-Studies",
    "AttributeDefinitions": [
      {"AttributeName": "user_id", "AttributeType": "S"},
      {"AttributeName": "study_id", "AttributeType": "S"}
    ],
    "KeySchema": [
      {"AttributeName": "user_id", "KeyType": "HASH"},
      {"AttributeName": "study_id", "KeyType": "RANGE"}
    ],
    "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
  }'

  ensure_table "EchoAI-Main-Table" "$MAIN_TABLE_JSON"
  ensure_table "EchoAi-Studies" "$STUDY_TABLE_JSON"
  ```

- `docker-compose.yml` 변경 포인트

  - LocalStack:
    - volumes: `./setting/bash/localstack-init-s3.sh:/etc/localstack/init/ready.d/10-init-s3.sh:ro`
    - environment: `SERVICES=s3`, `AWS_REGION=ap-northeast-2`(옵션), `.env.local`에서 `S3_BUCKET_NAME` 주입

  - DynamoDB 초기화 one-shot 컨테이너 추가:

  ```yaml
  dynamodb-init:
    image: amazon/aws-cli:latest
    container_name: echo-ai-dynamodb-init
    depends_on:
      - dynamodb-local
    environment:
      AWS_REGION: ${AWS_REGION:-ap-northeast-2}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:-dummy}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:-dummy}
      DYNAMODB_ENDPOINT: http://dynamodb-local:8998
    volumes:
      - ./setting/bash/dynamodb-init.sh:/init/dynamodb-init.sh:ro
    entrypoint: ["sh", "/init/dynamodb-init.sh"]
    networks:
      - echo-ai-net
    restart: "no"

참고: `amazon/aws-cli` 이미지는 `latest` 또는 구체 버전 태그(예: `2.17.16`)를 사용할 수 있습니다. `:2` 태그는 존재하지 않으므로 사용하지 마세요.
  ```

-----

### 5\. 유의사항 및 검증

- LocalStack S3 초기화는 컨테이너가 재시작될 때마다 실행되지만, 스크립트가 존재 여부를 확인하므로 안전합니다.
- DynamoDB 초기화 컨테이너는 매 compose up 시 1회 실행되며, 테이블 존재 시 스킵합니다.
- 앱 컨테이너의 기존 `setting/bash/docker-entrypoint.sh`는 애플리케이션 부팅 용도로 유지하고, LocalStack 초기화에는 사용하지 않습니다.
- `.env.local`의 `S3_BUCKET_NAME` 값(`test-bucket`)과 앱 코드의 업로드 대상 버킷이 일치해야 합니다.
