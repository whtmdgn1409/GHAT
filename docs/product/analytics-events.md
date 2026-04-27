# GA4 이벤트 설계 (사용자 이용 패턴 분석)

이 문서는 화상채팅 + 협동 단어게임 서비스의 사용자 행동을 GA4로 추적하기 위한 이벤트 스키마를 정의합니다.

## 목표
- 게임 버튼 클릭률, 게임 참여율, 라운드 완주율 측정
- 언어/난이도별 학습 참여 지표 수집
- 방(세션) 체류/이탈 패턴 파악

## 공통 파라미터
- `room_id`: 방 식별자 (해시/익명화)
- `user_id_hash`: 사용자 식별자(해시)
- `source_lang`: 모국어(선택)
- `target_lang`: 학습 언어
- `difficulty`: `easy | medium | hard`
- `team_size`: 팀 인원
- `session_id`: 웹 세션 ID

## 이벤트 목록

### 1) 화상채팅/패널 진입 이벤트
- `video_room_joined`
  - 파라미터: `room_id`, `team_size`, `session_id`
- `game_panel_opened`
  - 파라미터: `room_id`, `entry_point`, `session_id`

### 2) 게임 라이프사이클 이벤트
- `game_created`
  - 파라미터: `room_id`, `target_lang`, `difficulty`, `team_size`
- `game_started`
  - 파라미터: `game_id`, `room_id`, `target_lang`, `difficulty`
- `round_started`
  - 파라미터: `game_id`, `round_no`, `word_pack_id`, `difficulty`
- `guess_submitted`
  - 파라미터: `game_id`, `round_no`, `guess_len`, `response_ms`
- `round_completed`
  - 파라미터: `game_id`, `round_no`, `is_correct`, `hint_used_count`, `elapsed_ms`
- `game_completed`
  - 파라미터: `game_id`, `score`, `correct_count`, `total_rounds`, `duration_ms`

### 3) 학습 성과 이벤트
- `vocab_mastered`
  - 파라미터: `target_lang`, `word_id`, `attempt_count`, `hint_used_count`
- `vocab_missed`
  - 파라미터: `target_lang`, `word_id`, `attempt_count`, `final_hint_type`

## 개인정보/보안 가이드
- 이메일, 실명, 원문 채팅 메시지 등 PII는 GA로 전송하지 않습니다.
- `user_id`/`room_id`는 단방향 해시(또는 내부 surrogate id)로 전송합니다.
- 데이터 보존 기간 및 삭제 요청 처리 정책은 `infra`/`backend` 정책과 일치해야 합니다.
