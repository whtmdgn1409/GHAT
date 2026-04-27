# 품질/운영 체계

## 서버 테스트 확대
- 인증 실패/권한 없음/중복 회원가입/정원 초과 등 에러 케이스 테스트
- OpenAPI 필수 경로가 코드와 동기화되는 계약 테스트
- 큐/매핑 검증 API 포함 통합 테스트

## 프론트 테스트
- Vitest + Testing Library로 컴포넌트 테스트
- Playwright E2E로 로그인 → 비디오 페이지 진입 흐름 검증

## CI 파이프라인
- GitHub Actions `ci.yml`
  - server job: migrate/seed/test
  - web job: unit test/build

## 운영 모니터링
- WebRTC 품질 지표(RTT, packet loss)를 participant 상태로 실시간 반영
- analytics queue 상태(done/retry/failed) 추적 가능하도록 저장
