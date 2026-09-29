# Silock 랜딩페이지 작업 규칙

## 서비스 목적
Silock은 구매한 디지털 출판 콘텐츠를 서비스나 판매 계약 종료 후에도 오래 소장할 수 있는 경험을 설계 중인 오픈 마켓플레이스입니다. 이 랜딩은 브랜드 이야기, 지속 소장 가치, FAQ, 사용자 설문을 소개합니다. 실제 영구 보존 기능이 이미 출시된 것처럼 단정하지 않습니다.

## 기술 스택과 구조
- Next.js App Router + React 19. `src/app`은 라우팅·메타데이터, `src/components/SilockExperience.jsx`는 기존 스크롤 경험과 설문 인터랙션입니다.
- Tailwind CSS 4와 shadcn/ui 방식의 소스 컴포넌트는 `src/components/ui`, 공통 유틸은 `src/lib`에 둡니다.
- 정적 이미지는 `public/images`, OG 이미지와 파비콘은 `public`에 둡니다.
- GA4는 `NEXT_PUBLIC_GA_MEASUREMENT_ID`가 유효할 때만 로드합니다. 설문 완료는 사용자의 명시적 확인 후 로컬 저장소에 기록합니다.

## 디자인 원칙
- 브랜드 색상: Orange `#FF6A00`, Black `#111111`, White `#FFFFFF`, Light Gray `#F2F2F2`, Neutral Gray `#E6E2DD`.
- Noto Sans KR을 기본 글꼴, Noto Serif KR을 보조 글꼴로 사용합니다.
- 색상은 `src/lib/design-tokens.js` 및 `src/app/globals.css`의 토큰을 기준으로 합니다. 버튼·카드는 `src/components/ui`를 재사용합니다.
- 현재 데스크톱·모바일 화면, 문구, 스크롤 연출을 최대한 유지합니다. 화면에 보이는 수정이 필요하면 코드 변경 전에 사용자에게 확인받습니다.

## 작업과 검증
- 새 인터랙션은 키보드 사용과 `prefers-reduced-motion`을 고려합니다.
- `pnpm lint`와 `pnpm build`를 실행하고, 데스크톱 및 390px·320px 모바일에서 겹침·가로 넘침을 확인합니다.
- 링크·이미지·브라우저 콘솔 오류를 확인합니다. Lighthouse의 성능·접근성·SEO 결과에서 실제 문제를 우선 수정합니다.
- 배포 주소는 `NEXT_PUBLIC_SITE_URL`로 지정하며 기본값은 `https://silock-demo.vercel.app`입니다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
