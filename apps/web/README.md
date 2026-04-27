# apps/web

React + Vite 기반 프론트엔드 앱입니다.

## 페이지 구성
- `/login`: 로그인 페이지 (실제 API 연동)
- `/signup`: 회원가입 페이지 (실제 API 연동)
- `/video`: 보호 라우트 + WebRTC 화상채팅/협동게임 화면

## 핵심 구현
- JWT 세션 저장 및 자동 리프레시
- 보호 라우트(`ProtectedRoute`) 적용
- 방 생성/참여/퇴장, 게임 생성/시작/추측/힌트/종료 API 연동
- WebSocket(`/ws`, `/ws/signaling`) 기반 signaling + participant 상태 동기화
- 카메라/마이크 on/off 반영
- 네트워크 품질(RTT, packet loss) 표시

## 테스트
- 컴포넌트 테스트: `npm run test`
- E2E 테스트: `npm run test:e2e`

## 환경 변수
- `VITE_API_BASE_URL` (기본값: `http://localhost:4000`)

## 실행
```bash
cd apps/web
npm install
npm run dev
```
