---
title: API 명세서: Echo AI (MVP)
domain: product
status: approved
owner: product@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
물론입니다. 프론트엔드와 백엔드 개발팀 간의 원활한 협업을 위한 핵심 '계약서'인 \*\*API 명세서(API Specification)\*\*를 작성해 드리겠습니다.

---

## **API 명세서: Echo AI (MVP)**

* **버전:** 1.0  
* **작성일:** 2025년 7월 4일  
* **문서 상태:** **확정**

### **1\. 문서 개요**

이 문서는 'Echo AI' MVP의 REST API 엔드포인트, 요청(Request), 응답(Response) 형식을 정의합니다.

* **기본 URL (Base URL):** https://api.echoai.example.com (API Gateway 배포 후 확정)

### **2\. 인증 (Authentication)**

* 회원가입(POST /auth/signup)과 로그인(POST /auth/login)을 제외한 모든 API 요청은 인증이 필요합니다.  
* 인증 방식은 \*\*JWT(JSON Web Token)\*\*를 사용합니다.  
* 로그인 성공 시 발급된 accessToken을 모든 요청 헤더(Header)에 다음과 같은 형식으로 포함해야 합니다.  
  * Authorization: Bearer \<accessToken\>

### **3\. 공통 응답 형식 (Common Response Format)**

#### **에러 응답 (Error Response)**

모든 에러 응답은 아래와 같은 JSON 형식을 따릅니다.

JSON

{  
  "message": "에러에 대한 설명"  
}

### **4\. API 엔드포인트 명세**

---

#### **Epic 1: 사용자 인증 (/auth)**

##### **1.1 회원가입**

* **Endpoint:** POST /auth/signup  
* **설명:** 신규 사용자를 등록합니다.  
* **Request Body:**

| 필드 | 타입 | 설명 | 필수 |
| :---- | :---- | :---- | :---- |
| email | String | 사용자 이메일 | O |
| password | String | 사용자 비밀번호 (8자 이상) | O |

* **Response (201 Created):**

JSON

{  
  "userId": "c7a9f3d5-e8d0-4a8f-8b1c-2e9d7f6c5b4a",  
  "email": "user@example.com",  
  "accessToken": "ey..."  
}

* **Error Responses:**  
  * 400 Bad Request: 필수 필드가 누락되거나 유효성 검사(비밀번호 길이 등)에 실패한 경우.  
  * 409 Conflict: 이미 존재하는 이메일일 경우.

---

##### **1.2 로그인**

* **Endpoint:** POST /auth/login  
* **설명:** 기존 사용자를 인증하고 accessToken을 발급합니다.  
* **Request Body:**

| 필드 | 타입 | 설명 | 필수 |
| :---- | :---- | :---- | :---- |
| email | String | 사용자 이메일 | O |
| password | String | 사용자 비밀번호 | O |

* **Response (200 OK):**

JSON

{  
  "userId": "c7a9f3d5-e8d0-4a8f-8b1c-2e9d7f6c5b4a",  
  "email": "user@example.com",  
  "accessToken": "ey..."  
}

* **Error Responses:**  
  * 401 Unauthorized: 이메일 또는 비밀번호가 일치하지 않을 경우.

---

#### **Epic 2: 문서 관리 (/documents)**

##### **2.1 문서 업로드를 위한 Pre-signed URL 요청**

* **Endpoint:** POST /documents/presigned-url  
* **설명:** 클라이언트가 S3로 직접 파일을 업로드할 수 있는 임시 URL을 발급받습니다.  
* **인증:** **필수**  
* **Request Body:**

| 필드 | 타입 | 설명 | 필수 |
| :---- | :---- | :---- | :---- |
| fileName | String | 업로드할 파일의 이름 (예: "report.txt") | O |
| fileType | String | 업로드할 파일의 MIME 타입 (예: "text/plain") | O |

* **Response (200 OK):**

JSON

{  
  "uploadUrl": "https://s3.ap-northeast-2.amazonaws.com/...",  
  "documentId": "b8a1c2d3-e4f5-g6h7-i8j9-k0l1m2n3o4p5"  
}

* **Error Responses:**  
  * 400 Bad Request: 필수 필드가 누락된 경우.  
  * 401 Unauthorized: 인증 실패.

---

##### **2.2 사용자 문서 목록 조회**

* **Endpoint:** GET /documents  
* **설명:** 인증된 사용자가 업로드한 모든 문서의 메타데이터 목록을 조회합니다.  
* **인증:** **필수**  
* **Response (200 OK):**

JSON

\[  
  {  
    "documentId": "b8a1c2d3-e4f5...",  
    "documentName": "report.txt",  
    "uploadTimestamp": "2025-07-04T16:15:48.000Z",  
    "summaryStatus": "COMPLETE"  
  },  
  {  
    "documentId": "c9b2d3e4-f5g6...",  
    "documentName": "meeting\_notes.md",  
    "uploadTimestamp": "2025-07-03T11:30:00.000Z",  
    "summaryStatus": "PENDING"  
  }  
\]

* **Error Responses:**  
  * 401 Unauthorized: 인증 실패.

---

##### **2.3 특정 문서 상세 및 요약 조회**

* **Endpoint:** GET /documents/{docId}  
* **설명:** 특정 문서의 상세 정보와 AI 요약 결과를 조회합니다.  
* **인증:** **필수**  
* **URL Parameter:**  
  * docId: 조회할 문서의 고유 ID  
* **Response (200 OK):**

JSON

{  
  "documentId": "b8a1c2d3-e4f5...",  
  "documentName": "report.txt",  
  "uploadTimestamp": "2025-07-04T16:15:48.000Z",  
  "summaryStatus": "COMPLETE",  
  "summaryText": "이 문서는 3분기 실적에 대한 보고서로, 매출 상승과 주요 성과에 대해 다룹니다...",  
  "originalContent": "3분기 실적 보고서\\n1. 개요\\n..."  
}

* **Error Responses:**  
  * 401 Unauthorized: 인증 실패.  
  * 404 Not Found: 해당 ID의 문서가 존재하지 않거나, 다른 사용자의 문서일 경우.

---

##### **2.4 문서 삭제**

* **Endpoint:** DELETE /documents/{docId}  
* **설명:** 특정 문서를 삭제합니다.  
* **인증:** **필수**  
* **URL Parameter:**  
  * docId: 삭제할 문서의 고유 ID  
* **Response (204 No Content):**  
  * 성공 시에는 응답 본문(Body) 없이 상태 코드 204만 반환됩니다.  
* **Error Responses:**  
  * 401 Unauthorized: 인증 실패.  
  * 404 Not Found: 해당 ID의 문서가 존재하지 않거나, 다른 사용자의 문서일 경우.
