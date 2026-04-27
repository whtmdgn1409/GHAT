# apps/server

인증, 방, 게임 오케스트레이션, 분석 이벤트 수집을 담당하는 API 서버입니다.

## 구현 상태 (v0)
- `src/app.js`: Node HTTP 기반 라우터/핸들러
- `src/store.js`: 인메모리 저장소 + 방/게임 생성 로직
- `src/analytics.js`: 분석 이벤트 검증(화이트리스트 + PII 차단)
- `src/server.js`: 실행 진입점
- `test/api.test.js`: 주요 API 플로우 테스트

## 제공 엔드포인트
- `POST /api/v1/auth/guest`
- `POST /api/v1/rooms`
- `GET /api/v1/rooms/:roomId`
- `POST /api/v1/rooms/:roomId/join`
- `POST /api/v1/rooms/:roomId/leave`
- `POST /api/v1/rooms/:roomId/games`
- `POST /api/v1/games/:gameId/start`
- `GET /api/v1/games/:gameId`
- `POST /api/v1/games/:gameId/guess`
- `POST /api/v1/games/:gameId/hint`
- `POST /api/v1/games/:gameId/finish`
- `GET /api/v1/word-packs`
- `GET /api/v1/word-packs/:wordPackId`
- `POST /api/v1/analytics/events`
- `GET /api/v1/analytics/summary/rooms/:roomId`

## 실행 방법
```bash
cd apps/server
npm start
```

## 테스트
```bash
cd apps/server
npm test
```
