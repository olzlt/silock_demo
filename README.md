# Silock 랜딩페이지

Silock은 디지털 출판 콘텐츠의 지속 소장 경험을 설계하는 오픈 마켓플레이스입니다. 이 랜딩은 브랜드 철학, FAQ, 사용자 설문을 소개합니다. 현재 화면의 이미지·카피·스크롤 연출을 유지하면서 Next.js App Router로 구성했습니다.

## 기술 스택

- Next.js App Router, React 19
- Tailwind CSS 4, shadcn/ui 방식의 재사용 Button·Card 컴포넌트
- GA4 선택적 측정, Google Forms 설문

## 실행

Node.js 20.9 이상과 pnpm이 필요합니다.

```bash
pnpm install
pnpm dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 검증 명령은 `pnpm lint`, `pnpm build`, `pnpm start`입니다.

`.env.example`을 복사해 `.env`를 만들 수 있습니다. `NEXT_PUBLIC_GA_MEASUREMENT_ID`는 선택 항목이며 비워 두면 추적 스크립트를 로드하지 않습니다. `NEXT_PUBLIC_SITE_URL`은 배포 도메인으로 설정하면 공유 메타데이터와 사이트맵에 반영됩니다.

## 인터랙션

- 입구의 심볼을 찾아 활성화하면 스크롤 여정이 시작됩니다.
- 스크롤에 따라 리더기 부팅, 빈 서재와 채워진 서재 비교, 브랜드 스토리가 이어집니다.
- `더 알아보기`는 브랜드 스토리로 부드럽게 이동합니다.
- `참여하기`는 설문 모달을 열고, 완료 확인은 사용자가 직접 누른 뒤 로컬 저장소에 기록됩니다.
- FAQ는 키보드로도 펼칠 수 있습니다. 모션 최소화 설정을 존중합니다.

## 프로젝트 구조

- `src/app`: App Router, 메타데이터, 전역 스타일, robots 및 sitemap
- `src/components/SilockExperience.jsx`: 랜딩 연출과 설문 흐름
- `src/components/ui`: 재사용 UI 컴포넌트
- `src/lib`: 색상 토큰과 className 유틸
- `public/images`: 랜딩 이미지
- `AGENTS.md`, `CLAUDE.md`: 에이전트 작업 규칙

## 배포 URL

[https://silock-demo.vercel.app/](https://silock-demo.vercel.app/)

이 주소는 기존 프로젝트의 공유 메타데이터에 설정된 주소입니다. 새 버전을 공개하려면 배포 환경에서 `NEXT_PUBLIC_SITE_URL`을 실제 도메인으로 설정하고 다시 빌드합니다.

## 검증 결과

- `pnpm lint`, `pnpm build` 통과. 320px, 390px, 1280px에서 가로 넘침과 깨진 이미지가 없고 입구 버튼·FAQ가 동작합니다.
- Lighthouse 모바일 로컬 측정: 성능 25, 접근성 96, SEO 100. 원본 측정에서 발견한 ARIA 오류와 비브랜드 회색 글자 대비를 고쳤습니다. 브랜드 색상 `#FF6A00`과 `#FFFFFF`의 대비 지적은 화면 유지 요청에 따라 남아 있습니다.
- 성능 점수는 로컬 측정 환경의 매우 긴 메인 스레드 작업과 외부 Google Fonts 요청 차단의 영향을 받았습니다. 실제 배포 후 동일한 조건에서 다시 측정하는 것이 좋습니다. 측정 원본은 `reports/lighthouse-mobile.json`, `reports/lighthouse-final.json`에 있습니다.
- 기존 배포 주소와 설문 링크의 HTTP 200 응답을 확인했습니다. 이 저장소의 최신 변경 사항은 아직 배포하지 않았습니다.
