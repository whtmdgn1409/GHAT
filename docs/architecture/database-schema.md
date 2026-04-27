# GHAT 데이터베이스 스키마 설계

## 핵심 테이블
- `users`
  - 사용자 계정
  - `user_id`, `email(unique)`, `password_hash`, `password_salt`
- `sessions`
  - 리프레시 토큰 세션
  - `session_id`, `user_id`, `refresh_token(unique)`
- `rooms`
  - 화상채팅 방
  - `room_id`, `host_user_id`, `participants_json`, `max_participants`
- `games`
  - 게임 세션 및 라운드 상태
  - `game_id`, `room_id`, `status`, `score`, `rounds_json`, `policy_json`
- `word_packs`
  - 언어 학습 단어 콘텐츠
  - `word_pack_id`, `target_lang`, `difficulty`, `topic`, `words_json`
- `analytics_queue`
  - 분석 이벤트 비동기 처리 큐
  - `queue_id`, `payload_json`, `status`, `attempts`, `next_attempt_at`
- `analytics_events`
  - 처리 완료 이벤트 저장
  - `analytics_event_id`, `event_name`, `params_json`, `processed_at`

## 마이그레이션/시드 파일
- `apps/server/db/migrations/001_init.sql`
- `apps/server/db/seeds/001_word_packs.sql`

## 리포지토리 계층
- `users`/`sessions`/`rooms`/`games`/`analytics` repository 분리
- 서비스/핸들러 계층은 repository 인터페이스를 통해서만 상태를 변경
