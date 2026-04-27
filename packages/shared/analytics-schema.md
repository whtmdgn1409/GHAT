# shared analytics schema

프론트엔드와 백엔드가 공통으로 따를 분석 이벤트 계약입니다.

## Event Envelope
```ts
type AnalyticsEvent = {
  eventName:
    | 'video_room_joined'
    | 'game_panel_opened'
    | 'game_started'
    | 'guess_submitted'
    | 'round_completed'
    | 'game_completed';
  eventTime: string; // ISO-8601
  sessionId: string;
  roomIdHash?: string;
  gameId?: string;
  params: Record<string, string | number | boolean | null>;
};
```

## Validation Rules
- `eventName`은 화이트리스트 기반 검증
- `eventTime`은 ISO-8601 파싱 가능해야 함
- `params`는 중첩 객체를 허용하지 않음(flattened)
- PII 키(`email`, `phone`, `name`, `message_raw`) 전송 금지
