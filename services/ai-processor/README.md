# services/ai-processor

SQS 기반 Lambda 워커를 위한 초기 골격입니다. 현재 요약 로직은 Next.js API 라우트 안에서 실행되고 있으므로, 큐 기반 비동기 파이프라인을 구성하기 위한 준비 단계로 디렉터리와 의존성을 정리했습니다.

## TODO
- [ ] SQS 이벤트를 파싱하는 어댑터 작성
- [ ] `@echo-ai/documents` 유스케이스와 DynamoDB 업데이트 로직 연결
- [ ] 실패 재시도 및 DLQ 처리 전략 수립
