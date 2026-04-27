# apps/web

화상채팅 UI와 게임 패널을 제공하는 프론트엔드 앱입니다.

## 우선 구현 기능
- 메인 화상채팅 화면
- 게임 버튼 클릭 시 우측 협동게임 패널(div) 표시
- 게임 상태 UI(라운드/점수/타이머/힌트)
- GA4 이벤트 전송 모듈

## GA4 구현 가이드
1. 앱 초기화 시 GA4 SDK 로드
2. 공통 컨텍스트(`room_id`, `target_lang`, `difficulty`)를 이벤트 payload에 병합
3. 주요 이벤트(`game_panel_opened`, `guess_submitted`, `game_completed`)를 전송
4. 전송 실패 시 로컬 큐에 임시 저장 후 재시도
5. 개인정보 필드가 이벤트에 포함되지 않도록 사전 필터링
