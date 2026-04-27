# apps/web

React + Vite 기반 프론트엔드 앱입니다.

## 페이지 구성
- `/login`: 로그인 페이지 (실제 API 연동)
- `/signup`: 회원가입 페이지 (실제 API 연동)
- `/video`: 보호 라우트 + 화상채팅/협동게임 화면

## 핵심 구현
- JWT 세션 저장 및 자동 리프레시
- 보호 라우트(`ProtectedRoute`) 적용
- 방 생성/참여/퇴장, 게임 생성/시작/추측/힌트/종료 API 연동
- WebSocket(`/ws`) 연결을 통한 `round.updated`, `hint.revealed` 실시간 반영
- 재접속 시 `/api/v1/rooms/:roomId/state`로 상태 복구

## 환경 변수
- `VITE_API_BASE_URL` (기본값: `http://localhost:4000`)

## 실행
```bash
cd apps/web
npm install
npm run dev
```
