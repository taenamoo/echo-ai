## 작업 계획서: 인증/보안 강화 및 라우트 정리
우선순위: 5

### 1. 목표
- 인증 라우트를 `/api/auth/*`로 일원화하고, 중복/구 라우트를 제거한다.
- 토큰 만료·검증을 강화하고, 기본 비밀번호 정책을 도입한다.

-----

### 2. 사전 조건
- 현행 라우트: `/api/auth/login`, `/api/auth/signup`, (구) `/api/signup`
- 토큰 유틸: `lib/auth/token` 사용

-----

### 3. 작업 단계 (Step-by-Step)
1) 라우트 정리 — 완료
  - 파일 제거: `src/app/api/signup/route.ts` — 완료
  - import/사용처 확인 및 삭제 — 완료(불필요 참조 없음)

2) 토큰 만료 강화 — 완료
  - `generateAccessToken(userId, email, { expiresIn: '1h' })` 적용 — 완료
  - 토큰 검증 세분화: `verifyTokenDetailed`로 만료(expired)/무효(invalid) 구분 — 완료

3) 비밀번호 정책 — 완료
  - 규칙: 최소 8자, 숫자/문자 조합, 공백 금지 — 완료(`validatePasswordPolicy`)
  - 회원가입 시 검증, 실패 시 400 반환 — 완료

4) 에러 메시지 정비 — 완료
  - 표준 메시지: 누락 `인증 토큰이 없습니다.` / 만료 `만료된 토큰입니다.` / 무효 `유효하지 않은 토큰입니다.` — 완료
  - 공통 헬퍼: `requireAuth(req)` 도입으로 라우트 중복 제거 — 완료

5) (선택) 이메일 검증/재설정 설계 — 보류
  - 후속 이슈로 분리(토큰 발급/링크 검증 흐름 정의)

-----

### 4. 수용 기준
- `/api/signup` 제거, 모든 인증 트래픽이 `/api/auth/*`로 동작 — 충족
- 만료 토큰 거절 동작 검증, 비밀번호 정책 적용 — 충족
- API 401 메시지 표준화(누락/만료/무효) — 충족
- FE에서 401(만료/무효) 수신 시 토큰 삭제 및 재로그인 유도 — 충족(`src/lib/axios` 인터셉터)

-----

### 5. 구현 결과(요약)
- 서버
  - 토큰 발급 만료: 1시간(`generateAccessToken` 기본값 변경) 적용
  - 토큰 검증: `verifyTokenDetailed`(expired/invalid 구분), `requireAuth`(표준 401 응답) 추가 및 전 라우트 적용
  - 라우트 정리: 구 `/api/signup` 제거, `/api/auth/*`로 일원화
  - 비밀번호 정책: `validatePasswordPolicy`로 회원가입 입력 검증
- 프론트엔드
  - `src/lib/axios` 공용 인스턴스에 401 인터셉터 추가 → 만료/무효 시 토큰 삭제+리다이렉트
