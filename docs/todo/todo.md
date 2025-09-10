🟠 현재 구현된 문서 목록 조회 API의 검색 및 정렬 로직은 DynamoDB에서 여러 번 쿼리하여 데이터를 수집한 후, 애플리케이션 메모리 내에서 필터링 및 정렬을 수행합니다. 이는 데이터셋의 크기가 커질수록 성능 저하 및 비용 증가를 유발할 수 있습니다. 장기적으로는 DynamoDB GSI(Global Secondary Index)를 활용하거나 OpenSearch와 같은 전용 검색 엔진을 도입하여 데이터베이스 레벨에서 효율적인 검색 및 정렬을 처리하는 방안을 고려해야 합니다.

🟠 PDF 파싱 중 "Warning: Ran out of space in font private use area" 경고가 반복되어 서버 성능 저하가 발생합니다. 이는 pdf.js가 폰트의 글리프를 PUA 영역(0xE000-0xF8FF)에 매핑하는 과정에서 공간이 부족해지는 경우에 발생하며, 경고 로그가 다량 출력될수록 서버 자원을 소모합니다. 경고를 억제하기 위해 pdf.js의 `verbosity`를 `ERRORS`로 낮추거나 PUA 영역을 확장한 커스텀 빌드를 적용하는 방안을 검토해야 합니다. 장기적으로는 PDF 생성 단계에서 ToUnicode 매핑을 포함하거나 글리프 수가 적은 폰트를 사용하도록 개선하는 것이 필요합니다.

🔧 해결 계획
- [x] "Ran out of space in font private use area" 경고만 필터링하여 기타 경고는 유지
- [x] PUA 영역을 확장한 커스텀 빌드 적용 여부 검토 (`PDFJS_PUA_VERSION` 환경변수로 커스텀 pdf.js 로드 가능 여부 확인)
- [x] PUA 확장 커스텀 빌드 제작 및 성능 검증 (pdf.js `PRIVATE_USE_OFFSET_END`를 0x10FFFF까지 확장 후 벤치마크 수행)
- [ ] PDF 생성 단계에서 ToUnicode 매핑 포함 및 글리프 수 최소화
  - [x] PDF 생성 시 폰트별 ToUnicode CMap을 생성하여 포함
    - 각 TTF/OTF 폰트의 cmap 테이블에서 글리프 ↔️ 유니코드 매핑을 추출 (fontkit 또는 fonttools `ttx` 활용)
    - 사용된 글리프만 대상의 ToUnicode CMap 스트림을 생성하고 PDF의 `/ToUnicode` 엔트리로 삽입
    - PDF 빌드 스크립트에 글리프 추출 → CMap 생성 → PDF 내장 과정을 자동화하여 PUA 의존도 감소
  - [x] 폰트 서브셋팅으로 사용된 글리프만 내장하여 파일 크기와 PUA 사용량 최소화
  - [x] 샘플 PDF 생성과 파싱 벤치마크로 경고 및 성능 개선 여부 검증
- [ ] 개선 적용 후 경고 로그와 서버 자원 사용량 모니터링
