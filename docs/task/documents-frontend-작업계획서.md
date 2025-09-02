## 작업 계획서: 문서 목록/상세/업로드/요약 UI 구현
우선순위: 4

### 1. 목표
- 문서 목록/상세 페이지를 제공하고, Pre-signed 업로드 및 요약 실행을 UI에서 지원한다.

-----

### 2. 사전 조건
- API 준비: presign, 메타 저장, 목록/상세/삭제, summarize
- 인증 토큰: 로그인 후 클라이언트 저장(쿠키/스토리지) 및 API 호출 시 헤더 포함

-----

### 3. 화면/컴포넌트 구조
- 경로: `/documents`, `/documents/[id]`
- 공용 컴포넌트
  - `UploadButton`: presign → PUT → 메타 저장 호출 → 목록 갱신
  - `SummaryStatus`: 상태 배지 / 진행 표시
  - `DeleteButton`: 삭제 호출 → 목록/라우팅 갱신

-----

### 4. 작업 단계 (Step-by-Step)
1) 목록 페이지 `/documents`
  - 데이터 패칭: `GET /api/documents` (cursor 기반)
  - 테이블/카드 렌더링: 파일명, 크기, 상태, 생성일, 액션(상세/삭제)
  - 업로드 버튼: 성공 시 목록 갱신

2) 상세 페이지 `/documents/[id]`
  - 데이터 패칭: `GET /api/documents/[id]`
  - 요약 표시: `summaryText` 노출, 없으면 `Summarize` 버튼
  - 요약 실행: `POST /api/documents/[id]/summarize` → 완료 후 갱신

3) 상태/에러 처리
  - 로딩 스켈레톤, 에러 메시지, 재시도
  - 토큰 만료 시 로그인 페이지로 리다이렉트

4) 스타일/접근성
  - 기본 Tailwind/디자인 시스템 가이드 준수

-----

### 5. 수용 기준
- 업로드→목록반영→상세확인→요약→결과표시 플로우가 브라우저에서 동작
- 삭제 시 목록/라우팅이 적절히 갱신
