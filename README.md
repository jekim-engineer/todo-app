# TODO 앱

React + Vite + Tailwind로 만든 할 일 관리 앱입니다. 데이터는 브라우저 `localStorage`에
저장되므로 새로고침해도 목록이 유지됩니다.

## 기능

- 할 일 추가 / 삭제
- 체크박스로 완료 처리
- 할 일 더블클릭 시 인라인 수정 (Enter 저장, Esc 취소)
- 전체 / 진행중 / 완료 필터
- 완료 항목 일괄 삭제
- 남은 할 일 개수 표시
- `localStorage` 자동 저장

## 실행 방법

```bash
cd "Todo App"

# 의존성 설치 (React, lucide-react, Tailwind, Vite)
npm install

# 개발 서버 실행
npm run dev
```

터미널에 뜨는 주소(기본 http://localhost:5174)를 브라우저로 열면 됩니다.

## 배포하고 싶다면

```bash
npm run build
```

`dist/` 폴더가 생성되며 Vercel/Netlify/GitHub Pages 등 정적 호스팅에 그대로 올리면 됩니다.

## 구조

```
Todo App/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── index.css
    └── App.jsx   ← TODO 앱 본체 (추가/수정/삭제/필터/저장)
```
