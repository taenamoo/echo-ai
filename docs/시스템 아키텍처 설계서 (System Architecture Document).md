물론입니다. 프로젝트의 기술적 심장을 정의하는 \*\*시스템 아키텍처 설계서(System Architecture Document)\*\*를 작성해 드리겠습니다.

---

## **시스템 아키텍처 설계서: Echo AI (MVP)**

* **버전:** 1.0  
* **작성일:** 2025년 7월 4일  
* **문서 상태:** **확정**

### **1\. 문서 개요**

이 문서는 'Echo AI' MVP의 기술 아키텍처를 정의합니다. 시스템을 구성하는 각 기술 요소의 역할과 책임, 그리고 이들 간의 데이터 흐름 및 상호작용 방식을 기술하는 것을 목적으로 합니다.

### **2\. 아키텍처 목표 및 원칙**

본 아키텍처는 다음 핵심 원칙을 기반으로 설계되었습니다.

* **서버리스 우선 (Serverless First):** 유휴 상태의 서버 없이, 실제 사용량에 대해서만 비용을 지불하여 초기 비용과 운영 비용을 최소화합니다.  
* **이벤트 기반 및 분리된 구조 (Event-Driven & Decoupled):** 각 컴포넌트가 독립적으로 동작하고 이벤트에 반응하도록 설계하여, 시스템의 안정성과 확장성을 극대화합니다. SQS를 통한 작업 분리가 대표적인 예입니다.  
* **관리형 서비스 활용 (Managed Services):** AWS가 제공하는 관리형 서비스(S3, DynamoDB, Lambda 등)를 적극적으로 사용하여, 인프라 관리 부담을 줄이고 비즈니스 로직 개발에 집중합니다.  
* **보안 최우선 (Security by Design):** 네트워크 격리, 데이터 암호화, 최소 권한 원칙을 적용하여 사용자의 데이터를 안전하게 보호합니다.

### **3\. 시스템 구성 요소 및 다이어그램**

#### **아키텍처 다이어그램**

\[사용자 브라우저 (Next.js)\]  
      |  
      |--- (API 요청) \---\> \[API Gateway\] \<=\> \[Lambda: API Handler\]  
      |                                        |  
      |\<-- (S3 Presigned URL) \--|                | (DynamoDB/Secrets Manager 접근)  
      |                                        |  
      \`--- (파일 직접 업로드) \--\> \[S3 Bucket\] \----\> (Event) \----\> \[SQS Queue\]  
                                                                     |  
                                                                     | (Polling)  
                                                                     V  
                                                 \[Lambda: AI Processor (VPC 내부)\]  
                                                         |  
                                                         | (ChatGPT API 호출)  
                                                         V  
                                                     \[DynamoDB\]

#### **구성 요소별 역할**

* **Client (Next.js):** 사용자에게 보여지는 웹 애플리케이션입니다. UI 렌더링, 사용자 상호작용 처리, 백엔드 API 호출을 담당합니다.  
* **Amazon API Gateway:** 모든 API 요청을 수신하여 적절한 Lambda 함수로 라우팅하는 단일 진입점(Entry Point)입니다.  
* **AWS Lambda:**  
  * **API Handler:** 회원가입, 로그인, S3 Pre-signed URL 생성 등 동기적(Synchronous)이고 즉각적인 응답이 필요한 요청을 처리합니다.  
  * **AI Processor:** SQS 큐를 통해 비동기적(Asynchronous)으로 트리거되어, 실제 AI 요약 작업을 수행하는 핵심 워커(Worker)입니다.  
* **Amazon S3:** 사용자가 업로드한 원본 문서 파일(.txt, .md)을 저장하는 객체 스토리지입니다.  
* **Amazon DynamoDB:** 사용자 프로필, 문서 메타데이터, AI 요약 결과 등 정형화된 데이터를 저장하는 NoSQL 데이터베이스입니다.  
* **Amazon SQS (Simple Queue Service):** 즉각적인 응답이 필요한 파일 업로드 작업과 시간이 소요되는 AI 분석 작업을 분리하는 메시지 큐입니다. 시스템의 부하를 분산하고 안정성을 높이는 핵심 요소입니다.  
* **Amazon VPC (Virtual Private Cloud):** Lambda 함수와 같은 백엔드 리소스를 위한 논리적으로 격리된 네트워크 공간을 제공하여 보안을 강화합니다.  
* **AWS Secrets Manager:** ChatGPT API 키와 같은 민감한 정보를 안전하게 저장하고 관리합니다.  
* **Amazon CloudWatch:** 모든 Lambda 함수의 로그를 수집하고, 시스템 지표를 모니터링하며, 비용 임계값 도달 시 알람을 보내는 역할을 합니다.

### **4\. 주요 데이터 흐름 (Key Data Flows)**

#### **Flow 1: 문서 업로드 및 AI 요약**

1. **\[Client\]** 사용자가 '업로드' 버튼을 누르고 파일을 선택합니다.  
2. **\[Client → API Gateway → Lambda\]** 백엔드에 S3 Pre-signed URL을 요청합니다.  
3. **\[Lambda → Client\]** Lambda 함수가 URL을 생성하여 클라이언트에 반환합니다.  
4. **\[Client → S3\]** 클라이언트는 받은 URL을 사용해 S3 버킷에 파일을 직접 업로드합니다.  
5. **\[S3 → SQS\]** 파일 업로드가 완료되면 S3는 SQS 큐에 이벤트 메시지를 전송합니다.  
6. **\[SQS → Lambda: AI Processor\]** AI Processor Lambda가 SQS 큐에서 메시지를 폴링하여 가져옵니다.  
7. **\[Lambda\]** Secrets Manager에서 ChatGPT API 키를 가져옵니다.  
8. **\[Lambda → S3\]** S3에서 원본 파일을 읽어옵니다.  
9. **\[Lambda → ChatGPT\]** 읽어온 내용을 ChatGPT API로 보내 요약을 요청합니다.  
10. **\[Lambda → DynamoDB\]** 받은 요약 결과를 DynamoDB의 해당 문서 아이템에 업데이트하고, summaryStatus를 'COMPLETE'로 변경합니다.

### **5\. 데이터베이스 스키마 (Database Schema)**

* **테이블명:** EchoAI-Main-Table  
* **키 구조:**  
  * **파티션 키 (PK):** String (데이터를 그룹화하는 기준)  
  * **정렬 키 (SK):** String (그룹 내에서 데이터를 정렬하고 구분하는 기준)  
* **아이템 타입:**  
  * **사용자 프로필 (User Profile)**  
    * PK: USER\#\<사용자 ID\>  
    * SK: PROFILE  
    * **속성:** email, hashedPassword, createdAt, updatedAt  
  * **문서 메타데이터 (Document Metadata)**  
    * PK: USER\#\<사용자 ID\>  
    * SK: DOC\#\<문서 ID\>  
    * **속성:** documentName, s3Key, fileType, fileSize, uploadTimestamp, summaryStatus (PENDING | COMPLETE | FAILED), summaryText

### **6\. 보안 고려사항**

* **전송 중 데이터 암호화:** 모든 API 통신은 HTTPS/TLS를 통해 암호화합니다.  
* **저장 데이터 암호화:** S3와 DynamoDB의 서버 측 암호화(Server-Side Encryption) 기능을 활성화합니다.  
* **최소 권한 원칙:** 각 Lambda 함수와 서비스는 자신의 역할에 필요한 최소한의 권한(IAM Role)만을 가집니다.  
* **인증 및 인가:** API Gateway를 통해 들어오는 모든 요청은 유효한 JWT(JSON Web Token)를 통해 인증합니다.