# 백엔드 구현 로드맵

## Phase 1: Core API
- Auth/Room/Game 기본 REST API 구현
- WebSocket 이벤트 브로커 연결
- OpenAPI 기반 계약 테스트 도입

## Phase 2: Analytics
- `/api/v1/analytics/events` 적재 API 구현
- GA4 이벤트 명세와 서버 검증기 연결
- 이벤트 큐(비동기 처리) + 적재 실패 재시도 정책

## Phase 3: Learning Insights
- 사용자/방 단위 학습 지표 집계
- 난이도/언어별 완주율 대시보드 API
- 콘텐츠 개선 피드백 루프(오답 빈도 기반)
