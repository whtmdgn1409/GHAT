# docs/

제품 기획, 기술 아키텍처, 개발 운영 지침 문서를 관리합니다.

## 하위 구조
- `product/`: 사용자 시나리오, 게임 UX 플로우, 이벤트 측정 기획
- `architecture/`: 서비스 경계, 이벤트 흐름, 데이터 모델, API 계약
- `development/`: 로컬 개발 규칙, 코드 컨벤션, 체크리스트

## 문서 운영 원칙
1. **결정 이유 기록**: 무엇을 했는지보다 왜 그렇게 했는지 기록
2. **AI 참조 최적화**: 디렉터리별 문서 목적과 입력/출력 명확화
3. **변경 이력 동기화**: 코드 구조가 바뀌면 문서도 같은 PR에서 업데이트

## 현재 핵심 문서
- `product/analytics-events.md`: GA4 이벤트 정의 및 개인정보 가이드
- `architecture/backend-api.md`: 백엔드 리소스/엔드포인트 설계
- `architecture/openapi.yaml`: OpenAPI 3.1 API 계약 초안
- `architecture/database-schema.md`: 사용자/방/게임/분석 DB 스키마 설계
- `architecture/analytics-pipeline.md`: 큐/재시도/대시보드/매핑 검증 흐름
- `development/backend-roadmap.md`: 백엔드 구현 단계 로드맵
