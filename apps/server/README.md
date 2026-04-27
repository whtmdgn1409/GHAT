# apps/server

인증, 방, 게임 오케스트레이션, 분석 이벤트 수집, 실시간 이벤트 브로드캐스트를 담당하는 API 서버입니다.

## 구현 상태 (v1)
- `src/auth.js`: 비밀번호 해시/검증(scrypt), JWT 발급/검증, Bearer 파싱
- `src/app.js`: REST 라우터 + 인증 보호 + 게임/분석 API
- `src/store.js`: 인메모리 저장소(유저/세션/방/게임/이벤트)
- `src/realtime.js`: WebSocket 핸드셰이크/구독/방 브로드캐스트
- `src/server.js`: HTTP + WS 서버 진입점
- `test/api.test.js`: 인증/게임/분석 테스트

## 인증 API
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

## 보호 API
- `POST /api/v1/rooms`
- `GET /api/v1/rooms/:roomId`
- `POST /api/v1/rooms/:roomId/join`
- `POST /api/v1/rooms/:roomId/leave`
- `GET /api/v1/rooms/:roomId/state`
- `POST /api/v1/rooms/:roomId/games`
- `POST /api/v1/games/:gameId/start`
- `GET /api/v1/games/:gameId`
- `POST /api/v1/games/:gameId/guess`
- `POST /api/v1/games/:gameId/hint`
- `POST /api/v1/games/:gameId/finish`
- `POST /api/v1/analytics/events`
- `GET /api/v1/analytics/summary/rooms/:roomId`

## 실시간 이벤트
- WebSocket endpoint: `GET /ws` (upgrade)
- 구독 메시지: `{ "type": "subscribe", "roomId": "...", "userId": "..." }`
- 서버 이벤트: `room.joined`, `game.started`, `round.updated`, `hint.revealed`, `game.finished`

## 실행
```bash
cd apps/server
npm start
```

## 테스트
```bash
cd apps/server
npm test
```
