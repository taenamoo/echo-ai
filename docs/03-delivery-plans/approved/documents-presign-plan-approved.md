---
title: 작업 계획서: Pre-signed URL 발급 엔드포인트 구현
domain: delivery-plans
status: approved
owner: delivery@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
## 작업 계획서: Pre-signed URL 발급 엔드포인트 구현
우선순위: 1

### 1. 목표
- 클라이언트가 서버를 거치지 않고 S3로 직접 업로드할 수 있도록 Pre-signed URL 발급 API를 제공한다.
- LocalStack(개발), AWS S3(운영) 환경에서 동일한 코드로 동작하도록 환경/엔드포인트를 분리한다.

-----

- ### 2. 사전 조건 및 고려사항
- 공통 사전조건: `docs/03-delivery-plans/approved/document-management-plan-approved.md` 참조
- 추가 환경 변수(개발에서 브라우저 업로드 지원)
  - 서버 내부 S3 접근: `S3_ENDPOINT=http://localstack:4566` (개발)
  - 브라우저에서 호출 가능한 공개 호스트: `S3_PUBLIC_ENDPOINT=http://localhost:4566` (개발)
  - 공통: `S3_BUCKET_NAME`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- SDK 의존성: `@aws-sdk/s3-request-presigner`
- LocalStack S3 CORS
  - 브라우저가 PUT 요청을 수행할 수 있도록 버킷 CORS를 허용해야 한다(개발 환경에서만 완화 정책 적용).

-----

### 3. 작업 단계 (Step-by-Step)

1) 패키지 추가
- `package.json` dependencies에 `@aws-sdk/s3-request-presigner` 추가
- 설치: `pnpm add @aws-sdk/s3-request-presigner` (CI/개발 환경에 맞게 npm/yarn 대체 가능)

2) 환경 변수 정리 (.env.local)
- `S3_PUBLIC_ENDPOINT=http://localhost:4566` 추가 (운영에서는 미설정 → AWS 기본 엔드포인트 사용)
- 필요 시 `MAX_UPLOAD_SIZE_MB=25` 등의 제한값 추가

3) S3 Presign 전용 클라이언트 구성
- 파일: `packages/@echo-ai/aws-clients/src/s3.ts` 또는 새 헬퍼 `packages/@echo-ai/aws-clients/src/s3-presign.ts`
- 개발 환경에서 Pre-signed URL은 브라우저가 접근 가능한 호스트로 서명되어야 하므로, presign 시에는 `endpoint=S3_PUBLIC_ENDPOINT`를 사용한다.
- 공통 설정: `forcePathStyle: true`, `region=ap-northeast-2`

4) API 라우트 생성
- 파일: `src/app/api/documents/presign/route.ts`
- 메서드: `POST`
- 입력(JSON): `{ filename: string, contentType: string, size?: number }`
- 처리:
  - 인증 토큰 검증 → `userId` 획득
  - 파일 확장자/Content-Type 화이트리스트 확인, (옵션) size 상한 확인
  - `documentId = uuid()` 생성, `s3Key = uploads/{userId}/{documentId}/{filename}` 생성
  - `PutObjectCommand`로 `getSignedUrl(s3ClientForPresign, command, { expiresIn: 600 })`
  - 응답: `{ uploadUrl, bucket, key, expiration, documentId }`

5) LocalStack S3 CORS 설정 (개발)
- 스크립트: `setting/bash/localstack-init-s3.sh`에 CORS 설정 추가 (존재 시 스킵)
- 예시 정책(개발 전용, 완화):
  - AllowedOrigins: `*`
  - AllowedMethods: `PUT, GET, HEAD`
  - AllowedHeaders: `*`

6) 보안/검증 강화
- 파일 종류 화이트리스트: `text/plain`, `application/pdf`, `image/*` 등 필요한 최소 범위
- 최대 업로드 크기: 서버에서 사전 검증, 프론트엔드에서도 안내
- 키 충돌 방지: `userId + documentId + filename` 조합 유지

7) 로깅/오류 처리
- 실패 케이스 로깅: 서명 실패, 유효하지 않은 contentType/size, env 누락
- 응답 코드: 400(검증 실패), 401(인증 없음), 500(내부 오류)

8) 수용 기준 (Acceptance Criteria)
- 브라우저에서 Pre-signed URL로 PUT 업로드 성공 (LocalStack)
- 업로드된 객체가 지정 버킷/키로 확인 가능
- 반환된 URL의 만료(10분)가 정상 동작
- 인증 미포함 요청은 401, 잘못된 입력은 400 응답

9) 수동 테스트 시나리오
- 로그인 후 클라이언트에서 `/api/documents/presign` 호출 → `uploadUrl` 수신
- `curl -X PUT -T ./README.md -H 'Content-Type: text/plain' "<uploadUrl>"`
- `docker exec -it echo-ai-localstack awslocal s3 ls s3://$S3_BUCKET_NAME/uploads/<userId>/<documentId>/`


Login for get token
```
curl -s -X POST http://localhost:3001/api/auth/login \
-H "Content-Type: application/json" \
-d '{ "email":"test@example.com", "password":"12345678" }'
```

Request presign url
```
curl -s -X POST http://localhost:3001/api/documents/presign \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{"filename":"test.txt","contentType":"text/plain"}'
```
-----

### 4. 후속 연계 (다음 작업서 초안)
- 업로드 메타데이터 저장 API: `POST /api/documents`로 DB에 레코드 생성(status=UPLOADED)
- 목록/상세/삭제 API 구현
- 요약 API 구현 및 UI 연동
