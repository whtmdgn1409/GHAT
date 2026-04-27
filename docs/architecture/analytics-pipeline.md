# Analytics 파이프라인 고도화

## 파이프라인 단계
1. API 수신 (`POST /api/v1/analytics/events`)
2. 스키마 검증 (`analytics.js`)
3. 큐 적재 (`repositories.analytics.enqueue`)
4. 비동기 처리 (`analytics-pipeline.processQueue`)
5. 실패 재시도 (`attempts < 3`, `next_attempt_at` 기반)
6. 처리 완료 이벤트 저장 (`analytics_events`)

## 대시보드 API
- `GET /api/v1/analytics/summary/rooms/:roomId`
  - 방별 이벤트 카운트 집계

## GA4 ↔ 서버 이벤트 매핑 정합성
- `GET /api/v1/analytics/mapping/verify`
  - 매핑 테이블 없는 이벤트명을 추출하여 반환
  - 누락 이벤트명 기반으로 클라이언트/서버 명세 동기화 가능
