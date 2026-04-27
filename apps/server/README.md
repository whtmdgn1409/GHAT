# apps/server

인증, 방, 게임 오케스트레이션, 분석 이벤트 수집/큐 처리, 실시간 이벤트 브로드캐스트를 담당하는 API 서버입니다.

## 구현 상태 (v2)
- `src/auth.js`: 비밀번호 해시/검증(scrypt), JWT 발급/검증, Bearer 파싱
- `src/game-engine/rules.js`: 정답 판정, 점수, 힌트, 라운드 타이머/스킵 규칙
- `src/db/database.js`: JSON 파일 기반 영속 저장소 (개발용 DB)
- `src/repositories/index.js`: 사용자/세션/방/게임/분석 리포지토리 계층
- `src/analytics-pipeline.js`: 분석 이벤트 큐 + 비동기 처리 + 재시도 + 매핑 검증
- `src/realtime.js`: WebSocket 핸드셰이크/구독/방 브로드캐스트
- `src/app.js`: REST 라우터 + 인증 보호 + 도메인 조립
- `src/server.js`: HTTP + WS 서버 진입점

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
- `GET /api/v1/rooms/:roomId/participants`
- `POST /api/v1/rooms/:roomId/games`
- `POST /api/v1/games/:gameId/start`
- `GET /api/v1/games/:gameId`
- `POST /api/v1/games/:gameId/guess`
- `POST /api/v1/games/:gameId/hint`
- `POST /api/v1/games/:gameId/skip`
- `POST /api/v1/games/:gameId/finish`
- `POST /api/v1/analytics/events`
- `GET /api/v1/analytics/summary/rooms/:roomId`
- `GET /api/v1/analytics/mapping/verify`

## DB 마이그레이션/시드
```bash
cd apps/server
npm run migrate
npm run seed
```

## 테스트
```bash
cd apps/server
npm test
```

## WebRTC signaling
- WebSocket endpoint: `/ws/signaling` (또는 `/ws`)
- 클라이언트 메시지:
  - `subscribe`
  - `signal.offer` / `signal.answer` / `signal.ice`
  - `participant.state`
  - `quality.report`
