# React + Vite

## 일일 방문자 확인 (Google Analytics 4)

이 프로젝트는 `VITE_GA_MEASUREMENT_ID`가 설정된 배포 환경에서 GA4 방문자 집계를 시작합니다.

1. [Google Analytics](https://analytics.google.com/)에서 계정과 GA4 속성을 만듭니다.
2. `관리 → 데이터 스트림 → 웹`에서 사이트 주소를 등록합니다.
3. 발급된 `G-`로 시작하는 측정 ID를 복사합니다.
4. 로컬에서는 `.env.example`을 참고해 `.env` 파일을 만들고 아래 값을 입력합니다.

   ```env
   VITE_GA_MEASUREMENT_ID=G-실제측정ID
   ```

5. 배포 서비스에도 같은 이름의 환경변수를 추가한 뒤 다시 빌드·배포합니다.

방문 직후 데이터는 `보고서 → 실시간`에서 확인합니다. 일별 방문자는 `보고서`에서 날짜를 하루로 지정한 뒤 `총 사용자` 또는 `활성 사용자`를 확인합니다. 일반 보고서 반영에는 시간이 걸릴 수 있습니다.

자동 `page_view` 외에 다음 이벤트도 함께 수집합니다.

- `entrance_activated`: 입구 활성화
- `survey_open`: 참여하기 버튼으로 설문 열기
- `survey_complete`: Google Form 제출 완료 화면 전환 감지

Google Form의 로그인 기반 `응답 1개로 제한`은 사용하지 않습니다. 설문을 연 뒤 충분한 시간이 지나고 iframe이 완료 화면으로 다시 로드되면(실제 제출) `silock_survey_completed_v2=true`를 LocalStorage에 저장하고, 같은 브라우저로 다시 방문할 때 `이미 참여하셨습니다` 화면을 표시합니다. 최초 표시 과정의 리다이렉트/재렌더로 인한 조기 재로드는 완료로 처리하지 않습니다.

테스트 상태를 초기화하려면 브라우저 개발자 도구 Console에서 아래 코드를 실행한 뒤 새로고침합니다.

```js
localStorage.removeItem("silock_survey_completed_v2")
```

Google Sheets를 방문 로그 저장소로 직접 사용하지 않습니다. 표가 필요하면 GA4 보고서에서 CSV로 내보내거나, 추후 Google Analytics Data API로 Sheets 보고서를 자동화하는 방식이 안전합니다.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
