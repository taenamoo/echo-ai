# Scripts

로컬 개발과 운영 보조를 위한 스크립트를 목적별로 분리했습니다.

- `local/`: 개발 편의 도구 (예: PDF 샘플 생성, 로컬 자원 초기화)
- `migration/`: DynamoDB 등 스키마 마이그레이션 스크립트
- `tests/`: 수동 실행 테스트 스크립트

각 스크립트는 `pnpm dlx tsx`를 통해 실행하도록 루트 `package.json` 스크립트가 정리되어 있습니다.
