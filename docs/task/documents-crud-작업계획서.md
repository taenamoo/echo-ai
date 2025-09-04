## 작업 계획서: 문서 목록/상세/삭제 API 구현 (+요약 필드 반환)
우선순위: 2

### 1. 목표
- 로그인 사용자의 문서 목록/상세를 조회하고, 문서를 삭제할 수 있는 API를 제공한다.
- 상세 응답에 요약 상태/내용(summaryText)을 포함해 프론트가 즉시 렌더링할 수 있도록 한다.

-----

### 2. 사전 조건
- 공통 사전조건: `docs/task/document-management-작업계획서.md` 참조
- DynamoDB 테이블: `EchoAI-Main-Table` (PK=`USER#<userId>`, SK=`DOC#<documentId>`)
- 인증: `Authorization: Bearer <accessToken>` 사용, `verifyToken`으로 userId 획득
- 공통 미들웨어: `/api/documents/*` 경로는 `middleware.ts`에서 Authorization 헤더 존재 여부를 선검사함

-----

### 3. API 명세

- 목록 조회: `GET /api/documents?limit=20&cursor=<lastSk>&q=<filename>&sortKey=<createdAt|filename|filesize>&sortDir=<asc|desc>`
  - 동작: PK=`USER#<userId>`로 Query, `SK` prefix=`DOC#`인 아이템만 반환
- 검색(q): `filename`에 대한 부분 일치(대소문자 비구분)
- 정렬(sortKey/sortDir): 응답 내에서 정렬 적용(기본: createdAt desc). `updatedAt` 지원.
  - 페이지네이션: `LastEvaluatedKey` 기반 cursor 방식(필터 적용 시 여러 페이지를 조회하여 최대 `limit`개 수집)
  - 응답: `{ items: [...], nextCursor?: string }`

- 상세 조회: `GET /api/documents/[documentId]`
  - 동작: GetItem(PK, SK), 없으면 404
  - 응답: 문서 메타 + `status`, `summaryText` 포함

- 삭제: `DELETE /api/documents/[documentId]`
  - 동작: S3 객체 삭제 → DynamoDB 아이템 삭제(순서 보장), 본인 소유만 허용
  - S3 삭제: 키 프리픽스(`uploads/<userId>/<documentId>/`) 하위 전체 삭제(ListObjectsV2 → DeleteObjects 배치)
  - 응답: `{ ok: true }`

-----

### 4. 작업 단계 (Step-by-Step)

1) 목록 라우트 구현
- 파일: `src/app/api/documents/route.ts` (GET 핸들러 추가) 또는 `src/app/api/documents/list/route.ts`로 분리
- 입력 파라미터: `limit`(기본 20, 최대 100), `cursor`
- DynamoDB Query: `KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)'`
- 응답 정규화: 필요한 필드만 반환(보안 고려)

2) 상세 라우트 구현
- 파일: `src/app/api/documents/[documentId]/route.ts` (GET)
- GetItem 후 404 처리, 권한 확인(userId 일치)

3) 삭제 라우트 구현
- 파일: `src/app/api/documents/[documentId]/route.ts` (DELETE)
- 권한 확인 → S3 프리픽스 전체 삭제 → DynamoDB DeleteItem
- 예외 처리: S3 일부 삭제 실패 시 207 유사 결과 고려 or 재시도/경고 로그

4) 공통 유틸 추가
- DynamoDB 키 빌더: `buildKeys(userId, documentId)`
- S3 삭제 유틸: `deletePrefix(bucket, prefix)`

5) 검증/에러 처리
- 400: 파라미터 유효성 실패, 401: 토큰 없음/무효, 403: 소유자 불일치, 404: 없음
- 로깅: 삭제 실패/부분 실패 케이스 기록

-----

### 5. 수용 기준
- 목록: 페이징이 동작하고, 각 아이템에 `status`가 포함됨
- 상세: 해당 문서의 메타+요약 정보가 정확히 반환됨
- 삭제: S3 객체 및 DynamoDB 아이템이 모두 제거됨(재요청 시 404)

-----

### 6. 수동 테스트 시나리오
1) 로그인 후 목록 조회 → 응답 형식/페이징 확인
2) 임의 문서 상세 조회 → 존재/권한/404 케이스 확인
3) 삭제 실행 → S3/DB 확인, 목록에서 제외 확인

-----

### 7. 테스트용 cURL 예시

- 준비: 액세스 토큰 환경변수 설정(로그인/회원가입 응답의 `accessToken` 사용)

```bash
export TOKEN="<YOUR_ACCESS_TOKEN>"
```

- 목록 조회 (기본 20개)

```bash
curl -s -X GET "http://localhost:3001/api/documents?limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

- 페이지네이션 (nextCursor 사용)

```bash
# jq 없이 Node로 nextCursor만 파싱
NEXT=$(curl -s -X GET "http://localhost:3001/api/documents?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.nextCursor||'');}catch{}})")

if [ -n "$NEXT" ]; then
  curl -s -X GET "http://localhost:3001/api/documents?limit=5&cursor=$NEXT" \
    -H "Authorization: Bearer $TOKEN"
fi
```

- 상세 조회

```bash
DOC_ID="<DOCUMENT_ID>"
curl -s -X GET "http://localhost:3001/api/documents/$DOC_ID" \
  -H "Authorization: Bearer $TOKEN"
```

- 삭제

```bash
DOC_ID="<DOCUMENT_ID>"
curl -s -X DELETE "http://localhost:3001/api/documents/$DOC_ID" \
  -H "Authorization: Bearer $TOKEN"
```

- (선택) LocalStack S3에서 실제 삭제 확인

```bash
DOC_ID="<DOCUMENT_ID>"
docker exec -it echo-ai-localstack awslocal s3 ls \
  "s3://$S3_BUCKET_NAME/uploads/<USER_ID>/$DOC_ID/"
```

주의
- `Authorization` 헤더 대소문자는 무관하지만 동일 요청에 포함되어야 합니다.
- 401: 토큰 없음/무효, 404: 문서 없음, 403: 소유자 불일치 시 고려(향후 강화).
