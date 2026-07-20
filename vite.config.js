import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 브라우저에 전달되는 코드는 완전히 숨길 수 없지만, 원본 파일 구조와
    // 소스 연결 정보는 배포하지 않고 결과물은 압축한다
    sourcemap: false,
    minify: true,
  },
})
