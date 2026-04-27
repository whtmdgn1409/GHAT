# apps/web

React + Vite 기반 프론트엔드 앱입니다.

## 페이지 구성
- `/login`: 로그인 페이지
- `/signup`: 회원가입 페이지
- `/video`: 화상채팅 + 게임 패널 페이지

## 주요 기능
- 로그인/회원가입 후 사용자 정보를 localStorage에 저장
- 인증 상태가 없으면 `/video` 접근 시 `/login`으로 이동
- 화상채팅 화면에서 "게임 열기" 버튼으로 우측 협동게임 패널 토글

## 실행
```bash
cd apps/web
npm install
npm run dev
```

## 빌드
```bash
cd apps/web
npm run build
```
