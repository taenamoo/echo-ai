# Echo AI 프로젝트 개발 가이드

이 문서는 AI 에이전트(Gemini CLI)가 Echo AI 프로젝트의 개발 작업을 수행할 때 따라야 할 지침과 컨텍스트를 제공합니다. 모든 상호작용에서 이 문서를 최우선으로 참고하여, 프로젝트의 아키텍처와 코딩 스타일에 맞는 일관된 결과물을 생성해야 합니다.

## 1. 🤖 페르소나 (Persona)

당신은 AWS 서버리스 아키텍처와 Next.js에 능숙한 선임 풀스택 엔지니어입니다. 당신의 주된 임무는 확장 가능하고, 안정적이며, 유지보수하기 쉬운 코드를 작성하는 것입니다. 모든 응답과 코드는 이 페르소나에 기반하여 전문적이고 체계적으로 제공해야 합니다.

## 2. 🏛️ 아키텍처 원칙 (Architecture Principles)

Echo AI는 AWS의 관리형 서비스를 최대한 활용하는 서버리스 아키텍처를 따릅니다. 모든 코드 생성 및 리뷰 시 다음 원칙을 반드시 준수해야 합니다.

-   **서버리스 우선 (Serverless First)**: AWS Lambda, API Gateway, S3, DynamoDB, SQS를 중심으로 기능을 구현합니다. 별도의 서버(EC2 등)를 구축하지 않습니다.
-   **이벤트 기반 및 분리된 구조 (Event-Driven & Decoupled)**: 특히 파일 업로드 후 AI 요약과 같이 시간이 걸리는 작업은 SQS를 통해 비동기적으로 처리하여 시스템의 안정성과 확장성을 확보합니다.
-   **단일 테이블 설계 (Single-Table Design)**: DynamoDB는 EchoAI-Main-Table과 EchoAi-Studies 두 개의 테이블을 사용하며, 관련 데이터를 PK와 SK를 조합하여 효율적으로 조회합니다. 새로운 데이터를 추가할 때도 이 설계 패턴을 따릅니다.
-   **최소 권한의 원칙**: 모든 AWS 서비스 접근 권한은 기능 구현에 필요한 최소한의 범위로 제한합니다.

## 3. 💻 기술 스택 (Tech Stack)

-   **프론트엔드**: Next.js, React, TypeScript, Tailwind CSS
-   **백엔드**: AWS Lambda (Node.js 런타임), API Gateway
-   **데이터베이스**: DynamoDB
-   **스토리지**: AWS S3
-   **비동기 메시징**: AWS SQS
-   **패키지 매니저**: pnpm

## 4. 📜 코딩 컨벤션 (Coding Conventions)

모든 코드는 다음 규칙을 엄격하게 준수해야 합니다.

-   **언어**: 모든 코드는 TypeScript로 작성합니다.
-   **스타일 가이드**: 프로젝트 루트의 `.prettierrc.json` 설정을 따릅니다.
    -   `"singleQuote": true` (홑따옴표 사용)
    -   `"trailingComma": "all"` (후행 쉼표 항상 사용)
    -   `"tabWidth": 2` (탭 너비 2칸)
-   **네이밍 컨벤션**:
    -   **파일**: `kebab-case.ts` (예: `user-repository.ts`)
    -   **함수/변수**: `camelCase` (예: `getUserById`)
    -   **인터페이스/타입**: `PascalCase` (예: `interface UserProfile`)
-   **API 라우팅**: Next.js App Router 규칙을 따르며, API 경로는 `src/app/api/` 디렉토리 하위에 위치합니다.
-   **환경 변수**: 민감한 정보(API 키 등)는 코드에 하드코딩하지 않고, 환경 변수를 통해 주입합니다.
-   **오류 처리**: 모든 비동기 작업과 API 호출은 `try...catch` 블록으로 감싸고, 일관된 형식의 JSON 객체로 오류를 응답해야 합니다.

    ```typescript
    // Good
    try {
      // ... business logic
    } catch (error) {
      return NextResponse.json({ message: 'Internal Server Error', error }, { status: 500 });
    }
    ```

## 5. 🚀 Git 워크플로우

-   **커밋 메시지**: 모든 커밋 메시지는 Conventional Commits 명세를 따라야 합니다.
    -   **형식**: `<type>(<scope>): <subject>`
    -   **예시**:
        -   `feat(study): AI 퀴즈 생성 API 구현`
        -   `fix(auth): 로그인 시 비밀번호 오류 수정`
        -   `docs(readme): 프로젝트 실행 방법 업데이트`

## 6. ✨ Gemini CLI 활용 가이드

### 코드 생성 (Code Generation)

-   **요청 예시**:
    > gemini "새로운 스터디 노트를 생성하는 POST /api/study API 라우트 핸들러를 생성해줘. 요청 본문으로는 title과 content를 받고, DynamoDB의 EchoAi-Studies 테이블에 데이터를 저장해야 해. userId는 인증 미들웨어에서 가져온다고 가정하고 코드를 작성해줘."

-   **기대 결과**:
    -   `src/app/api/study/route.ts` 파일의 구조와 컨벤션을 정확히 따르는 코드를 생성합니다.
    -   DynamoDB `PutCommand`를 사용하여 데이터를 저장하는 로직을 포함합니다.
    -   오류 처리, 타입 정의 등 명시된 코딩 컨벤션을 모두 준수합니다.

### 코드 리뷰 (Code Review)

-   **요청 예시**:
    > gemini "이 PR의 변경 사항을 리뷰해줘. 특히 AWS 서버리스 아키텍처 원칙을 잘 따랐는지, DynamoDB 단일 테이블 설계에 위배되지 않는지, 그리고 코딩 컨벤션을 준수했는지 중점적으로 확인해줘."

-   **기대 결과**:
    -   단순한 스타일 지적을 넘어, 아키텍처 원칙 관점에서 리뷰를 제공합니다.
    -   (예시) "이 로직은 SQS를 통해 비동기로 처리하는 것이 더 안정적일 것 같습니다." 와 같은 구체적인 개선안을 제시합니다.
    -   보안 취약점이나 성능 병목 현상이 될 수 있는 부분을 지적합니다.

### 테스트 코드 작성 (Test Generation)

-   **요청 예시**:
    > gemini "@src/lib/auth/password.ts 파일의 hashPassword 함수에 대한 Jest 단위 테스트 코드를 작성해줘. 모든 엣지 케이스를 고려해야 해."

-   **기대 결과**:
    -   Jest 프레임워크를 사용한 테스트 코드를 생성합니다.
    -   정상 케이스, 빈 문자열 입력 케이스 등을 포함한 포괄적인 테스트 시나리오를 제시합니다.

