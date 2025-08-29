물론입니다. 다섯 번째 핵심 산출물인 **데이터베이스 스키마 설계서**를 작성해 드리겠습니다. 이 문서는 'Echo AI' MVP의 데이터를 저장하고 관리하는 DynamoDB 테이블의 구조를 상세히 정의합니다.

---

## **데이터베이스 스키마 설계서: Echo AI (MVP)**

* **버전:** 1.0  
* **작성일:** 2025년 7월 4일  
* **문서 상태:** **확정**

### **1\. 문서 개요**

이 문서는 'Echo AI' MVP에서 사용할 AWS DynamoDB 테이블의 논리적, 물리적 설계를 정의합니다. 테이블의 키 구조, 아이템 타입, 속성, 그리고 주요 데이터 접근 패턴을 기술합니다.

### **2\. 설계 원칙**

* **단일 테이블 설계 (Single-Table Design):** 관련된 데이터를 동일한 테이블에 저장하여, 단일 요청으로 여러 유형의 데이터를 조회할 수 있게 합니다. 이는 요청 횟수를 줄여 성능을 향상시키고 비용을 절감하는 DynamoDB의 핵심 설계 패턴입니다.  
* **확장성:** 향후 기능 추가(예: 팀, 공유 문서) 시 새로운 아이템 타입을 유연하게 추가할 수 있는 구조를 지향합니다.  
* **예측 가능한 성능:** 주요 접근 패턴에 최적화된 키 설계를 통해, 데이터 양이 증가하더라도 일관된 성능을 제공합니다.

### **3\. 테이블 정의**

* **테이블 명:** EchoAI-Main-Table  
* **기본 키 (Primary Key):**  
  * **파티션 키 (PK):** String. 데이터가 분산 저장되는 기준이 되는 키입니다. (예: USER\#\<사용자 ID\>)  
  * **정렬 키 (SK):** String. 파티션 내에서 데이터를 정렬하고 고유하게 식별하는 키입니다. (예: PROFILE, DOC\#\<문서 ID\>)

### **4\. 아이템 타입 및 속성**

#### **4.1 사용자 프로필 (User Profile)**

사용자의 계정 정보를 저장합니다.

* **키 구조:**  
  * PK: USER\#\<userId\>  
  * SK: PROFILE  
* **속성 (Attributes):**

| 속성명 | 타입 | 설명 |
| :---- | :---- | :---- |
| userId | String | 사용자의 고유 식별자 (UUID) |
| email | String | 사용자 이메일 (로그인 시 사용) |
| hashedPassword | String | 해시 처리된 사용자 비밀번호 |
| createdAt | String | 계정 생성 시각 (ISO 8601 형식) |
| updatedAt | String | 계정 정보 마지막 수정 시각 (ISO 8601 형식) |

#### **4.2 문서 메타데이터 (Document Metadata)**

사용자가 업로드한 각 문서의 정보를 저장합니다.

* **키 구조:**  
  * PK: USER\#\<userId\>  
  * SK: DOC\#\<documentId\>  
* **속성 (Attributes):**

| 속성명 | 타입 | 설명 |
| :---- | :---- | :---- |
| documentId | String | 문서의 고유 식별자 (UUID) |
| documentName | String | 업로드 시의 원본 파일 이름 |
| s3Key | String | S3에 저장된 객체의 키 (경로) |
| fileSize | Number | 파일 크기 (bytes) |
| fileType | String | 파일의 MIME 타입 (예: "text/plain") |
| uploadTimestamp | String | 업로드 완료 시각 (ISO 8601 형식) |
| summaryStatus | String | 요약 처리 상태 (PENDING, COMPLETE, FAILED) |
| summaryText | String | AI가 생성한 요약 결과 (요약 완료 후 채워짐) |

### **5\. 주요 접근 패턴 (Key Access Patterns)**

이 스키마는 다음의 주요 접근 패턴들을 효율적으로 지원합니다.

1. **신규 사용자 생성:**  
   * **작업:** PutItem  
   * **조건:** PK \= USER\#\<userId\>, SK \= PROFILE  
   * **설명:** 회원가입 시 사용자 정보를 테이블에 저장합니다.  
2. **특정 사용자의 모든 문서 목록 조회:**  
   * **작업:** Query  
   * **조건:** PK \= USER\#\<userId\> 이고 SK 가 DOC\# 로 시작하는 모든 아이템.  
   * **설명:** 사용자의 대시보드에 문서 목록을 표시하기 위해 사용됩니다. 단일 쿼리로 한 사용자의 모든 문서를 가져올 수 있어 매우 효율적입니다.  
3. **특정 문서의 상세 정보 조회:**  
   * **작업:** GetItem  
   * **조건:** PK \= USER\#\<userId\>, SK \= DOC\#\<documentId\>  
   * **설명:** 사용자가 목록에서 특정 문서를 클릭했을 때, 해당 문서의 모든 메타데이터와 요약 결과를 가져옵니다.  
4. **문서의 AI 요약 결과 업데이트:**  
   * **작업:** UpdateItem  
   * **조건:** PK \= USER\#\<userId\>, SK \= DOC\#\<documentId\>  
   * **설명:** 백그라운드의 AI Processor Lambda가 요약을 완료한 후, summaryText와 summaryStatus 속성을 업데이트하기 위해 사용됩니다.  
5. **이메일로 사용자 정보 조회 (회원가입 시 중복 확인 등):**  
   * **작업:** Query on **GSI (Global Secondary Index)**  
   * **설명:** PK가 아닌 email로 사용자를 조회하기 위해 GSI가 필요합니다.  
   * **GSI 정의:**  
     * **인덱스 명:** EmailIndex  
     * **파티션 키 (PK):** email