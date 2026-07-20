import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initAnalytics } from './analytics.js'

// index.html에서 history.scrollRestoration을 "manual"로 바꿔도, 일부 모바일
// 브라우저는 그 시점 이전에 이미 스크롤을 복원해 둔 뒤일 수 있다 — 렌더 전에
// 한 번 더 맨 위로 강제 이동해 새로고침 시 항상 첫 페이지에서 시작하게 한다.
if (typeof window !== 'undefined') {
  window.scrollTo(0, 0)
}

initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
