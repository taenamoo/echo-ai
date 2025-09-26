# services/api

이 디렉터리는 API Gateway + Lambda 조합으로 제공될 Echo AI의 동기식 API 핸들러를 수용하기 위한 자리입니다.

현재는 Next.js `app/api` 라우트가 실제 트래픽을 담당하고 있으므로, 패키지 구조 개편 후 단계적으로 이곳으로 이전할 예정입니다.

## TODO
- [ ] Next.js 라우트를 함수형 핸들러로 추출하여 `packages/*` 모듈을 재사용
- [ ] APIGW 이벤트 어댑터 및 미들웨어 계층 구현
- [ ] 배포 아티팩트 번들링(예: esbuild/tsup) 및 IaC 연계
