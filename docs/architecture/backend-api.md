# 백엔드 API 설계

화상채팅 방/게임/분석 데이터를 위한 API 경계를 정의합니다.

## 설계 원칙
1. REST API는 **리소스 상태 변경** 중심
2. 실시간 게임 동기화는 WebSocket 이벤트로 처리
3. 분석 이벤트 적재는 서버 측 API + 비동기 큐로 분리
4. API 버전은 `/api/v1` 프리픽스를 사용

## 도메인별 엔드포인트

### Auth / Session
- `POST /api/v1/auth/guest`
  - 게스트 토큰 발급
- `POST /api/v1/auth/refresh`
  - 토큰 재발급

### Rooms
- `POST /api/v1/rooms`
  - 방 생성
- `GET /api/v1/rooms/{roomId}`
  - 방 상세 조회
- `POST /api/v1/rooms/{roomId}/join`
  - 방 참여
- `POST /api/v1/rooms/{roomId}/leave`
  - 방 이탈

### Games
- `POST /api/v1/rooms/{roomId}/games`
  - 게임 생성 (언어/난이도/라운드 설정)
- `POST /api/v1/games/{gameId}/start`
  - 게임 시작
- `GET /api/v1/games/{gameId}`
  - 게임 상태 조회(복구용)
- `POST /api/v1/games/{gameId}/guess`
  - 단어 추측 제출
- `POST /api/v1/games/{gameId}/hint`
  - 힌트 요청
- `POST /api/v1/games/{gameId}/finish`
  - 강제 종료/정상 종료

### Word Packs
- `GET /api/v1/word-packs`
  - 언어/난이도/주제 기반 목록 조회
- `GET /api/v1/word-packs/{wordPackId}`
  - 단어팩 상세 조회

### Analytics
- `POST /api/v1/analytics/events`
  - 클라이언트 행동 이벤트 수집(서버 검증 후 적재)
- `GET /api/v1/analytics/summary/rooms/{roomId}`
  - 운영자/내부 대시보드용 요약(권한 필요)

## 권장 응답 규격
```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-04-27T00:00:00Z"
  },
  "error": null
}
```

## 에러 코드 예시
- `ROOM_NOT_FOUND`
- `ROOM_FULL`
- `GAME_NOT_ACTIVE`
- `INVALID_GUESS`
- `WORD_PACK_NOT_AVAILABLE`
- `ANALYTICS_EVENT_INVALID`

## 실시간 이벤트와의 연결
- REST로 시작/종료/추측 요청을 접수한 뒤,
- 최종 결과를 WebSocket 이벤트(`game.updated`, `round.completed`)로 브로드캐스트합니다.
