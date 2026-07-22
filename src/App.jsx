import roofImg from "./assets/roof.webp";
import entranceLogoImg from "./assets/logo_main_org.webp";
import blackLogoImg from "./assets/logo_main_black.webp";
import libraryBGImg from "./assets/library.webp"
import { trackEvent } from "./analytics.js";

import {
  Fragment,
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
} from "react";

/**
 * Silock 랜딩페이지 STEP1~STEP7 통합 데모 (이전 데모 이어서 진행)
 * ------------------------------------------------------------
 *  이전 단계(그대로 재사용):
 *   - EntranceSection      : STEP1(입구 탐색) + STEP2(입구 활성화) + STEP3(버튼 속으로
 *                            들어가는 스크롤 전환 → 리더기 등장 placeholder)
 *
 *  이번에 새로 추가한 단계:
 *   - LibrarySection       : STEP4(리더기 부팅) → STEP5/6(빈 서재 ↔ 가득 찬 서재 비교)
 *                            → STEP7(가치 제안 + 참여하기 CTA)
 *
 *  실제 프로젝트 분리 기준:
 *   LibrarySection.tsx / ReaderDevice.tsx / ReaderBootScreen.tsx /
 *   LibraryComparison.tsx / EmptyLibrary.tsx / FilledLibrary.tsx /
 *   BookCover.tsx / ComparisonGuide.tsx / ValueProposition.tsx / SurveyCTA.tsx
 *
 *  이번에 새로 추가한 단계:
 *   - SurveyModal          : STEP9(Google Form 팝업)
 *                            오버레이+블러, 포커스 트랩, ESC 닫기, 폼 로딩 실패 폴백 포함
 *
 *  실제 프로젝트 분리 기준(추가):
 *   SurveyModal.tsx / ModalBackdrop.tsx / ModalContainer.tsx /
 *   GoogleFormEmbed.tsx / FormFallback.tsx
 *
 *  브랜드 컬러 (제공된 로고 가이드 기준):
 *   Primary Orange #FF6A00 / Black #111111 / White #FFFFFF /
 *   Light Gray #F2F2F2 / Neutral Gray #E6E2DD
 */

// ============================================================
// 공통 유틸
// ============================================================
function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
function getPointID(row, col, gridH) {
  return col * gridH + row;
}
const SCROLL_KEYS = new Set([" ", "Spacebar", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);
function interpolateKeyframes(progress, keyframes) {
  if (progress <= keyframes[0][0]) return keyframes[0][1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    const [t0, v0] = keyframes[i];
    const [t1, v1] = keyframes[i + 1];
    if (progress >= t0 && progress <= t1) {
      const local = t1 === t0 ? 0 : (progress - t0) / (t1 - t0);
      return v0 + (v1 - v0) * local;
    }
  }
  return keyframes[keyframes.length - 1][1];
}
function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}
/**
 * 저사양 기기 감지(한 번만 계산). 성능이 넉넉한 폰은 여기서 false가 나와 지금까지의
 * 연출을 100% 그대로 보고, 아주 느린 폰만 true가 되어 "라이트 모드"로 무거운
 * 이펙트(커튼 물리 반복 횟수·고해상도, 그림자 애니메이션 등)를 덜어낸다.
 *  - prefers-reduced-motion: 사용자가 OS에서 모션 최소화를 켠 경우
 *  - deviceMemory <= 3(GB): 저메모리 단말(주로 저가 안드로이드) — Chrome 계열만 노출
 *  - hardwareConcurrency <= 4(논리 코어): 구형/저가 단말(구형 아이폰 포함)
 * iOS Safari는 deviceMemory를 노출하지 않으므로 코어 수로 보조 판별한다. 값이 아예
 * 없으면(측정 불가) 성능이 충분하다고 보고 false로 둔다(좋은 폰을 잘못 깎지 않기 위함).
 */
function detectLowPower() {
  if (typeof navigator === "undefined") return false;
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return true;
  }
  const mem = navigator.deviceMemory;
  if (typeof mem === "number" && mem <= 3) return true;
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores <= 4) return true;
  return false;
}
/** 반응형 규칙표 기준 breakpoint(640px) 아래를 모바일로 취급 */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < breakpoint : false));
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

// ============================================================
// 브랜드 토큰
// ============================================================
const COLOR = {
  orange: "#FF6A00",
  black: "#111111",
  white: "#FFFFFF",
  lightGray: "#F2F2F2",
  neutralGray: "#E6E2DD",
};

// ============================================================
// 브랜드 심볼 — 입구 버튼 / 현판 / 리더기 상단 브랜드 마크에서 재사용
// ============================================================
/** 원본 PNG의 실제 심볼 영역만 보이도록 크롭해 사용하는 브랜드 글리프 */
function BrandGlyphAsset({ size = 28, tone = "black" }) {
  const source = tone === "orange" ? entranceLogoImg : blackLogoImg;

  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <img
        src={source}
        alt=""
        style={{
          position: "absolute",
          width: "420.6%",
          height: "280.4%",
          maxWidth: "none",
          left: "-159.6%",
          top: "-78.4%",
          objectFit: "fill",
          filter: tone === "white" ? "brightness(0) invert(1)" : "none",
          pointerEvents: "none",
        }}
      />
    </span>
  );
}
/** 로고의 "심볼 온리" 스퀴클 버전: 주황 테두리 사각형 + 검정 브랜드 심볼 */
function KeyholeSquareIcon({ size = 40, filled = false }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        border: `${Math.max(2, size * 0.05)}px solid ${COLOR.orange}`,
        background: filled ? COLOR.orange : COLOR.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <BrandGlyphAsset size={size * 0.5} tone={filled ? "white" : "black"} />
    </div>
  );
}


const CLOTH_LINES = [
  "기록은 오늘을 붙잡기 위해 쓰는 것이 아니라 먼 훗날 오늘을 다시 만날 사람을 위하여 남기는 것이다",
  "사람의 기억은 흐려질 수 있으나 글은 세월을 견디며 다음 시대의 눈앞에 다시 모습을 드러낸다",
  "나라의 큰일과 백성의 작은 일은 모두 같은 시대를 이루는 흔적이므로 어느 하나 가볍게 여겨서는 아니 된다",
  "사소한 하루가 모여 긴 역사가 되고 한 줄의 기록이 모여 한 시대를 증명하게 된다 사실을 기록하는 사람은 듣고 싶은 말을 적는 것이 아니라 있었던 일을 남겨야 한다",
  "진실은 때로는 늦게 빛을 보더라도 끝내 기록 속에서 제 모습을 드러내게 된다 오늘의 발걸음은 언젠가 누군가의 지나온 길이 된다",
  "그러므로 지금 살아가는 모든 시간은 훗날을 위한 기록이 되어야 하며 아무 이유 없이 사라져서는 아니 된다",
  "세월은 사람의 이름을 잊을 수 있으나 기록은 그 이름을 다시 불러낸다 글자는 짧으나 그 안에 담긴 시간은 길고 사람의 삶은 기록을 통하여 다음 세상으로 이어진다",
  "왕과 신하와 백성과 아이에 이르기까지 모두 같은 시대를 살아가는 사람이므로 각자의 삶 또한 기록될 가치가 있다",
  "역사는 높은 곳에서만 만들어지는 것이 아니라 평범한 하루 속에서도 자라난다 바람은 지나가면 흔적을 남기지 않지만 기록은 시간이 흘러도 그 자리에 남아 지나간 계절을 증명한다",
  "오래된 글을 읽는다는 것은 오래된 시간을 다시 만나는 일과 같다 기억은 사람의 마음속에 머물다가 사라질 수 있으나 기록은 종이와 글자 속에 머물며 다음 세대에게 조용히 말을 건넨다",
  "그러므로 기록은 시간과 사람을 이어 주는 다리가 된다 하루를 소중히 여기는 사람은 한 시대를 가볍게 여기지 않는다",
  "오늘을 바르게 남기는 일이 내일을 바르게 이해하는 가장 확실한 시작이 된다 역사는 완성된 뒤에 만들어지는 것이 아니라 살아가는 순간마다 조금씩 쌓여 간다",
  "오늘 남긴 한 줄은 먼 훗날 누군가에게 가장 오래된 내일이 된다 기록은 칭찬만을 남기기 위하여 존재하지 않는다",
  "잘한 일과 부족한 일을 함께 남길 때 비로소 후세는 지난 시대를 있는 그대로 이해할 수 있다 시간은 쉼 없이 앞으로 흘러가지만 기록은 그 시간을 붙잡아 오래도록 머물게 한다",
  "지나간 날을 다시 펼칠 수 있는 것은 오직 남겨진 글뿐이다 사람은 모두 지나가지만 사람이 남긴 뜻은 기록을 따라 오래 살아남는다",
];
const FULL_TEXT = CLOTH_LINES.join("　");
const CLOTH_WORDS = CLOTH_LINES.join(" ").trim().split(/\s+/);

// ============================================================
// 물리 클래스 (STEP1~2 커튼용, 그대로 재사용)
//
// Verlet 기반 천(cloth)/줄 물리 시뮬레이션 기법은 Liam Egan의 공개 구현
// (CodePen: https://codepen.io/shubniggurath/pen/ZYpjorm, MIT License)을
// 참고해 재구성했으며, homeX/homeY, restoreStrength, spreadDir 등은
// 이 프로젝트에서 추가한 독자 로직입니다.
// ============================================================
class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  reset(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    return this;
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
}
class Particle {
  constructor({ x, y, pinned, char, spreadDir = 0 }) {
    this.pos = new Vec2(x, y);
    this.oldPos = new Vec2(x, y);
    this.acceleration = new Vec2();
    this.pinned = pinned;
    this.char = char;
    this.downConstraint = null;
    // 원래 자리(격자 위치). 마우스로 흔들리거나 잡아끌린 뒤에도 결국 이 자리로
    // 돌아오도록 복원력의 기준점으로 쓴다 — 없으면 헐거운 길이 제약만으로는
    // 옆줄과 자리를 바꾼 채(엉킨 채) 멈춰버릴 수 있다
    this.baseHomeX = x;
    this.homeX = x;
    this.homeY = y;
    // 11자로 벌어지는 연출용: 열이 중심의 왼쪽/오른쪽 중 어느 쪽인지 저장해 두고,
    // 매 프레임 스크롤 진행률에 비례해 같은 열의 모든 줄을(위아래 구분 없이 동일하게)
    // 나란히 바깥쪽으로 밀어낸다 — 위는 모이고 아래만 벌어지는 ㅅ자가 아니라
    // 열 전체가 평행하게 옆으로 이동한다
    this.spreadDir = spreadDir;
  }
  applyForce(v) {
    this.acceleration.add(v);
  }
  update(gravity, damping, restoreStrength) {
    if (this.pinned) {
      this.acceleration.reset();
      return;
    }
    const vx = (this.pos.x - this.oldPos.x) * damping;
    const vy = (this.pos.y - this.oldPos.y) * damping;
    this.oldPos.reset(this.pos.x, this.pos.y);
    this.acceleration.x += (this.homeX - this.pos.x) * restoreStrength;
    this.acceleration.y += (this.homeY - this.pos.y) * restoreStrength;
    this.acceleration.y += gravity;
    this.pos.x += vx + this.acceleration.x;
    this.pos.y += vy + this.acceleration.y;
    this.acceleration.reset();
  }
}
class Constraint {
  constructor({ p1, p2, length, compressFactor, stretchFactor }) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = length;
    this.minLength = length * compressFactor;
    this.maxLength = length * stretchFactor;
  }
  solve() {
    const dx = this.p2.pos.x - this.p1.pos.x;
    const dy = this.p2.pos.y - this.p1.pos.y;
    const distance = Math.hypot(dx, dy);
    if (distance === 0) return;
    let target;
    if (distance < this.minLength) target = this.minLength;
    else if (distance > this.maxLength) target = this.maxLength;
    else return;
    const diff = (target - distance) / distance / 2;
    const ox = dx * diff;
    const oy = dy * diff;
    if (!this.p1.pinned) {
      this.p1.pos.x -= ox;
      this.p1.pos.y -= oy;
    }
    if (!this.p2.pinned) {
      this.p2.pos.x += ox;
      this.p2.pos.y += oy;
    }
  }
}

// ============================================================
// EntranceSection : STEP1 + STEP2 (이전 데모 그대로)
// ============================================================
function EntranceSection({ activated, onActivate, onSurveyOpen, onExplore, ctaRef, lowPower = false }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  const roofRef = useRef(null);
  const [roofHeight, setRoofHeight] = useState(0);
  const [roofWidth, setRoofWidth] = useState(0);
  // 지붕 이미지의 실제 가로/세로 비율(naturalWidth/naturalHeight).
  // 지붕 "크기"와 커튼/로고 "위치"를 같은 좌표계(뷰포트 높이 기준)로
  // 환산하기 위한 유일한 기준값 — 로드 전에는 에셋 원본 비율을 기본값으로 사용.
  const [roofAspectRatio, setRoofAspectRatio] = useState(ROOF_ASSET_ASPECT_RATIO);

  const [viewportHeight, setViewportHeight] = useState(
    () => (typeof window !== "undefined" ? window.innerHeight : 800)
  );
  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth : 1280)
  );
  // 리더기(꽉 찬 서재) 크기 계산 전용의 "흔들리지 않는" 화면 높이.
  // 모바일에서 아래로 스크롤하면 주소창이 접혔다 펼쳐지며 innerHeight가 수십 px씩
  // 오르내리는데, 리더기 크기를 live viewportHeight로 계산하면 그때마다 리더기가
  // 작아졌다 커졌다 반복한다(사용자 리포트). 그래서 리더기 크기에는 "지금까지 본
  // 가장 큰(=주소창이 접힌 상태의) 높이"를 쓴다. 한 번 커지면 다시 줄지 않아
  // 스크롤 중 크기가 고정된다. 가로폭이 바뀌는 실제 회전/리사이즈에서만 재보정한다.
  const [stableViewportHeight, setStableViewportHeight] = useState(
    () => (typeof window !== "undefined" ? window.innerHeight : 800)
  );
  const lastWidthRef = useRef(typeof window !== "undefined" ? window.innerWidth : 1280);

  const entranceLogoRef = useRef(null);
  const handleActivateRef = useRef(null);
  const guideRef = useRef(null);
  const journeyWrapRef = useRef(null);

  const isMobile = useIsMobile();

  // 버튼 클릭(활성화) 이후 스크롤 진행률(0~1) — 입구 줄 통과부터 리더기 부팅,
  // 서재 비교, CTA까지 전체 여정을 아우르는 단 하나의 연속된 진행률이다
  // 페이지 전환(섹션 교체) 없이 이 값 하나로 카메라 전진 → 리더기 등장 → 리더기
  // 화면 전환까지 모두 이어지도록, 구간별로 이 값을 다시 0~1로 정규화해 쓴다
  const [journeyProgress, setJourneyProgress] = useState(0);
  // 입구 안내 문구("아래로/위로 스크롤하여…")의 방향 텍스트를 고르기 위한 스크롤
  // 방향. journeyProgress를 갱신하는 동일한 rAF 콜백 안에서 함께 계산되므로(아래
  // onScroll의 measure 참고) 별도의 리스너나 렌더링 경로를 추가하지 않는다 —
  // 이미 프레임당 1회로 스로틀된 갱신에 방향 비교 한 번을 얹는 것뿐이라 스크롤
  // 성능에 영향이 없다.
  const [scrollDirection, setScrollDirection] = useState("down");
  // 0 ~ ENTRANCE_PHASE_END 구간(줄 통과 연출) 로컬 진행률
  const entranceProgress = clamp01(journeyProgress / ENTRANCE_PHASE_END);
  // ENTRANCE_PHASE_END ~ 1 구간(리더기 부팅 → 비교 → 가치제안 → CTA) 로컬 진행률
  const libraryProgress = clamp01((journeyProgress - ENTRANCE_PHASE_END) / (1 - ENTRANCE_PHASE_END));

  const [showRipple, setShowRipple] = useState(false);
  // 캔버스 물리 루프(rAF)에서 최신 스크롤 진행률을 읽기 위한 ref.
  // 캔버스 초기화 effect를 progress가 바뀔 때마다 다시 실행하지 않기 위해
  // state 대신 ref로 전달한다
  const journeyProgressRef = useRef(0);
  useEffect(() => {
    journeyProgressRef.current = entranceProgress;
  }, [entranceProgress]);

  // 리더기는 입구 연출이 끝난 자리에서 "같은 리더기"가 그대로 부팅되어야 하므로,
  // 페이지를 새로 시작하지 않고 여기서 부팅/비교 상태를 함께 관리한다
  const [booting, setBooting] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const libraryStartedRef = useRef(false);
  // 화면이 켜진(bootDone) 뒤 잠깐의 유예를 두고서야 스크롤이 좌우 비교를 제어하게
  // 하던 방식은 폐기 — 화면이 켜지는 즉시 스크롤이 곧바로 좌우 비교를 제어한다.
  // 그 전(부팅) 구간의 스크롤만 막으면 된다.
  const comparisonReady = bootDone;

  const inLibraryPhase = booting || bootDone;
  const scrollLocked = inLibraryPhase && !bootDone;
  useEffect(() => {
    if (!activated || !scrollLocked) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const preventScroll = (e) => e.preventDefault();
    const preventScrollKeys = (e) => {
      if (SCROLL_KEYS.has(e.key)) e.preventDefault();
    };
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
    window.addEventListener("keydown", preventScrollKeys, { passive: false });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
      window.removeEventListener("keydown", preventScrollKeys);
    };
  }, [activated, scrollLocked]);

  // wheel/touchmove를 막아도, 그 잠금이 걸리기 "직전"의 한 번의 스크롤 이벤트(트랙패드
  // 플릭 등으로 한 번에 큰 델타가 들어오는 경우)까지는 막을 수 없다 — React 상태가
  // 갱신되어 잠금 리스너가 실제로 붙기 전까지는 여전히 스크롤이 반영되기 때문이다.
  // 그래서 "잠금"과는 별개로, 좌우 비교 진행률 자체를 절대 scroll 위치가 아니라
  // "스크롤 반영을 시작하기로 한 시점(comparisonReady가 된 시점)의 libraryProgress"를
  // 기준점으로 삼아 그 이후에 실제로 더 스크롤한 양만큼만 반영한다. 기준점 이전에
  // 얼마나 새어 들어왔는지와 무관하게 화면이 켜지고 유예가 끝나는 순간 항상 0에서
  // 다시 시작한다.
  const COMPARISON_RANGE = LIBRARY_KF.comparison[1][0] - LIBRARY_KF.comparison[0][0];
  // 잠금 리스너가 붙기 전, 문턱을 넘기는 단 한 번의 스크롤 이벤트 자체가 크게
  // (트랙패드를 세게 튕기는 경우 등) 들어오면 그 지점이 이미 1 - COMPARISON_RANGE를
  // 넘어설 수 있다 — 그러면 아무리 더 스크롤해도 100%에 닿지 못한다. baseline이
  // 남은 구간(COMPARISON_RANGE)을 다 쓸 수 있는 지점을 넘지 않도록 위쪽을 잘라 둔다.
  const [comparisonBaseline, setComparisonBaseline] = useState(null);
  if (!bootDone) {
    if (comparisonBaseline !== null) setComparisonBaseline(null);
  } else if (comparisonReady && comparisonBaseline === null) {
    setComparisonBaseline(Math.min(libraryProgress, 1 - COMPARISON_RANGE));
  }
  // 비교(서재 채우기)는 남은 스크롤 전체(baseline~1.0)에 걸쳐 진행되도록 해서,
  // 채우기 완료 = journeyProgress 1.0 = 고정(sticky) 해제 = 다음 섹션 등장이
  // 정확히 같은 지점에서 일어나게 한다. 예전처럼 고정 폭(COMPARISON_RANGE)만 쓰면
  // 서재가 다 찬 뒤에도 journeyProgress가 1.0에 닿을 때까지 아무 변화 없이 한참
  // 더 스크롤해야 하는 "죽은 구간"이 생겨, 버튼이 뜬 뒤에도 바로 아래로 내려가지
  // 못하고 버벅이는 느낌을 줬다.
  // 서재 채우기(비교)는 남은 스크롤의 (1 - DWELL) 지점에서 100%에 도달하고,
  // 마지막 DWELL 구간은 "다 찬 상태로 잠깐 머무는" 여운이다 — 이 동안 상단/하단
  // 문구가 다 보이고 '더 알아보기' 화살표가 깜빡이며, 그 뒤에 고정이 풀려 다음
  // 섹션으로 넘어간다(완성 화면을 읽을 시간).
  const comparisonProgress =
    comparisonBaseline === null
      ? 0
      : clamp01(
          (libraryProgress - comparisonBaseline) /
            ((1 - comparisonBaseline) * (1 - LIBRARY_COMPLETION_DWELL))
        );
  // 완성 콘텐츠(리더기 상단 헤드라인 + 하단 안내/버튼/화살표)는 한 번에 팝업되지
  // 않고, 비교 전환률 contentRevealStart(70%)~contentRevealAt(90%) 구간에 걸쳐
  // 서서히 나타난다(contentReveal 0→1). 90%에서 완전히 보이며, 그 지점부터
  // 버튼/화살표가 클릭 가능(showCTA)해진다.
  const contentReveal = bootDone
    ? clamp01(
        (comparisonProgress - LIBRARY_KF.contentRevealStart) /
          (LIBRARY_KF.contentRevealAt - LIBRARY_KF.contentRevealStart)
      )
    : 0;
  // 좌우 비교 안내("아래로 스크롤하여…")는 완성 콘텐츠가 나타나는 만큼 반대로
  // 사라진다(교차 페이드).
  // bootDone은 최초 1회 부팅된 뒤로는 영원히 true로 남는다(재방문 시 로딩 화면을
  // 다시 재생하지 않기 위한 의도적 설계 — 좋은 동작이다). 문제는 이 안내가
  // bootDone 하나에만 의존해서, "지금 실제로 리더기 화면 근처에 있는지"와 무관하게
  // 항상 보이려 든다는 것이다. 첫 방문에서는 우연히 문제가 없었다 — 부팅이 끝나기
  // 전(entranceProgress가 0.75→1로 올라가는 구간)에는 bootDone이 아직 false였기
  // 때문이다. 하지만 입구로 되돌아갔다가 다시 스크롤해 내려오는 "재방문"에서는
  // bootDone이 이미 true인 채로 같은 0.75→1 구간을 다시 지나가므로, 이 안내가
  // 리더기가 채 자리잡기도 전부터 나타나 입구의 안내 문구("아래로/위로
  // 스크롤하여…")와 겹쳐 보인다. entranceProgress가 완전히 1에 도달해(=입구 안내가
  // GUIDE_OPACITY_KF에 따라 완전히 사라진 시점과 정확히 같은 지점) "리더기가
  // 실제로 자리잡은 뒤"라는 조건을 추가로 걸어, 첫 방문·재방문·역스크롤 모두에서
  // 두 안내가 겹치는 순간이 생기지 않게 한다.
  const readerFullySettled = entranceProgress >= 1;
  const libraryGuideReveal = bootDone && readerFullySettled ? 1 - contentReveal : 0;
  // 버튼·화살표가 클릭 가능해지는 시점 — 완성 콘텐츠가 (거의) 완전히 드러난 뒤.
  // contentReveal 기준으로 맞춰, "다 보이는데 아직 클릭 안 되는" 틈이 없게 한다.
  const showCTA = contentReveal >= 0.999;

  const CURTAIN_TOP_RATIO = 0.72; // roofHeight의 70% 지점에서 커튼 시작 (숫자는 조절 가능)
  const CURTAIN_BOTTOM_RATIO = 0.14; // 커튼 하단 ~ 화면 하단 간격 = 화면 높이의 14% (화면 비율에 따라 함께 움직이도록 고정 px 대신 비율로 계산)
  const CURTAIN_BOTTOM_OFFSET = viewportHeight * CURTAIN_BOTTOM_RATIO;

  const curtainWidthRatio = CURTAIN_WIDTH_RATIO;

  // ------------------------------------------------------------------
  // 좌표계 통일: 지붕 "크기"와 커튼/로고 "위치"를 모두 같은 기준
  // (viewportHeight + 아래 두 상수)에서 유도한다
  //
  //   1) 커튼이 최소한 확보해야 하는 세로 영역(MIN_CURTAIN_HEIGHT_RATIO)을 먼저 정하고,
  //   2) 그 영역을 침범하지 않는 "지붕이 가질 수 있는 최대 높이(maxRoofHeight)"를 역산한 뒤,
  //   3) 지붕의 실제 가로/세로 비율(roofAspectRatio)로 그 높이를 폭(px) 제한값으로 환산해
  //      <img> 의 width에 그대로 적용한다
  //
  // 이렇게 하면 지붕 폭을 얼마로 렌더링하든, 렌더링 결과로 측정되는 roofHeight가
  // 이미 커튼 배치와 같은 제약을 만족하도록 보장되므로, curtainTop을 다시 vh 기준으로
  // 클램프하는 별도 로직이 필요 없다 — 화면 가로세로 비율이 어떻든 항상 같은 지점에서
  // 맞물린다
  const MIN_CURTAIN_HEIGHT_RATIO = 0.45;
  const curtainBottom = viewportHeight - CURTAIN_BOTTOM_OFFSET;

  const maxRoofHeight = Math.max(
    0,
    (curtainBottom - viewportHeight * MIN_CURTAIN_HEIGHT_RATIO) / CURTAIN_TOP_RATIO
  );
  const roofWidthCap = maxRoofHeight * roofAspectRatio;

  // 커튼 상단 위치는 오직 "실제로 렌더링된 지붕 높이"에서만 유도한다(단일 좌표계).
  const curtainTop = roofHeight * CURTAIN_TOP_RATIO;

  const LOGO_POSITION_IN_CURTAIN = 0.4; // 커튼 중앙에 위치 (원하는 값으로 조절)
  const logoTop = curtainTop + (curtainBottom - curtainTop) * LOGO_POSITION_IN_CURTAIN;

  // 안내 문구의 초기/대체 위치 — 실제 값은 물리 시뮬레이션이 시작되면 아래 물리 루프에서
  // "커튼의 실제 렌더링된 하단"을 매 프레임 측정해 갱신한다(guideRef 참고).
  const guideBottom = CURTAIN_BOTTOM_OFFSET / 2;

  useEffect(() => {
    // 고정(sticky) 컨테이너는 100dvh로 렌더링되어, 모바일에서 주소창이 접히고
    // 펼쳐질 때마다 실제 화면 높이가 즉시 바뀐다. viewportHeight(JS 상태)가 이
    // 실제 높이를 그대로 따라가지 못하면(예: window resize 이벤트만 믿고 가로폭이
    // 바뀔 때만 갱신하면), 로고/이북 리더기 위치 계산에 쓰이는 값이 실제 dvh보다
    // 작은 채로 고정되어 화면 위쪽에 몰려 보인다 — 스크롤을 해야 resize 이벤트가
    // 뒤늦게 발생해 그제서야 값이 맞아 들어간다. window의 resize 이벤트는 주소창
    // 토글에 즉시/일관되게 반응하지 않으므로, 실제 렌더링된 문서 높이를
    // ResizeObserver로 직접 관찰해 바로바로 따라가게 한다.
    const target = document.documentElement;
    const update = () => {
      // 주소창이 접히고 펼쳐질 때마다 innerHeight가 몇 px씩 흔들리는데, 그때마다
      // setState로 전체를 다시 렌더링하면 스크롤 중 버벅임을 키운다. 실제 배치에
      // 의미 있는 변화(2px 초과)일 때만 갱신한다. 가로폭은 회전/리사이즈에서만
      // 바뀌므로 조건 없이 반영한다.
      const h = window.innerHeight;
      const w = window.innerWidth;
      setViewportHeight((prev) => (Math.abs(prev - h) > 2 ? h : prev));
      setViewportWidth((prev) => (prev !== w ? w : prev));
      // 리더기 크기용 안정 높이: 가로폭이 바뀌면(회전/리사이즈) 그 시점 높이로
      // 재보정하고, 그 외에는 주소창이 접힌 최대 높이까지만 키운다(줄이지 않는다).
      // 이렇게 하면 스크롤 중 주소창 토글로 innerHeight가 오르내려도 리더기 크기는
      // 한 번 정해진 뒤 흔들리지 않는다.
      if (w !== lastWidthRef.current) {
        lastWidthRef.current = w;
        setStableViewportHeight(h);
      } else {
        setStableViewportHeight((prev) => (h > prev ? h : prev));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(target);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useLayoutEffect(() => {
      if (!roofRef.current) return;

      const update = () => {
          // getBoundingClientRect()는 조상에 걸린 transform: scale(gateScale)의
          // 영향을 그대로 받는다 — 스크롤로 확대(1~7배)되는 도중에 리사이즈/옵저버
          // 콜백이 실행되면 이미 확대된 화면 좌표를 지붕 실제 크기로 잘못 저장하게
          // 되고, 그 값을 기준으로 계산되는 커튼 위치/크기·로고 위치가 전부 어긋나
          // 화면 밖으로 밀려난다(지붕 자체는 이 값에 의존하지 않아 멀쩡해 보인다).
          // offsetWidth/offsetHeight는 transform의 영향을 받지 않는 실제 레이아웃
          // 크기이므로 이 문제가 없다.
          setRoofHeight(roofRef.current.offsetHeight);
          setRoofWidth(roofRef.current.offsetWidth);
      };

      update();

      const ro = new ResizeObserver(update);
      ro.observe(roofRef.current);

      window.addEventListener("resize", update);

      return () => {
          ro.disconnect();
          window.removeEventListener("resize", update);
      };
  }, []);

  // 캐시된 이미지는 onLoad가 이미 지나간 뒤일 수 있으므로 마운트 시점에 한 번 더 확인
  useEffect(() => {
    const img = roofRef.current;
    if (img && img.complete && img.naturalWidth && img.naturalHeight) {
      setRoofAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  const handleRoofLoad = useCallback((e) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setRoofAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  useEffect(() => {
    const host = hostRef.current;

    if (!host || roofHeight <= 0) return;

    let disposed = false;
    let rafId = 0;

    const width = host.clientWidth;
    const height = host.clientHeight;

    if (width <= 0 || height <= 0) return;

    const isNarrowCanvas = width < 640;

    const CONFIG = {
      gridW: Math.min(
        isNarrowCanvas ? 16 : 28,
        Math.max(6, Math.floor(width / 26))
      ),
      gridH: Math.min(
        isNarrowCanvas ? 32 : 40,          // 16/22 → 22/28로 캡 상향
        Math.max(6, Math.floor(height / 24))  // 26 → 18로 줄여 행간 촘촘하게
      ),
      gravity: 0.12,
      damping: 0.97,
      restoreStrength: 0.0005, // 원래 격자 자리로 되돌아가려는 복원력 세기
      // 저사양 기기에서는 제약 반복 횟수를 절반으로 줄인다(4→2). 커튼이 아주
      // 살짝 더 물렁하게 늘어지는 정도의 차이만 있고 글자 배치/개수는 그대로라
      // 눈에 잘 띄지 않으면서 매 프레임 물리 비용을 크게 덜어낸다.
      iterationsPerFrame: lowPower ? 2 : 4,
      compressFactor: 0.35,
      stretchFactor: 0.8,
      spacerCompress: 0.5,
      spacerStretch: 3,
      mouseRadius: isNarrowCanvas ? 90 : 120,
      mouseStrength: 2.4,
    };
    const sidePadding = Math.max(20, width * 0.04);

    const drawableWidth = width - sidePadding * 2;

    const cellWidth = drawableWidth / (CONFIG.gridW - 1);

    const fontSize = Math.max(
      8,
      Math.min(20, cellWidth * 0.72)
    );

    const topInset = fontSize * 0.6; // 상단 여백 (글자 절반 정도)
    const cellHeight = (height - topInset) / (CONFIG.gridH - 1);

    // 고해상도(레티나/모바일) 화면에서 커튼 글자가 뿌옇게/깨져 보이지 않도록,
    // 캔버스 백킹 스토어와 글자 비트맵을 devicePixelRatio 배율로 렌더링한다.
    // (성능을 위해 2배로 상한.) 그리는 좌표계는 그대로 CSS 픽셀을 쓰되, 매 글자
    // 변환과 글자 비트맵에만 dpr을 반영한다.
    // 저사양 기기에서는 캔버스 백킹 스토어 배율을 1로 고정한다(고DPI 폰에서 픽셀
    // 수가 최대 4배 줄어 그리기 비용이 급감). 글자가 아주 약간 덜 또렷해지는 정도의
    // 차이만 있다. 성능이 넉넉한 기기는 종전대로 최대 2배로 선명하게 렌더링한다.
    const dpr = lowPower ? 1 : Math.min(2, window.devicePixelRatio || 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    // 터치 드래그로 글자를 잡는 기능은 의도적으로 비활성화되어 있으므로(아래
    // onPointerDown 참고) 이 캔버스가 세로 스크롤 제스처까지 가로챌 필요는 없다.
    // "none"으로 두면 실제 터치 기기에서 캔버스 위를 문질러도 네이티브 스크롤이
    // 아예 발생하지 않아 페이지가 내려가지 않는다.
    canvas.style.touchAction = "pan-y";
    canvas.style.display = "block";
    host.innerHTML = "";
    host.appendChild(canvas);
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");

    const particles = [];
    const constraints = [];
    const columnSpreadDir = [];
    // 단어 단위 커서를 공유해 어느 화면 높이에서도 단어가 열 사이에서 갈라지지 않는다
    let wordCursor = 0;

    for (let i = 0; i < CONFIG.gridW; i++) {
      const columnWords = [];
      let columnLength = 0;

      // 현재 열 높이에 들어가는 범위에서 단어를 통째로 채운다
      while (columnWords.length < CLOTH_WORDS.length) {
        const word = CLOTH_WORDS[wordCursor];
        const nextLength = columnLength + (columnWords.length > 0 ? 1 : 0) + word.length;
        if (nextLength > CONFIG.gridH && columnWords.length > 0) break;
        columnWords.push(word);
        columnLength = nextLength;
        wordCursor = (wordCursor + 1) % CLOTH_WORDS.length;
        if (columnLength >= CONFIG.gridH) break;
      }

      // 한 단어의 글자는 반드시 인접한 행에 붙여(공백 없는 단어가 "위 하 여"처럼
      // 쪼개지지 않게) 배치하고, 남는 빈 행은 "단어와 단어 사이"에만 고르게
      // 분배한다. 첫 글자는 첫 행, 마지막 글자는 마지막 행에 놓아 모든 열의
      // 시각적 길이(위·아래 정렬)는 그대로 유지한다.
      const rowChars = Array(CONFIG.gridH).fill(" ");
      const totalChars = columnWords.reduce((sum, w) => sum + w.length, 0);
      const gapCount = columnWords.length - 1; // 단어 사이 간격 개수
      // 위 while 루프가 (글자수 + 단어사이공백) ≤ gridH가 되도록 채우므로
      // emptyRows ≥ gapCount → 각 간격에 최소 1개의 빈 행이 보장된다.
      const emptyRows = Math.max(0, CONFIG.gridH - totalChars);
      const baseGap = gapCount > 0 ? Math.floor(emptyRows / gapCount) : 0;
      let extraGap = gapCount > 0 ? emptyRows % gapCount : 0; // 앞쪽 간격부터 하나씩 더
      let row = 0;
      for (let w = 0; w < columnWords.length; w++) {
        const word = columnWords[w];
        for (let k = 0; k < word.length; k++) {
          if (row < CONFIG.gridH) rowChars[row] = word[k];
          row++;
        }
        if (w < columnWords.length - 1) {
          row += baseGap + (extraGap > 0 ? 1 : 0); // 단어 사이 빈 행
          if (extraGap > 0) extraGap--;
        }
      }

      // 버튼(중앙) 기준 왼쪽 열은 -1, 오른쪽 열은 +1 — 같은 열의 모든 줄이
      // 동일하게 이 방향으로 밀려나 열 전체가 평행하게(11자로) 이동한다.
      // 중앙 기준을 "열과 열 사이"(gridW/2)로 잡아, 어느 열도 정중앙에 걸려
      // 멈추지 않게 한다 — gridW가 홀수여도 정중앙 열이 한쪽으로 함께 이동하고,
      // 짝수일 때는 예전과 동일하게 좌우 대칭으로 갈라진다.
      const spreadDir = i < CONFIG.gridW / 2 ? -1 : 1;
      columnSpreadDir[i] = spreadDir;

      for (let j = 0; j < CONFIG.gridH; j++) {
        const x = sidePadding + i * cellWidth;
        const y = topInset + j * cellHeight;
        const pinned = j === 0;

        particles.push(new Particle({ x, y, pinned, char: rowChars[j], spreadDir }));
      }
    }

    for (let i = 0; i < CONFIG.gridW; i++) {
      for (let j = 0; j < CONFIG.gridH; j++) {
        const id = getPointID(j, i, CONFIG.gridH);
        const p = particles[id];
        if (j < CONFIG.gridH - 1) {
          const below = particles[getPointID(j + 1, i, CONFIG.gridH)];
          const c = new Constraint({ p1: p, p2: below, length: cellHeight, compressFactor: CONFIG.compressFactor, stretchFactor: CONFIG.stretchFactor });
          constraints.push(c);
          p.downConstraint = c;
        }
        // 버튼 좌우로 갈라지는 경계(양옆 열의 이동 방향이 서로 다른 지점)에는
        // 가로 스페이서를 연결하지 않는다 — 이어 붙여 두면 고정줄(맨 위, pinned)은
        // 걸림 없이 목표 지점까지 이동하는데 그 아래(비고정) 줄들만 이 제약에 걸려
        // 중간에서 꺾이는 것처럼 보인다
        if (i < CONFIG.gridW - 1 && columnSpreadDir[i] === columnSpreadDir[i + 1]) {
          const right = particles[getPointID(j, i + 1, CONFIG.gridH)];
          constraints.push(new Constraint({ p1: p, p2: right, length: cellWidth, compressFactor: CONFIG.spacerCompress, stretchFactor: CONFIG.spacerStretch }));
        }
      }
    }

    let charCanvases = {};
    function renderGlyphs() {
      charCanvases = {};
      for (const ch of new Set(FULL_TEXT)) {
        if (ch === " " || ch === "　") continue;
        const cssSize = Math.ceil(fontSize * 1.5);
        const off = document.createElement("canvas");
        off.width = off.height = Math.ceil(cssSize * dpr);
        off._css = cssSize; // 실제로 그릴 때 쓰는 CSS 크기(비트맵 자체는 dpr배 크다)
        const octx = off.getContext("2d");
        octx.scale(dpr, dpr);
        octx.font = `500 ${fontSize}px "Noto Serif KR", serif`;
        octx.textAlign = "center";
        octx.textBaseline = "middle";
        octx.fillStyle = "#3a3a3a";
        octx.fillText(ch, cssSize / 2, cssSize / 2);
        charCanvases[ch] = off;
      }
    }
    if (document.fonts && document.fonts.load) {
      document.fonts.load(`500 ${fontSize}px "Noto Serif KR"`).then(renderGlyphs).catch(renderGlyphs);
      renderGlyphs();
      setTimeout(renderGlyphs, 300);
    } else {
      renderGlyphs();
    }

    let grabbed = null;
    function toLocal(e) {
      // 파티클 좌표는 CSS 픽셀이므로, 백킹 스토어(dpr배)가 아니라 논리 크기
      // (width/height)를 기준으로 매핑한다.
      const rect = canvas.getBoundingClientRect();
      return new Vec2((e.clientX - rect.left) * (width / rect.width), (e.clientY - rect.top) * (height / rect.height));
    }
    function onPointerDown(e) {
      const p = toLocal(e);

      const logoElement = entranceLogoRef.current;

      if (logoElement) {
        const logoRect = logoElement.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        const scaleX = width / canvasRect.width;
        const scaleY = height / canvasRect.height;

        const logoLeft =
          (logoRect.left - canvasRect.left) * scaleX;

        const logoRight =
          (logoRect.right - canvasRect.left) * scaleX;

        const logoTop =
          (logoRect.top - canvasRect.top) * scaleY;

        const logoBottom =
          (logoRect.bottom - canvasRect.top) * scaleY;

        const isInsideLogo =
          p.x >= logoLeft &&
          p.x <= logoRight &&
          p.y >= logoTop &&
          p.y <= logoBottom;

        if (isInsideLogo) {
          handleActivateRef.current?.();
          return;
        }
      }

      // 모바일(터치)에서는 글자를 "잡아서" 손끝에 고정시키지 않는다 — 글자 밀도가 높아
      // 터치 지점 대부분이 어떤 글자든 20px 안쪽이라서, 이 로직이 있으면 화면을 문질러도
      // 항상 글자 하나만 손끝을 따라가고 마우스 호버 때와 같은 "주변이 함께 밀리는"
      // 잔물결 반응은 전혀 일어나지 않는다 데스크톱은 마우스 클릭 앤 드래그로 글자를
      // 잡아 끄는 재미 요소를 그대로 유지한다
      if (e.pointerType === "touch") return;

      // 기존 글자 잡기 코드
      let closestParticle = null;
      let closestDistance = Infinity;

      for (const particle of particles) {
        if (particle.pinned) continue;

        const dx = p.x - particle.pos.x;
        const dy = p.y - particle.pos.y;
        const distance = dx * dx + dy * dy;

        if (distance < closestDistance) {
          closestParticle = particle;
          closestDistance = distance;
        }
      }

      if (closestParticle && closestDistance < 400) {
        grabbed = closestParticle;
        grabbed._wasPinned = grabbed.pinned;
        grabbed.pinned = true;
      }
    }
    function onPointerMove(e) {
      const p = toLocal(e);
      if (grabbed) {
        grabbed.pos.reset(p.x, p.y);
        grabbed.oldPos.reset(p.x, p.y);
        return;
      }
      const radiusSq = CONFIG.mouseRadius * CONFIG.mouseRadius;
      for (const particle of particles) {
        if (particle.pinned) continue;
        const dx = particle.pos.x - p.x;
        const dy = particle.pos.y - p.y;
        const ls = dx * dx + dy * dy;
        if (ls < radiusSq) {
          const strength = smoothstep(radiusSq, 0, ls) * CONFIG.mouseStrength;
          const dist = Math.sqrt(ls) || 1;
          particle.applyForce(new Vec2((dx / dist) * strength, (dy / dist) * strength));
        }
      }
    }
    function onPointerUp() {
      if (grabbed) {
        grabbed.pinned = grabbed._wasPinned;
        grabbed = null;
      }
    }
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    canvas.__applyActivationImpulse = () => {
      const centerX = width / 2;
      for (const particle of particles) {
        if (particle.pinned) continue;
        const dir = particle.pos.x - centerX >= 0 ? 1 : -1;
        particle.oldPos.x -= dir * 5;
      }
    };

    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        if (!p.char || p.char === " " || p.char === "　") continue;
        const img = charCanvases[p.char];
        if (!img) continue;
        let angle = 0;
        if (p.downConstraint) {
          const dx = p.downConstraint.p2.pos.x - p.downConstraint.p1.pos.x;
          const dy = p.downConstraint.p2.pos.y - p.downConstraint.p1.pos.y;
          angle = Math.atan2(dy, dx) - Math.PI / 2;
        }
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const cssSize = img._css;
        const half = cssSize / 2;
        // 회전·이동은 CSS 좌표 그대로 두되, 백킹 스토어가 dpr배이므로 변환 행렬에
        // dpr을 곱하고, 비트맵은 CSS 크기(cssSize)로 그려 넣어 선명하게 렌더링한다.
        ctx.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, p.pos.x * dpr, p.pos.y * dpr);
        ctx.drawImage(img, -half, -half, cssSize, cssSize);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    const bottomRowParticles = [];
    for (let i = 0; i < CONFIG.gridW; i++) {
      bottomRowParticles.push(particles[getPointID(CONFIG.gridH - 1, i, CONFIG.gridH)]);
    }

    function updateGuidePosition(avgBottomY) {
      const guideEl = guideRef.current;
      if (!guideEl) return;
      // 커튼의 실제(물리 시뮬레이션 결과) 하단 위치 — 섹션 좌표계 기준
      const curtainVisualBottom = curtainTop + avgBottomY;
      const midpoint = (curtainVisualBottom + viewportHeight) / 2;
      guideEl.style.bottom = `${viewportHeight - midpoint}px`;
    }

    // 안내 문구가 출렁이지 않도록: 화면에 그리기 전에 커튼이 중력으로 완전히
    // 늘어진 "정지 상태"를 헤드리스로 먼저 시뮬레이션해 최종 하단 위치를 구하고,
    // 그 값으로 안내 문구를 한 번만 고정한다. 그런 다음 파티클을 초기 위치로
    // 되돌려, 화면에는 여느 때처럼 줄이 떨어지는 연출을 그대로 보여준다.
    // (정지 상태 기준은 스크롤 진행률 0 — 좌우로 벌어지지 않은 초기 시점.)
    {
      const initialState = particles.map((p) => ({
        x: p.pos.x, y: p.pos.y, ox: p.oldPos.x, oy: p.oldPos.y,
      }));
      const measureAvgBottom = () =>
        bottomRowParticles.reduce((sum, p) => sum + p.pos.y, 0) / bottomRowParticles.length;
      const SETTLE_MAX_STEPS = 600; // 수렴하지 않아도 이 횟수에서 멈춘다
      const SETTLE_EPS = 0.02; // 단계 간 변화가 이보다 작으면 정지로 간주
      let prevAvg = null;
      for (let step = 0; step < SETTLE_MAX_STEPS; step++) {
        for (const p of particles) {
          p.homeX = p.baseHomeX; // 벌어짐 없는 정지 상태
          if (p.pinned) {
            p.pos.x = p.homeX;
            p.oldPos.x = p.homeX;
          }
        }
        for (const p of particles) p.update(CONFIG.gravity, CONFIG.damping, CONFIG.restoreStrength);
        for (let k = 0; k < CONFIG.iterationsPerFrame; k++) for (const c of constraints) c.solve();
        const avg = measureAvgBottom();
        if (prevAvg !== null && Math.abs(avg - prevAvg) < SETTLE_EPS) break;
        prevAvg = avg;
      }
      updateGuidePosition(measureAvgBottom());
      // 파티클을 초기 위치로 되돌려 낙하 연출을 그대로 재생한다.
      particles.forEach((p, i) => {
        const s = initialState[i];
        p.pos.x = s.x;
        p.pos.y = s.y;
        p.oldPos.x = s.ox;
        p.oldPos.y = s.oy;
      });
    }

    // 스크롤(=버튼 속으로 다가가는 진행률)이 커질수록 줄이 ㅅ자로 더 크게 벌어지도록
    // 열의 최대 수평 이동 거리를 캔버스 폭 기준으로 정해 둔다
    const maxSpreadPx = width * 0.55;

    function loop() {
      if (disposed) return;
      rafId = requestAnimationFrame(loop);
      // 입구 연출이 끝나면(entranceProgress=journeyProgressRef가 1) 커튼을 감싼
      // 게이트가 opacity 0으로 사라져 화면에 보이지 않는다. 그런데도 매 프레임
      // 격자 물리(파티클 update + 제약 solve)와 그리기를 계속하면, 저사양 폰에서
      // 다음 섹션으로 넘어간 뒤에도 CPU를 계속 잡아먹어 스크롤이 버벅인다.
      // 보이지 않는 동안에는 물리·그리기를 모두 건너뛴다(스크롤을 되올려 커튼이
      // 다시 보이면 곧바로 재개된다).
      if (journeyProgressRef.current >= 1) return;
      const spreadAmount = interpolateKeyframes(journeyProgressRef.current, CURTAIN_SPREAD_KF) * maxSpreadPx;
      for (const p of particles) {
        p.homeX = p.baseHomeX + p.spreadDir * spreadAmount;
        // 맨 위 고정줄은 물리 업데이트를 타지 않으므로(pinned은 update()에서 바로 반환),
        // 여기서 직접 이동시켜야 열 전체가 위아래 구분 없이 나란히(11자로) 벌어진다
        if (p.pinned) {
          p.pos.x = p.homeX;
          p.oldPos.x = p.homeX;
        }
      }
      for (const p of particles) p.update(CONFIG.gravity, CONFIG.damping, CONFIG.restoreStrength);
      for (let k = 0; k < CONFIG.iterationsPerFrame; k++) for (const c of constraints) c.solve();
      draw();
      // 안내 문구 위치는 위(헤드리스 정지 시뮬레이션)에서 이미 최종값으로 한 번
      // 고정했으므로, 매 프레임 갱신하지 않는다 — 낙하·상호작용으로 줄이 흔들려도
      // 문구는 움직이지 않는다.
    }
    rafId = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [roofHeight, roofWidth, curtainTop, viewportHeight, lowPower]);

  // 활성화된 뒤에만 스크롤을 관찰한다 — 활성화 전에는 body 스크롤 자체가 잠겨 있다
  useEffect(() => {
    if (!activated) return;
    // 저사양 모바일에서 스크롤 이벤트는 화면 갱신(rAF, 보통 60fps)보다 훨씬 자주
    // 발생하는데, 이벤트마다 곧장 setJourneyProgress를 호출하면 큰 컴포넌트 트리
    // 전체가 프레임보다 여러 번 다시 렌더링되어 버벅인다. 스크롤 이벤트는 위치만
    // 기록해 두고, 실제 state 갱신은 프레임당 최대 한 번(rAF)으로 묶는다. 화면에
    // 보이는 결과는 동일하되 렌더 횟수만 프레임 수만큼으로 줄어든다.
    let rafId = 0;
    let ticking = false;
    function measure() {
      ticking = false;
      const el = journeyWrapRef.current;
      if (!el) return;
      const total = el.offsetHeight - viewportHeight;
      if (total <= 0) return;
      const rect = el.getBoundingClientRect();
      const p = clamp01(-rect.top / total);
      // 진행률이 사실상 그대로면(<0.0005) 렌더를 건너뛴다 — 주소창 토글 등으로
      // 스크롤 이벤트만 튀고 위치는 그대로인 경우의 헛된 재렌더를 막는다.
      setJourneyProgress((prev) => {
        const delta = p - prev;
        if (Math.abs(delta) < 0.0005) return prev;
        // 방향이 실제로 바뀔 때만 setState를 호출해 불필요한 재렌더를 추가하지 않는다.
        const dir = delta > 0 ? "down" : "up";
        setScrollDirection((prevDir) => (prevDir === dir ? prevDir : dir));
        return p;
      });
      // 입구 연출이 끝나고 리더기 구간으로 넘어가는 순간(=같은 화면 안에서)
      // 곧바로 리더기 부팅을 시작한다. (예전에는 "화면을 켜시겠습니까?" 퀘스트창을
      // 먼저 띄웠으나, 랜딩을 다 보는 데 시간이 더 걸린다는 피드백으로 제거했다.)
      if (!libraryStartedRef.current && p > ENTRANCE_PHASE_END) {
        libraryStartedRef.current = true;
        setBooting(true);
      }
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(measure);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [activated, viewportHeight]);

  const handleActivate = useCallback(() => {
    if (activated) return;
    const canvas = canvasRef.current;
    if (canvas && canvas.__applyActivationImpulse) canvas.__applyActivationImpulse();
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 650);
    onActivate();
  }, [activated, onActivate]);

  // 버튼(=로고) 속으로 빨려 들어가듯 지붕·커튼·로고 그룹 전체를 확대하며 지운다
  const gateScale = interpolateKeyframes(entranceProgress, GATE_KF.scale);
  const gateOpacity = interpolateKeyframes(entranceProgress, GATE_KF.opacity);
  const guideOpacity = interpolateKeyframes(entranceProgress, GUIDE_OPACITY_KF);

  useEffect(() => {
    handleActivateRef.current = handleActivate;
  }, [handleActivate]);

return (
    <section style={{ position: "relative", width: "100%", background: COLOR.white }}>
      <div
        ref={journeyWrapRef}
        style={{
          position: "relative",
          // 100vh/innerHeight 기반 px 값 대신 100dvh(동적 뷰포트 높이)를 쓴다 —
          // 모바일에서 스크롤 중 주소창이 접히고 펼쳐지며 실제 보이는 화면 높이가
          // 바뀌는데, JS state(viewportHeight)는 (로고 확대 기준점이 흔들리지 않도록)
          // 매번 갱신하지 않으므로 실제 화면보다 낮은 값에 머무를 수 있다. 그러면
          // 이 래퍼/고정(sticky) 영역이 실제 화면보다 짧게 렌더링되어 그 아래로
          // 흰 배경이 드러나고, 주소창 상태에 따라 스크롤 방향별로 보였다 사라졌다
          // 한다. 100dvh는 브라우저가 항상 "현재 실제로 보이는 높이"에 맞춰주므로
          // 이 간격이 생기지 않는다.
          height: activated ? `calc(100dvh + ${TOTAL_SCROLL_VH}vh)` : "100dvh",
        }}
      >
        <div style={{ position: "sticky", top: 0, height: "100dvh", overflow: "hidden" }}>
          {/* 지붕 + 커튼 + 로고/버튼: 스크롤이 진행될수록 확대·소멸하며
             "버튼 속으로 들어가는" 느낌의 카메라 전진 효과를 만든다 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${gateScale})`,
              transformOrigin: `50% ${clamp01(logoTop / viewportHeight) * 100}%`,
              opacity: gateOpacity,
              pointerEvents: gateOpacity <= 0.02 ? "none" : "auto",
              willChange: "transform, opacity",
            }}
          >
            <div style={{ ...eStyles.gateHeader, height: roofHeight > 0 ? roofHeight : 340 }}>
              <img
                ref={roofRef}
                src={roofImg}
                alt="Silock 입구"
                onLoad={handleRoofLoad}
                style={{
                  ...eStyles.roof,
                  width: `min(${ROOF_WIDTH}px, 100vw, ${roofWidthCap}px)`,
                }}
              />
            </div>

            <div
              ref={hostRef}
              style={{
                ...eStyles.curtainHost,
                width: roofWidth > 0 ? `${roofWidth * curtainWidthRatio}px` : "0px",
                top: curtainTop,
                bottom: CURTAIN_BOTTOM_OFFSET,
                zIndex: 3,
              }}
            />

            <img
              ref={entranceLogoRef}
              src={entranceLogoImg}
              alt="Silock 로고"
              style={{
                ...eStyles.entranceLogoImage,
                top: logoTop,
              }}
            />

            {!activated && (
              <button
                style={{
                  ...eStyles.entranceButton,
                  top: logoTop,
                }}
                onClick={handleActivate}
                onMouseEnter={() => {
                  const img = entranceLogoRef.current;
                  if (img) {
                    img.style.transform = "translate(-50%, -50%) scale(1.2)";
                    img.style.filter =
                      "drop-shadow(0 0 12px rgba(244,162,97,0.85)) drop-shadow(0 0 26px rgba(244,162,97,0.5))";
                  }
                }}
                onMouseLeave={() => {
                  const img = entranceLogoRef.current;
                  if (img) {
                    img.style.transform = "translate(-50%, -50%) scale(1)";
                    img.style.filter = "drop-shadow(0 0 0px rgba(244,162,97,0))";
                  }
                }}
              />
            )}

            {showRipple && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: logoTop,
                  width: "clamp(180px, 16vw, 320px)",
                  height: "clamp(180px, 16vw, 320px)",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${COLOR.orange}66 0%, ${COLOR.orange}33 45%, transparent 72%)`,
                  transform: "translate(-50%, -50%)",
                  animation: "ink-ripple 650ms ease-out forwards",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
            )}
          </div>

          <div ref={guideRef} style={{ ...eStyles.guide, bottom: guideBottom, opacity: guideOpacity }}>
            {activated
              ? scrollDirection === "up"
                ? "위로 스크롤하여 서재 밖으로 나가세요"
                : "아래로 스크롤하여 서재 안으로 들어가세요"
              : isMobile
              ? "화면을 터치해 입구를 찾아보세요"
              : "마우스를 움직여 입구를 찾아보세요"}
          </div>

          {activated && (
            <>
              <WhiteTransitionLayer progress={entranceProgress} />
              <LibraryBackdrop
                progress={entranceProgress}
                isMobile={isMobile}
                stableViewportHeight={stableViewportHeight}
              />
              <ReaderJourney
                entranceProgress={entranceProgress}
                booting={booting}
                bootDone={bootDone}
                onBootComplete={() => setBootDone(true)}
                comparisonProgress={comparisonProgress}
                scrollDirection={scrollDirection}
                contentReveal={contentReveal}
                libraryGuideReveal={libraryGuideReveal}
                showCTA={showCTA}
                onSurveyOpen={onSurveyOpen}
                onExplore={onExplore}
                ctaRef={ctaRef}
                isMobile={isMobile}
                // 데스크톱은 live 화면 높이를 그대로 써서 낮은 노트북에서도 리더기·
                // 안내 문구·CTA의 세로 계산이 정확히 유지된다. 모바일은 아래
                // stableViewportHeight를 써서 서재 화면 전체를 안정 높이에 묶는다.
                viewportHeight={viewportHeight}
                viewportWidth={viewportWidth}
                // 모바일 서재 화면(리더기 크기 + 리더기·헤드라인·안내문구·CTA의 세로
                // 위치) 전체를 이 "흔들리지 않는 높이"로 계산해, 주소창(검색창)이
                // 나타났다 사라져도 화면이 움찔거리지 않게 한다.
                stableViewportHeight={stableViewportHeight}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
const ROOF_WIDTH = 1100;
const CURTAIN_WIDTH_RATIO = 0.65;
// roof.png 원본 픽셀 비율(3713 x 2475)에서 계산한 기본값. 실제 값은 이미지 로드 후
// naturalWidth/naturalHeight로 갱신되며, 이 상수는 로드 전 초기 렌더링에서만 쓰인다
const ROOF_ASSET_ASPECT_RATIO = 3713 / 2475;
const TEXT_WIDTH = 500;
const eStyles = {
  page: {
    position: "relative",
    width: "100%",
    background: COLOR.white,
    overflow: "hidden",
  },

  gateHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    zIndex: 4,
    pointerEvents: "none",
  },

  roof: {
    position: "absolute",
    top: "clamp(-30px, -2vw, -10px)",
    left: "50%",
    width: `min(${ROOF_WIDTH}px, 100vw)`,
    height: "auto",
    // 지붕을 자체 합성(compositor) 레이어로 승격시킨다(will-change: transform).
    // 부모가 scale(1~7)로 확대·축소될 때 지붕 내용을 매 프레임 다시 래스터화하지
    // 않고, 한 번 만든 텍스처를 GPU가 변형만 하도록 해서, 위로 스크롤해 되돌아올
    // 때 지붕 일부가 잠깐 안 그려지는(다시 그리기 지연) 현상을 줄인다.
    transform: "translateX(-50%)",
    willChange: "transform",
    backfaceVisibility: "hidden",
    objectFit: "contain",
  },

  curtainHost: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    overflow: "hidden"
  },

  entranceLogoImage: {
    position: "absolute",
    left: "50%",

    width: "clamp(180px, 16vw, 320px)",
    height: "clamp(180px, 16vw, 320px)",
    objectFit: "contain",
    display: "block",

    transform: "translate(-50%, -50%)",

    zIndex: 2,
    pointerEvents: "none",

    transition: "transform 260ms ease-out, filter 260ms ease-out",
    filter: "drop-shadow(0 0 0px rgba(244, 162, 97, 0))",
  },

  entranceButton: {
    position: "absolute",
    left: "50%",

    width: "clamp(180px, 16vw, 320px)",
    height: "clamp(180px, 16vw, 320px)",

    padding: 0,
    border: "none",
    borderRadius: "50%",
    background: "transparent",

    cursor: "pointer",

    transform: "translate(-50%, -50%)",
    transition: "transform 260ms ease-out, box-shadow 260ms ease-out",
    boxShadow: "0 0 0px 0px rgba(244, 162, 97, 0)",

    zIndex: 4,
  },

  guide: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",

    width: `min(${TEXT_WIDTH}px, 100vw)`,
    paddingInline: "clamp(24px, 4vw, 60px)",
    boxSizing: "border-box",

    zIndex: 4,
    color: COLOR.orange,

    fontSize: "clamp(16px, 1.3vw, 20px)",
    fontWeight: 700, // 추가
    lineHeight: 1.5,
    letterSpacing: "-0.02em",

    textAlign: "center",
    pointerEvents: "none",
  },
};

// ============================================================
// STEP3 : 입구(버튼) 속으로 들어가는 스크롤 전환
// EntranceSection이 활성화된 뒤 같은 지붕/커튼/로고 그룹을 확대·소멸시켜
// "클릭한 지점 속으로 카메라가 파고드는" 화면 전환을 만든다
// 아래 레이어(흰 공간 → 서재 → 리더기)는 그 뒤를 잇는 연속 연출이다
// ============================================================
// 입구(줄 통과) 연출과 리더기(부팅→비교→가치제안→CTA) 연출을 하나의 연속된
// 스크롤 진행률로 묶는다 — 두 섹션이 따로 고정(sticky)-해제되며 페이지가
// "다음 페이지로 넘어가듯" 튀지 않도록, 같은 리더기 요소가 같은 화면 안에서
// 계속 이어져 켜지게 하기 위함이다
const ENTRANCE_SCROLL_VH = 400;
// 이 구간에서 서재 채우기(비교)가 진행되고, 마지막 일부는 "다 찬 상태로 잠깐
// 머무는" 여운 구간(LIBRARY_COMPLETION_DWELL)이다. 채우기 속도가 예전과 비슷하도록
// 여운을 더한 만큼 값을 잡는다.
const LIBRARY_SCROLL_VH = 150;
// 서재가 100% 찬 뒤, 고정(sticky)이 풀려 다음 섹션으로 넘어가기 전까지 남겨 두는
// 여운 구간의 비율(남은 스크롤 대비). 이 동안 상단/하단 문구가 다 보이고 '더
// 알아보기' 화살표가 깜빡이며, 완성 화면을 읽을 시간을 준다.
const LIBRARY_COMPLETION_DWELL = 0.2;
const TOTAL_SCROLL_VH = ENTRANCE_SCROLL_VH + LIBRARY_SCROLL_VH;
const ENTRANCE_PHASE_END = ENTRANCE_SCROLL_VH / TOTAL_SCROLL_VH;

const GATE_KF = {
  // 0.55→0.4 지점에서 최대 배율 도달(확대 속도↑), 최대 배율 1.5→7(로고가 화면을
  // 가득 채울 정도로 커짐).
  scale: [[0, 1], [0.4, 7], [1, 7]],
  opacity: [[0, 1], [0.4, 1], [0.58, 0], [1, 0]],
};
// 안내 문구("아래로 스크롤하여 서재 안으로 들어가세요")는 지붕·커튼·로고 그룹
// (GATE_KF.opacity, 0.58에서 완전히 사라짐)과 별개로 진행률 1(=리더기 부팅 시작,
// LoadingGuide "잠시만 기다려주세요"가 뜨는 시점)까지 계속 보이게 한다 — 그래야
// "스크롤 안내가 사라진 뒤 로딩 문구가 뜨기 전까지 아무 문구도 없는" 빈 구간이
// 생기지 않는다. 리더기(KF.readerOpacity 0.75~1, translateY로 떠오르는 구간
// 0.8~1)와 표시 구간이 겹치지만, 이 안내 문구는 화면 맨 아래 쪽(guideBottom,
// 뷰포트 높이의 대략 7%)에 있고 리더기는 그 아래로 최소
// READER_CAPTION_GAP+READER_CAPTION_RESERVE(150px)만큼 여백을 반드시 확보하도록
// 배치되므로(ReaderJourney의 rawMaxCenterY 계산 참고), 리더기가 다 떠오르기
// 전이라도 화면상 서로 겹치는 자리에 있지 않다 — 시간상으로만 겹치고 공간상으로는
// 겹치지 않는다.
const GUIDE_OPACITY_KF = [[0, 1], [0.85, 1], [1, 0]];
// 버튼 속으로 다가갈수록(스크롤 진행률↑) 커튼 줄이 11자로(위아래 구분 없이 나란히)
// 더 크게 벌어지도록 하는 0~1 정규화 계수 — 실제 픽셀 이동량은 maxSpreadPx를 곱해서 구한다
const CURTAIN_SPREAD_KF = [[0, 0], [0.4, 1], [1, 1]];

const KF = {
  whiteOpacity: [[0, 0], [0.3, 0.25], [0.5, 0.75], [0.6, 1], [1, 1]],
  libraryOpacity: [[0, 0], [0.55, 0], [0.7, 1], [1, 1]],
  libraryBlur: [[0.6, 12], [0.8, 4], [1, 0]],
  readerOpacity: [[0, 0], [0.75, 0], [0.9, 1], [1, 1]],
};

function WhiteTransitionLayer({ progress }) {
  return <div style={{ position: "absolute", inset: 0, background: COLOR.white, opacity: interpolateKeyframes(progress, KF.whiteOpacity), pointerEvents: "none" }} />;
}
function LibraryBackdrop({ progress, isMobile, stableViewportHeight }) {
  const opacity = interpolateKeyframes(progress, KF.libraryOpacity);
  const blur = interpolateKeyframes(progress, KF.libraryBlur);
  // 배경 사진은 고정(sticky) 컨테이너(100dvh)를 inset:0으로 채운다. 모바일에서
  // 주소창(검색창)이 나타났다 사라지며 그 컨테이너 높이가 바뀌면, background-size:
  // cover가 매번 이미지를 다시 맞춰(줌/이동) 배경이 움찔거린다. 그래서 모바일에서는
  // 배경 상자 자체의 높이를 "흔들리지 않는 높이"(주소창 접힌 최대 높이)로 고정하고
  // 상단에 앵커한다 — 주소창이 나타나 컨테이너가 짧아지면 배경 아래쪽이 살짝
  // 가려질 뿐(overflow:hidden), 이미지 프레이밍(cover 기준 크기)은 그대로여서
  // 배경이 확대·이동하지 않는다. 데스크톱은 주소창이 없어 종전대로 inset:0.
  const box =
    isMobile && stableViewportHeight
      ? { position: "absolute", top: 0, left: 0, right: 0, height: stableViewportHeight }
      : { position: "absolute", inset: 0 };
  return (
    <div
      className="silock-library-bg"
      style={{
        ...box,
        opacity,
        filter: `blur(${blur}px)`,
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.3) 35%, rgba(255,255,255,0.6) 100%), url(${libraryBGImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        pointerEvents: "none",
      }}
    />
  );
}
/**
 * 입구 연출 끝에 등장한 "그 리더기"가 페이지 전환 없이 같은 자리에서 계속
 * 이어져 부팅되고, 서재 비교 → 가치 제안 → CTA까지 진행되는 통합 컴포넌트.
 * (구 ReaderEntrance placeholder + 구 LibrarySection의 내부 콘텐츠를 통합)
 */
// 리더기 위(헤드라인)·아래(안내 문구/가치 설명/CTA)에 각각 필요한 간격·최대
// 높이(대략치, 여유 포함). 리더기를 화면 "정중앙"에 두더라도 이 두 영역만큼은
// 항상 위/아래에 확보해 둬야 sticky 컨테이너의 overflow:hidden 때문에 헤드라인이나
// CTA 버튼이 화면 밖으로 잘려나가지 않는다
const READER_TOP_MARGIN = 12;
const READER_HEADLINE_GAP = 18;
const READER_HEADLINE_RESERVE = 46;
const READER_CAPTION_GAP = 16;
const READER_CAPTION_RESERVE = 134;
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// 리더기 가로/세로 비율 — 기존 데스크톱 목업 비율(290×445)을 그대로 유지한다
const READER_ASPECT_RATIO = 290 / 445;
// 낮은 노트북에서도 하단 안내와 CTA가 실제 viewport 안에 들어오도록 허용하는
// 컴팩트 하한이다. 일반 화면에서는 사용 가능한 높이를 그대로 따라 더 커진다.
const READER_COMPACT_MIN_HEIGHT = { desktop: 280, mobile: 260 };
const READER_MAX_HEIGHT = { desktop: 680, mobile: 560 };

/**
 * 리더기 크기를 고정된 두 브레이크포인트(데스크톱/모바일 고정 px)가 아니라
 * 지금 화면 크기에 맞춰 동적으로 계산한다 헤드라인(위)·캡션(아래)이 항상
 * 필요로 하는 여백을 뺀 나머지를 리더기에 최대한 배분하면 — 화면이 낮은
 * 노트북에서는 리더기가 자동으로 작아지며 정중앙을 유지하고, 화면이 넉넉할
 * 때는 자동으로 커진다
 */
function computeReaderFrameSize(viewportWidth, viewportHeight, isMobile) {
  const minH = isMobile ? READER_COMPACT_MIN_HEIGHT.mobile : READER_COMPACT_MIN_HEIGHT.desktop;
  const maxH = isMobile ? READER_MAX_HEIGHT.mobile : READER_MAX_HEIGHT.desktop;
  const verticalReserve =
    2 *
    Math.max(
      READER_TOP_MARGIN + READER_HEADLINE_GAP + READER_HEADLINE_RESERVE,
      READER_CAPTION_GAP + READER_CAPTION_RESERVE
    );
  let height = clamp(viewportHeight - verticalReserve, minH, maxH);
  let width = height * READER_ASPECT_RATIO;
  const maxWidth = viewportWidth * (isMobile ? 0.78 : 0.36);
  if (width > maxWidth) {
    width = maxWidth;
    height = width / READER_ASPECT_RATIO;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

function ReaderJourney({
  entranceProgress,
  booting,
  bootDone,
  onBootComplete,
  comparisonProgress,
  scrollDirection,
  contentReveal,
  libraryGuideReveal,
  showCTA,
  onSurveyOpen,
  onExplore,
  ctaRef,
  isMobile,
  viewportHeight,
  viewportWidth,
  stableViewportHeight,
}) {
  const opacity = interpolateKeyframes(entranceProgress, KF.readerOpacity);
  // 리더기는 아래에서 위로 "떠오르며" 등장하지 않고, 제자리(readerCenterY 등, 이미
  // 안정 높이로 고정된 최종 위치)에서 오직 opacity로만 서서히 나타난다. 예전에는
  // translateY를 0.8~1 구간에서 40px→0으로 보간해 "떠오르는" 효과를 냈는데, 이
  // 오프셋이 entranceProgress(=실시간 스크롤 위치를 live viewportHeight로 나눠 구한
  // 값, EntranceSection의 measure() 참고)에서 바로 유도되다 보니, 모바일에서
  // 스크롤 중 주소창이 나타났다 사라지며 viewportHeight가 흔들릴 때마다 entranceProgress
  // 자체가 미세하게 들쭉날쭉해지고, 그만큼 translateY도 함께 흔들렸다. 리더기의
  // "기준 위치"는 이미 stableViewportHeight로 고정해 뒀지만 그 위에 얹힌 이
  // translateY 오프셋만은 안정화되지 않아서, 리더기·헤드라인·안내 문구가 함께
  // 미세하게 튀며 서로 겹쳐 보이는 원인이 됐다. 오프셋 자체를 없애 버리면 이 흔들림이
  // 발생할 여지가 아예 사라진다.
  // 헤드라인(위)이나 안내 문구/가치 설명/CTA(아래)가 나타나거나 사라져도 리더기
  // 자체의 위치는 절대 흔들리지 않도록, 리더기는 화면 중앙에 독립적으로 고정하고
  // 위/아래 텍스트 영역은 리더기 높이를 기준으로 "리더기로부터 고정 간격"에만
  // 배치한다 — 같은 flex 그룹으로 묶어 함께 가운데 정렬하면 콘텐츠 유무에 따라
  // 전체 그룹 높이가 바뀌면서 리더기까지 밀려 움직이기 때문이다
  // 모바일에서는 리더기 서재 화면 전체(리더기 크기 + 리더기·헤드라인·안내문구·CTA의
  // 세로 위치)를 "흔들리지 않는 높이"(주소창이 접힌 최대 높이)로 계산한다.
  // 사용자가 위로 스크롤하거나 화면을 살짝 건드려 주소창(검색창)이 나타나면
  // innerHeight가 줄어드는데, 이를 live로 쓰면 그 값에 묶인 리더기 크기와 모든
  // 세로 좌표가 다시 계산되어 서재 화면 전체가 위아래로 움찔거린다. 안정 높이로
  // 묶으면 주소창이 나타났다 사라져도 구성 요소들이 화면 위(top)로부터 같은 자리에
  // 그대로 있어 움직이지 않는다. 서재 구간은 아래로 스크롤해 들어오므로 이 시점의
  // 안정 높이는 이미 "주소창이 접힌" 실제 높이와 같다. 데스크톱은 주소창이 없어
  // 이 문제가 없으므로 종전대로 live viewportHeight를 그대로 쓴다.
  const layoutHeight = isMobile ? (stableViewportHeight ?? viewportHeight) : viewportHeight;
  const { width: frameWidth, height: frameHeight } = computeReaderFrameSize(
    viewportWidth,
    layoutHeight,
    isMobile
  );
  // 리더기를 화면 전체의 정중앙에 두되, 화면이 낮아 위쪽 헤드라인이나 아래쪽
  // 캡션(안내 문구/가치 설명/CTA)이 잘릴 상황에서만 그만큼 위/아래로 밀어 넣는다
  const minCenterY = frameHeight / 2 + READER_TOP_MARGIN + READER_HEADLINE_GAP + READER_HEADLINE_RESERVE;
  const rawMaxCenterY = layoutHeight - frameHeight / 2 - READER_CAPTION_GAP - READER_CAPTION_RESERVE;
  const maxCenterY = Math.max(minCenterY, rawMaxCenterY);
  const readerCenterY = clamp(layoutHeight / 2, minCenterY, maxCenterY);
  const readerBottomY = readerCenterY + frameHeight / 2;
  // CTA는 리더기 하단과 화면 하단의 중간, 안내 문구는 다시 그 둘의 중간에 둔다.
  // 콘텐츠의 표시 여부와 무관하게 좌표가 고정되어 등장할 때 레이아웃이 흔들리지 않는다.
  // 리더기 자체가 커지는 화면에서는 주변 문구도 같은 비율로 확대한다.
  // 모바일에서는 frameWidth 대신 viewportWidth를 기준으로 삼는다 — frameWidth는
  // 리더기 세로 여유 공간(viewportHeight)에 따라 계산되는데, 모바일은 스크롤
  // 중 주소창이 접혔다 펼쳐지며 viewportHeight가 계속 바뀌어 frameWidth가
  // 커졌다 작아졌다 한다. 헤드라인 문구(예: "Silock에서 구매한 콘텐츠,")는 한
  // 세그먼트라 줄바꿈되지 않으므로, frameWidth가 커지는 순간(예: 주소창이
  // 접혀 화면이 "꽉 찬" 상태) 폰트도 함께 커지면서 화면 밖으로 넘칠 수 있다.
  // viewportWidth는 실제 회전/리사이즈 때만 바뀌므로 이 문제가 없고, 0.075
  // 비율은 이 문구가 92vw 컨테이너 안에 항상 들어가도록 실측(Noto Serif KR
  // 700, 폭≈11.38×폰트크기) 기준으로 여유를 둔 값이다.
  const headlineFontSize = isMobile
    ? clamp(Math.round(viewportWidth * 0.075), 20, 30)
    : clamp(Math.round(frameWidth * 0.115), 26, 44);
  const guideFontSize = clamp(Math.round(frameWidth * 0.052), 13, 18);
  const ctaFontSize = guideFontSize;
  const ctaButtonHeight = clamp(Math.round(ctaFontSize * 2.7), 44, 54);
  const ctaPaddingInline = clamp(Math.round(ctaFontSize * 2.2), 30, 44);
  const headlineWidth = clamp(Math.round(frameWidth * 1.75), 360, 760);
  const guideWidth = clamp(Math.round(frameWidth * 1.55), 340, 680);
  const ctaCenterY = readerBottomY + (layoutHeight - readerBottomY) / 2;
  const ctaTopY = ctaCenterY - ctaButtonHeight / 2;
  const ctaBottomY = ctaCenterY + ctaButtonHeight / 2;
  // 안내 문구는 버튼 중심이 아니라 실제 버튼 윗면과 리더기 하단 사이의 정중앙에 둔다.
  const ctaGuideCenterY = (readerBottomY + ctaTopY) / 2;
  const exploreCenterY = (ctaBottomY + layoutHeight) / 2;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        pointerEvents: opacity > 0.05 ? "auto" : "none",
      }}
    >
      {/* 가득 찬 서재일 때 뜨는 리더기 상단 문구 — 화면 맨 위(0)와 리더기 상단
         가장자리 사이의 정중앙에 오도록, 그 중간값을 매번 다시 계산해 배치한다. */}
      <div
        style={{
          position: "absolute",
          top: (readerCenterY - frameHeight / 2) / 2,
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `min(${headlineWidth}px, 92vw)`,
        }}
      >
        <ValueHeadline reveal={contentReveal} isMobile={isMobile} fontSize={headlineFontSize} />
      </div>
      <div
        style={{
          position: "absolute",
          top: readerCenterY,
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <ReaderDevice
          booting={booting}
          bootDone={bootDone}
          onBootComplete={onBootComplete}
          comparisonProgress={comparisonProgress}
          width={frameWidth}
          height={frameHeight}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: ctaGuideCenterY,
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `min(${guideWidth}px, 90vw)`,
          display: "grid",
        }}
      >
        <LoadingGuide visible={booting && !bootDone} fontSize={guideFontSize} />
        <ComparisonGuide reveal={libraryGuideReveal} fontSize={guideFontSize} scrollDirection={scrollDirection} />
        <CTAGuide reveal={contentReveal} isMobile={isMobile} fontSize={guideFontSize} />
      </div>
      <div
        style={{
          position: "absolute",
          top: ctaCenterY,
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <SurveyCTA
          reveal={contentReveal}
          active={showCTA}
          onClick={onSurveyOpen}
          buttonRef={ctaRef}
          fontSize={ctaFontSize}
          height={ctaButtonHeight}
          paddingInline={ctaPaddingInline}
        />
      </div>
      <ExploreArrow
        reveal={contentReveal}
        active={showCTA}
        onClick={onExplore}
        top={exploreCenterY}
        fontSize={guideFontSize}
      />
    </div>
  );
}
// ============================================================
// 리더기가 등장했지만 아직 부팅을 시작하지 않은 "꺼짐" 상태 — 순수한 검은
// 화면만 보여준다(부팅 화면의 브랜드 마크·점 애니메이션과는 다른, 더 이른
// 단계).
// ============================================================
function ReaderOffScreen() {
  return <div style={readerOffStyles.wrap} />;
}
const readerOffStyles = {
  wrap: { position: "absolute", inset: 0, background: COLOR.black },
};

// ============================================================
// STEP4 : ReaderBootScreen (신규)
// ============================================================
function ReaderBootScreen({ onComplete, screenWidth, screenHeight }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete && onComplete(), 1400);
    return () => clearTimeout(t);
  }, [onComplete]);

  // 화면의 가로·세로 양쪽 한계에 맞춰 로고를 크게 스케일한다. 리더기 비율이
  // 달라져도 가로로 넘치거나 세로 콘텐츠를 밀어내지 않으면서 크기가 함께 변한다.
  const logoSize = clamp(
    Math.round(Math.min(screenWidth * 0.7, screenHeight * 0.44)),
    72,
    220
  );

  return (
    <div style={bootStyles.wrap}>
      <div style={bootStyles.mark}>
        <img src={entranceLogoImg} alt="Silock 로고" style={{ ...bootStyles.logoImg, width: logoSize, height: logoSize }} />
      </div>
      <div style={bootStyles.dots}>
        <span style={{ ...bootStyles.dot, animationDelay: "0ms" }} />
        <span style={{ ...bootStyles.dot, animationDelay: "160ms" }} />
        <span style={{ ...bootStyles.dot, animationDelay: "320ms" }} />
      </div>
    </div>
  );
}
const bootStyles = {
  wrap: { position: "absolute", inset: 0, background: COLOR.black, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, animation: "boot-brightness 1.4s ease-out forwards" },
  mark: { display: "flex", flexDirection: "column", alignItems: "center", animation: "mark-pop 700ms ease-out both" },
  logoImg: { objectFit: "contain" },
  dots: { display: "flex", gap: 6 },
  dot: { width: 5, height: 5, borderRadius: "50%", background: "#ffffff88", animation: "boot-dot 900ms ease-in-out infinite" },
};

// ============================================================
// STEP5/6 : EmptyLibrary / FilledLibrary / LibraryComparison (신규)
// ============================================================
/** 리더기 앱 화면 상단(홈/타이틀/검색/메뉴 + 전체·정렬 + 편집/선택 서브바)을 텅 빈
 * 서재와 가득 찬 서재가 동일하게 공유한다 — 비교 스와이프 중에도 헤더가 흔들리거나
 * 바뀌지 않고, 그 아래 본문 영역만 바뀌는 것처럼 보이게 하기 위함이다 */
function LibraryScreenChrome({ totalCount, pageLabel = "1 / 1", children }) {
  return (
    <div style={libStyles.screenBase}>
      <div style={libStyles.topBar}>
        <div style={libStyles.topBarLeft}>
          <HomeGlyph />
          <span style={libStyles.screenTitle}>내 서재</span>
        </div>
        <div style={libStyles.topBarRight}>
          <SearchGlyph />
          <MenuGlyph />
        </div>
      </div>
      <div style={libStyles.subBar}>
        <div style={libStyles.subBarLeft}>
          <span>전체 {totalCount}</span>
          <span style={libStyles.subBarDivider} />
          <span>최근 읽은 책</span>
        </div>
        <div style={libStyles.subBarRight}>
          <span>편집</span>
          <span>선택</span>
        </div>
      </div>
      <div style={libStyles.divider} />
      {children}
      <div style={libStyles.pageIndicator}>{pageLabel}</div>
    </div>
  );
}

function HomeGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M4 11L12 4l8 7M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" stroke={COLOR.black} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SearchGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={COLOR.black} strokeWidth="1.8" />
      <path d="M20 20l-4.35-4.35" stroke={COLOR.black} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function MenuGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h16M4 18h16" stroke={COLOR.black} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function DeletedDocGlyph({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 3h6l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill={COLOR.white} stroke={COLOR.black} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9 10.5h6M9 13.5h6M9 16.5h3" stroke={COLOR.neutralGray} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="17.5" cy="18.5" r="4" fill={COLOR.white} stroke={COLOR.black} strokeWidth="1.3" />
      <path d="M16 17l3 3M19 17l-3 3" stroke={COLOR.black} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function EmptyLibrary({ screenWidth, screenHeight }) {
  // 리더기 화면 크기에 비례해 "삭제된 콘텐츠" 아이콘/문구 크기를 정한다 — 고정 px로
  // 두면 리더기가 커지는 화면에서 유독 작아 보인다.
  const minSide = Math.min(screenWidth, screenHeight);
  const glyphSize = clamp(Math.round(minSide * 0.28), 42, 96);
  const titleSize = clamp(Math.round(minSide * 0.1), 17, 28);
  return (
    <LibraryScreenChrome totalCount={0}>
      <div style={libStyles.emptyBody}>
        <div style={libStyles.emptyBox}>
          <DeletedDocGlyph size={glyphSize} />
          <p style={{ ...libStyles.emptyBoxTitle, fontSize: titleSize }}>삭제된 콘텐츠</p>
        </div>
      </div>
    </LibraryScreenChrome>
  );
}

/** vol.01 표지 — 원과 반원/점이 결합된 페이즐리형 모노그램 */
function PaisleyGlyph({ accent }) {
  return (
    <svg width="20" height="26" viewBox="0 0 32 44" fill="none">
      <path d="M16 2a12 12 0 1 1 -8.5 20.49" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7.5 22.5V33a6 6 0 0 0 6 6h6" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="27" r="3.2" fill={accent} />
    </svg>
  );
}
/** vol.02 표지 — 사각 프레임 + 모서리 크롭 마크 */
function FrameGlyph({ accent }) {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
      <rect x="7" y="7" width="18" height="18" stroke={accent} strokeWidth="1.2" />
      <path
        d="M7 3v3M7 3h3M25 3v3M25 3h-3M7 29v-3M7 29h3M25 29v-3M25 29h-3"
        stroke={accent}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
/** vol.03 표지 — 세로선 하나만으로 이루어진 미니멀 모노그램 */
function LineGlyph({ accent }) {
  return (
    <svg width="6" height="28" viewBox="0 0 6 28" fill="none">
      <line x1="3" y1="0" x2="3" y2="28" stroke={accent} strokeWidth="1.4" />
    </svg>
  );
}
/** vol.04 표지 — 삼각형 외곽선 하나로 이루어진 미니멀 모노그램 */
function TriangleGlyph({ accent }) {
  return (
    <svg width="22" height="20" viewBox="0 0 32 28" fill="none">
      <path d="M16 2L30 26H2Z" stroke={accent} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

const FILLED_BOOKS = [
  { label: "vol.01", bg: "#ECE0CE", accent: "#8A6248", textColor: "rgba(90,58,34,0.85)", Icon: PaisleyGlyph },
  { label: "vol.02", bg: "#6C7159", accent: "#D8D3BC", textColor: "rgba(255,255,255,0.92)", Icon: FrameGlyph },
  { label: "vol.03", bg: "#1E2A3D", accent: "#FFFFFF", textColor: "rgba(255,255,255,0.92)", Icon: LineGlyph },
  { label: "vol.04", bg: "#4A5A63", accent: "#E4DCC9", textColor: "rgba(255,255,255,0.92)", Icon: TriangleGlyph },
];

function FilledBookCover({ book, index }) {
  const Icon = book.Icon;
  return (
    <div
      style={{
        ...libStyles.bookCover,
        background: book.bg,
        animation: `book-in 420ms ease-out both`,
        animationDelay: `${index * 70}ms`,
      }}
    >
      <div style={libStyles.bookIconWrap}>
        <Icon accent={book.accent} />
      </div>
      <div style={libStyles.bookFooter}>
        <span style={{ ...libStyles.bookVol, color: book.textColor }}>{book.label}</span>
        <span style={{ ...libStyles.bookWordmark, color: book.textColor }}>silock</span>
      </div>
    </div>
  );
}

function FilledLibrary() {
  return (
    <LibraryScreenChrome totalCount={1000} pageLabel="1 / 200">
      <div style={libStyles.bookGridWrap}>
        <div style={libStyles.bookGrid}>
          {FILLED_BOOKS.map((book, i) => (
            <FilledBookCover key={book.label} book={book} index={i} />
          ))}
        </div>
      </div>
    </LibraryScreenChrome>
  );
}

/** 페이지 스크롤 진행률(0~1)에 1:1 대응하는 비교 컴포넌트 — 마우스/터치 조작이 아닌
 * 상위(EntranceSection/ReaderJourney)에서 전달되는 스크롤 진행률에 따라서만 화면이 바뀐다 */
function LibraryComparison({ progress, screenWidth, screenHeight }) {
  return (
    <div style={libStyles.comparisonArea}>
      <EmptyLibrary screenWidth={screenWidth} screenHeight={screenHeight} />
      <div style={{ ...libStyles.filledMask, clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}>
        <FilledLibrary />
      </div>
      {/* 진행률 확인용 시각 인디케이터 (실제 배포 시 제거 가능) */}
      <div style={{ ...libStyles.sweepLine, left: `${progress * 100}%` }} />
    </div>
  );
}

const libStyles = {
  screenBase: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: COLOR.white, overflow: "hidden" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 18px 8px", flexShrink: 0 },
  topBarLeft: { display: "flex", alignItems: "center", gap: 8 },
  screenTitle: { fontSize: 18, fontWeight: 800, color: COLOR.black, letterSpacing: "-0.01em" },
  topBarRight: { display: "flex", alignItems: "center", gap: 14 },
  subBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px 10px", fontSize: 12, color: "#9a9a9a", flexShrink: 0 },
  subBarLeft: { display: "flex", alignItems: "center", gap: 9 },
  subBarDivider: { width: 1, height: 12, background: "#dcdcdc" },
  subBarRight: { display: "flex", alignItems: "center", gap: 12, color: "#5a5a5a", fontWeight: 600 },
  divider: { height: 1, background: "#ececec", margin: "0 12px", flexShrink: 0 },
  emptyBody: { flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 14px" },
  emptyBox: { width: "100%", height: "100%", borderRadius: 10, border: `1.3px dashed ${COLOR.neutralGray}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 },
  emptyBoxTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: COLOR.black },
  pageIndicator: { textAlign: "center", fontSize: 8, color: "#b8b8b8", padding: "5px 0 9px", flexShrink: 0 },
  bookGridWrap: { flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 20px", overflow: "hidden" },
  // 2×2 책 그리드가 리더기 화면의 남은 세로 공간(상단 바·페이지 표시를 뺀 영역)을
  // 절대 넘지 않도록 "contain"으로 배치한다. 예전에는 그리드 폭(width:100%)과 각
  // 표지의 aspectRatio만으로 높이가 정해져, 화면이 낮은 모바일에서 2행 높이가
  // 남은 공간보다 커지면 위/아래로 넘쳐 상단 두 권의 윗부분·하단 두 권의 아랫부분이
  // 잘렸다. 이제 그리드 자체에 높이(100%)와 2×2 비율(6:8.2 = 2*3 : 2*4.1)을 주고
  // maxWidth/maxHeight로 가두면, 세로가 부족하면 높이에 맞춰 폭이 함께 줄며 항상
  // 온전히 들어간다(가로 중앙 정렬).
  bookGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gridTemplateRows: "repeat(2, 1fr)",
    gap: "10px 12px",
    height: "100%",
    aspectRatio: "6 / 8.2",
    maxWidth: "100%",
    maxHeight: "100%",
  },
  bookCover: {
    width: "100%",
    height: "100%",
    minHeight: 0,
    borderRadius: 4,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "8px 7px 6px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.14)",
  },
  bookIconWrap: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  bookFooter: { display: "flex", flexDirection: "column", gap: 2 },
  bookVol: { fontSize: 7, fontWeight: 600, letterSpacing: "0.02em" },
  bookWordmark: { fontSize: 8, fontWeight: 800, letterSpacing: "0.01em" },
  comparisonArea: { position: "absolute", inset: 0, pointerEvents: "none" },
  filledMask: { position: "absolute", inset: 0, willChange: "clip-path" },
  sweepLine: { position: "absolute", top: 0, bottom: 0, width: 2, background: COLOR.orange, opacity: 0.5, pointerEvents: "none", transform: "translateX(-1px)" },
};

// ============================================================
// STEP7 : ValueProposition / SurveyCTA (신규)
// ============================================================
function LoadingGuide({ visible, fontSize }) {
  return (
    <div style={{ ...guideStyles.wrap, fontSize, opacity: visible ? 1 : 0 }}>
      잠시만 기다려주세요
    </div>
  );
}

function ComparisonGuide({ reveal, fontSize, scrollDirection }) {
  return (
    <div style={{ ...guideStyles.wrap, fontSize, opacity: reveal, pointerEvents: reveal > 0.05 ? "auto" : "none" }}>
      {scrollDirection === "up" ? (
        <>
          <span className="silock-copy-segment">위로 스크롤하여</span>{" "}
          <span className="silock-copy-segment">서재의 변화를 확인하세요</span>
        </>
      ) : (
        <>
          <span className="silock-copy-segment">아래로 스크롤하여</span>{" "}
          <span className="silock-copy-segment">서재의 변화를 확인하세요</span>
        </>
      )}
    </div>
  );
}
const guideStyles = {
  wrap: {
    gridArea: "1 / 1",
    color: COLOR.black,
    textAlign: "center",
    marginTop: 0,
    transition: "opacity 300ms ease-out"
  },
};

/** 리더기 "위"에 크게 띄우는 헤드라인 — 리더기 위치와 마찬가지로 나타나거나
 * 사라져도 리더기를 밀어내지 않도록 리더기와는 별개의 절대 위치 영역에서
 * opacity만 토글한다 */
// 웹(데스크톱)에서는 한 줄로, 앱(모바일)에서는 지정된 지점에서만 줄바꿈되도록
// 두 세그먼트로 나눠 두고 isMobile일 때만 그 사이에 <br/>을 넣는다 — 문장 폭에
// 따라 브라우저가 임의의 지점에서 어색하게 줄바꿈하는 것을 막기 위함이다
function ValueHeadline({ reveal, isMobile, fontSize }) {
  return (
    <h3
      style={{
        ...valueStyles.headline,
        fontSize,
        opacity: reveal,
        transform: `translateY(${(1 - reveal) * 8}px)`,
      }}
    >
      <span className="silock-copy-segment">Silock에서 구매한 콘텐츠,</span>
      {isMobile ? <br /> : " "}
      <span className="silock-copy-segment">사라지지 않습니다</span>
    </h3>
  );
}
// 참여하기 버튼 바로 위 안내 슬롯 — 좌우 비교 안내(ComparisonGuide)가 끝난 자리를
// 이어받아, 버튼을 누르면 무엇을 할 수 있는지(설문 참여 / 오픈 알림) 안내한다.
function CTAGuide({ reveal, fontSize }) {
  return (
    <p
      style={{
        ...valueStyles.sub,
        fontSize,
        opacity: reveal,
        transform: `translateY(${(1 - reveal) * 8}px)`,
      }}
    >
      <span className="silock-copy-segment">설문에 참여하고</span>{" "}
      <span className="silock-copy-segment">오픈 알림을 신청해보세요</span>
    </p>
  );
}
const valueStyles = {
  headline: {
    margin: 0,
    fontFamily: "'Noto Serif KR', serif",
    fontWeight: 700,
    color: COLOR.white,
    lineHeight: 1.32,
    letterSpacing: "-0.025em",
    textAlign: "center",
    transition: "opacity 400ms ease-out, transform 400ms ease-out",
  },
  sub: {
    gridArea: "1 / 1",
    margin: 0,
    color: COLOR.white,
    lineHeight: 1.4,
    textAlign: "center",
    transition: "opacity 400ms ease-out, transform 400ms ease-out",
  },
};

function SurveyCTA({ reveal, active, onClick, buttonRef, fontSize, height, paddingInline }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={!active}
      style={{
        ...ctaStyles.button,
        height,
        paddingInline,
        fontSize,
        opacity: reveal,
        transform: `translateY(${(1 - reveal) * 14}px)`,
        pointerEvents: active ? "auto" : "none",
      }}
    >
      참여하기
      <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function ExploreArrow({ reveal, active, onClick, top, fontSize }) {
  const iconSize = fontSize + 5;
  return (
    <button
      type="button"
      className="silock-explore-arrow"
      onClick={onClick}
      aria-label="브랜드 이야기로 이동"
      disabled={!active}
      style={{
        ...ctaStyles.exploreArrow,
        top,
        fontSize,
        opacity: reveal,
        pointerEvents: active ? "auto" : "none",
        transform: `translate(-50%, -50%) translateY(${(1 - reveal) * -6}px)`,
      }}
    >
      <span>더 알아보기</span>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
const ctaStyles = {
  button: {
    margin: 0,
    paddingBlock: 0,
    borderRadius: 999,
    border: "none",
    background: COLOR.white,
    color: COLOR.orange,
    lineHeight: 1.3,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.55em",
    cursor: "pointer",
    transition: "opacity 400ms ease-out, transform 400ms ease-out, box-shadow 200ms",
    boxShadow: `0 10px 24px ${COLOR.orange}4d`,
  },
  exploreArrow: {
    position: "absolute",
    left: "50%",
    zIndex: 4,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    border: 0,
    background: "transparent",
    color: COLOR.white,
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 400ms ease-out, transform 400ms ease-out, color 180ms ease",
  },
};

// ============================================================
// ReaderDevice + LibrarySection (신규)
// ============================================================
// 리더기 크기가 화면에 따라 동적으로 바뀌므로, 테두리 둥글기·안쪽 여백도
// 크기에 비례해 함께 스케일한다 — 고정값을 쓰면 리더기가 작아졌을 때 여백이
// 과하게 두꺼워 보이거나, 커졌을 때 상대적으로 너무 얇아 보인다
function ReaderDevice({ booting, bootDone, onBootComplete, comparisonProgress, width, height }) {
  const radius = clamp(Math.round(height * 0.063), 18, 34);
  const padTop = clamp(Math.round(height * 0.04), 12, 24);
  const padSide = clamp(Math.round(width * 0.048), 10, 20);
  const padBottom = clamp(Math.round(height * 0.067), 18, 36);
  // 부팅 로고·서재 화면 내부 아이콘 크기를 실제 화면(패딩·홈버튼을 뺀 안쪽) 크기에
  // 비례시키기 위한 근사치.
  const screenWidth = width - padSide * 2;
  const screenHeight = height - padTop - padBottom - 22;
  return (
    <div
      style={{
        ...readerStyles.frame,
        width,
        height,
        borderRadius: radius,
        padding: `${padTop}px ${padSide}px ${padBottom}px`,
      }}
    >
      <div style={readerStyles.screen}>
        {bootDone ? (
          <div style={readerStyles.powerOnScreen}>
            <LibraryComparison progress={comparisonProgress} screenWidth={screenWidth} screenHeight={screenHeight} />
          </div>
        ) : booting ? (
          <ReaderBootScreen onComplete={onBootComplete} screenWidth={screenWidth} screenHeight={screenHeight} />
        ) : (
          // 서재 진입 직후 리더기가 막 등장했을 때는 아직 부팅 전 — 서재 목록이
          // 아니라 아직 켜지지 않은 검은 화면으로 보여야 자연스럽다
          <ReaderOffScreen />
        )}
      </div>
      <div style={readerStyles.homeButton} />
    </div>
  );
}
const readerStyles = {
  frame: {
    border: `2px solid ${COLOR.black}`, background: COLOR.white,
    boxShadow: "0 30px 60px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", alignItems: "center",
  },
  screen: { position: "relative", width: "100%", flex: 1, borderRadius: 10, overflow: "hidden", background: COLOR.black, border: `1px solid ${COLOR.neutralGray}` },
  powerOnScreen: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    background: COLOR.black,
    transformOrigin: "center",
    animation: "screen-power-on 860ms cubic-bezier(0.22, 1, 0.36, 1) both",
  },
  homeButton: { marginTop: 12, width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${COLOR.neutralGray}` },
};

// 진행률(0~1, 리더기 구간 로컬 기준) 구간별로 무엇이 바뀌는지 정의한다
//  - comparison: 빈 서재(0) → 가득 찬 서재(1)로 채워지는 구간
//  - contentRevealStart~contentRevealAt: 완성 화면의 문구·버튼이 서서히 나타나는
//    비교 진행률 구간(70%에서 나타나기 시작해 90%에서 완전히 보인다)
const LIBRARY_KF = {
  comparison: [[0.08, 0], [0.55, 1]],
  contentRevealStart: 0.7,
  contentRevealAt: 0.9,
};

// ============================================================
// STEP9/10 : SurveyModal (신규)
// ============================================================
// 실제 프로젝트에서는 임베드 가능한 Google Form 링크로 교체하세요.
// (Google Form은 "응답 수집" 켠 상태에서 우측 상단 "보내기" → <> 아이콘 → embed src 사용)
const GOOGLE_FORM_URL = "https://forms.gle/sosezTVEbgmTi3WF6";
// 완료 판정은 iframe 로드 감지(자동)가 아니라 사용자가 "제출을 완료했어요"
// 버튼을 직접 누르는 것으로만 처리한다 — cross-origin iframe이라 실제 제출
// 여부를 코드로 알 수 없어, 자동 감지는 설문을 열거나 폼 내부 페이지를 이동만
// 해도 완료로 오인되는 오류가 있었다.
//
// 키를 _v3로 올린 이유: 과거 자동 감지 버전들(원본 키 silock_survey_completed,
// 로드 횟수/체류 시간 휴리스틱을 쓰던 _v2)이 실제 참여하지 않은 방문자에게도
// 완료 플래그를 잘못 저장해 두었다. 키를 새로 부여하면 그 잘못된 값 전체가
// 무시(=전원 리셋)되어, 설문을 열어보기만 했던 사람도 다시 참여할 수 있다.
// 이제 완료는 버튼 클릭으로만 저장되므로 오탐이 재발하지 않는다.
const SURVEY_COMPLETED_STORAGE_KEY = "silock_survey_completed_v3";

function readSurveyCompleted() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SURVEY_COMPLETED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveSurveyCompleted() {
  try {
    window.localStorage.setItem(SURVEY_COMPLETED_STORAGE_KEY, "true");
  } catch {
    // 저장소가 차단된 환경에서는 현재 세션의 React 상태만 사용한다.
  }
}

function ModalBackdrop() {
  return <div style={modalStyles.backdrop} />;
}

function GoogleFormEmbed({ formUrl, onLoad, onError }) {
  return (
    <iframe
      title="Silock 설문 참여"
      src={formUrl}
      onLoad={onLoad}
      onError={onError}
      loading="lazy"
      className="silock-survey-iframe"
      style={modalStyles.iframe}
    />
  );
}

function FormFallback({ formUrl }) {
  return (
    <div style={modalStyles.fallback}>
      <p style={modalStyles.fallbackText}>
        불러오지 못했습니다
        <br />
        네트워크 상태를 확인하거나 새 창에서 열어 주세요
      </p>
      <a href={formUrl.replace("&embedded=true", "")} target="_blank" rel="noreferrer" style={modalStyles.fallbackLink}>
        새 창에서 참여하기
      </a>
    </div>
  );
}

/**
 * SurveyModal
 * - open일 때만 렌더링. 열리면 첫 포커스 가능한 요소로 포커스 이동.
 * - Tab/Shift+Tab은 모달 내부에서만 순환(포커스 트랩).
 * - ESC로 닫힘. 바깥 영역 클릭으로는 닫히지 않음(스펙 반영).
 * - 배경 스크롤은 열려있는 동안 잠금(상위에서 처리).
 */
function SurveyModal({ open, onClose, onComplete, returnFocusRef }) {
  const containerRef = useRef(null);
  const [formStatus, setFormStatus] = useState("loading"); // loading | loaded | error
  const errorTimerRef = useRef(null);

  // open이 true로 바뀌는 렌더에서 곧바로 "loading"으로 되돌린다 — 이 컴포넌트는
  // 항상 마운트되어 있고 open prop만 바뀌므로, 이전 제출 결과(loaded/error)가
  // 다음에 열 때도 남아있지 않도록 렌더 중에 상태를 맞춘다
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setFormStatus("loading");
  }

  useEffect(() => {
    if (!open) return;
    // Google Form은 onError가 잘 안 잡히는 경우가 있어, 일정 시간 내 onLoad가 없으면 폴백 노출
    const t = setTimeout(() => {
      setFormStatus((s) => (s === "loading" ? "error" : s));
    }, 6000);
    errorTimerRef.current = t;
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const focusables = () =>
      container ? container.querySelectorAll('button, a[href], iframe, [tabindex]:not([tabindex="-1"])') : [];

    const first = focusables()[0];
    first && first.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const els = Array.from(focusables());
        if (els.length === 0) return;
        const firstEl = els[0];
        const lastEl = els[els.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const returnEl = returnFocusRef && returnFocusRef.current;
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      returnEl && returnEl.focus();
    };
  }, [open, onClose, returnFocusRef]);

  if (!open) return null;

  return (
    <div style={modalStyles.overlay} className="silock-modal-overlay">
      <ModalBackdrop />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-modal-title"
        className="silock-modal-container"
        style={modalStyles.container}
      >
        <div style={modalStyles.header}>
          <div style={modalStyles.brandGroup}>
            <KeyholeSquareIcon size={34} filled />
            <div>
              <span id="survey-modal-title" style={modalStyles.title}>설문 참여</span>
              <p style={modalStyles.meta}>약 3분 · Google Forms로 응답 수집</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" style={modalStyles.closeBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 5l14 14M19 5L5 19" stroke={COLOR.black} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="silock-survey-trust" style={modalStyles.trustBar}>
          <span style={modalStyles.providerBadge}>GOOGLE FORMS</span>
          <span>응답은 서비스 수요 검증과 MVP 우선순위 결정에만 사용됩니다</span>
        </div>

        <div style={modalStyles.body} className="silock-modal-body">
          {formStatus === "error" ? (
            <FormFallback formUrl={GOOGLE_FORM_URL} />
          ) : (
            <>
              {formStatus === "loading" && <div style={modalStyles.loadingHint}>불러오는 중…</div>}
              <GoogleFormEmbed
                formUrl={GOOGLE_FORM_URL}
                onLoad={() => {
                  // iframe onLoad는 최초 표시·폼 내부 페이지 이동·재렌더에서도
                  // 발생하므로, 이것만으로는 "제출 완료"를 신뢰성 있게 구분할 수
                  // 없다(cross-origin이라 확인 화면인지 확인 불가). 그래서 완료
                  // 판정은 자동 감지가 아니라 사용자가 아래 "제출을 완료했어요"
                  // 버튼을 직접 누르는 것으로만 처리한다 — 여기서는 로딩/에러
                  // 상태만 갱신한다.
                  setFormStatus("loaded");
                  if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
                }}
                onError={() => setFormStatus("error")}
              />
            </>
          )}
        </div>

        <div style={modalStyles.actionBar} className="silock-survey-actionbar">
          <span style={modalStyles.actionHint}>설문 제출까지 마치셨나요?</span>
          <button type="button" onClick={onComplete} style={modalStyles.confirmBtn}>
            제출을 완료했어요
          </button>
        </div>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: { position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" },
  backdrop: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", animation: "modal-backdrop-in 300ms ease-out" },
  container: {
    position: "relative", background: COLOR.white,
    minHeight: 0, boxShadow: "0 30px 80px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", overflow: "hidden",
    animation: "modal-pop-in 260ms ease-out",
  },
  header: { minHeight: 74, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, padding: "12px 18px", borderBottom: `1px solid ${COLOR.neutralGray}` },
  brandGroup: { minWidth: 0, display: "flex", alignItems: "center", gap: 13 },
  title: { display: "block", fontSize: 15, fontWeight: 800, color: COLOR.black, lineHeight: 1.3 },
  meta: { margin: "4px 0 0", color: "#777", fontSize: 11, lineHeight: 1.4 },
  closeBtn: { width: 32, height: 32, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", cursor: "pointer", borderRadius: 8 },
  trustBar: { minHeight: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "8px 18px", background: "#FFF7F0", borderBottom: "1px solid rgba(255,106,0,0.16)", color: "#5E4A3D", fontSize: 11, lineHeight: 1.45, textAlign: "center" },
  providerBadge: { flexShrink: 0, padding: "4px 7px", border: "1px solid rgba(255,106,0,0.38)", color: COLOR.orange, fontSize: 9, fontWeight: 900, lineHeight: 1, letterSpacing: "0.08em" },
  body: { position: "relative", flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" },
  iframe: { width: "100%", height: "100%", minHeight: 0, flex: "1 1 0", border: "none" },
  loadingHint: { position: "absolute", top: 18, left: 18, fontSize: 12, color: "#9a9a9a" },
  fallback: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "40px 12px", textAlign: "center" },
  fallbackText: { fontSize: 13, color: "#666", lineHeight: 1.6, margin: 0 },
  fallbackLink: { padding: "10px 20px", borderRadius: 999, background: COLOR.orange, color: COLOR.white, fontSize: 13, fontWeight: 700, textDecoration: "none" },
  actionBar: { flexShrink: 0, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px 14px", padding: "12px 18px", borderTop: `1px solid ${COLOR.neutralGray}`, background: COLOR.white },
  actionHint: { color: "#777", fontSize: 12, lineHeight: 1.4 },
  confirmBtn: { flexShrink: 0, padding: "10px 20px", border: "none", borderRadius: 999, background: COLOR.orange, color: COLOR.white, fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", cursor: "pointer" },
};

const BRAND_VALUES = [
  {
    number: "01",
    title: "지속 소장",
    description: "Silock에서 구매한 콘텐츠를 서비스나 판매 계약이 종료된 이후에도 계속 만날 수 있도록 설계합니다",
    descriptionSegments: [
      ["Silock에서 구매한 콘텐츠를", "서비스나 판매 계약이 종료된 이후에도", "계속 만날 수 있도록 설계합니다"],
    ],
  },
  {
    number: "02",
    title: "안심 구매",
    description: "구매한 작품이 사라질 걱정을 덜고 콘텐츠를 안심하고 소장할 수 있습니다",
    descriptionSegments: [
      ["구매한 작품이 사라질 걱정을 덜고", "콘텐츠를 안심하고 소장할 수 있습니다"],
    ],
  },
  {
    number: "03",
    title: "자유로운 판매",
    description: "창작자는 누구나 작품을 직접 등록하고 자신의 콘텐츠를 원하는 독자에게 자유롭게 판매할 수 있습니다",
    descriptionSegments: [
      ["창작자는 누구나 작품을 직접 등록하고", "자신의 콘텐츠를 원하는 독자에게", "자유롭게 판매할 수 있습니다"],
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: "Silock 서비스가 종료된 뒤에도 볼 수 있나요?",
    answer: "네\n그 점이 Silock의 핵심 목표입니다 구체적인 저장 방식과 접근 구조 등은 여러분의 의견을 바탕으로 검증하고 있습니다",
    answerSegments: [
      ["네"],
      ["그 점이 Silock의 핵심 목표입니다"],
      ["구체적인 저장 방식과 접근 구조 등은", "여러분의 의견을 바탕으로 검증하고 있습니다"],
    ],
    // "네"는 뒷 문장과 폭에 따라 같은 줄에 붙어 보일 수 있어, 항상 단독 줄로
    // 떨어지도록 첫 문장 뒤에만 강제 줄바꿈을 넣는다(다른 문항의 문장 사이
    // 줄바꿈은 화면 폭에 따라 자연스럽게 정해지도록 그대로 둔다).
    breakAfter: [0],
  },
  {
    question: "다른 플랫폼에서 구매한 콘텐츠도 가져올 수 있나요?",
    answer: "아니요 지속 소장은 Silock 내의 콘텐츠에만 적용됩니다 다른 플랫폼의 구매 내역이나 콘텐츠를 가져와 보관하는 서비스는 아닙니다",
    answerSegments: [
      ["아니오"],
      ["지속 소장은 Silock에서 구매하신", "디지털 콘텐츠에만 적용됩니다"],
      ["다른 플랫폼의 구매 내역이나 콘텐츠를", "가져와 보관하는 서비스는 아닙니다"],
    ],
    breakAfter: [0],
  },
  {
    question: "어떤 콘텐츠를 지원하나요?",
    answer: "웹툰, 웹소설, 전자책 등 글·그림으로 구성된 디지털 창작물을 지원할 예정입니다",
    answerSegments: [
      ["웹툰, 웹소설, 전자책 등", "글·그림으로 구성된"],
      ["다양한 디지털 창작물을 지원할 예정입니다"],
    ],
  },
  {
    question: "지금은 어느 단계인가요?",
    answer: "고객의 실제 불편함과 서비스에 대한 수요를 확인하기 위한 초기 시장 검증 단계입니다 설문 결과는 Silock의 우선순위 결정에 중요한 참고 자료로 활용됩니다",
    answerSegments: [
      ["고객의 실제 불편함과 서비스에 대한 수요를", "확인하기 위한 초기 시장 검증 단계입니다"],
      ["설문 결과는 Silock의 우선순위 결정에", "중요한 참고 자료로 활용됩니다"],
    ],
  },
];

// sentences의 각 문장 그룹은 기본적으로 공백으로 이어붙어, 화면 폭에 따라 자연스러운
// 지점에서 줄바꿈된다(하나의 문장을 여러 그룹으로 쪼개 놓은 경우가 많아, 그룹 사이를
// 항상 강제로 끊으면 오히려 한 문장이 부자연스럽게 잘린다). breakAfter에 문장
// 인덱스를 넣으면 그 문장 뒤에서만 예외적으로 항상 줄을 바꾼다 — "네"/"아니오"처럼
// 그 자체로 독립된 한 단어짜리 문장을 뒷 문장과 폭에 따라 붙었다 떨어졌다 하지 않고
// 항상 단독 줄에 두고 싶을 때 쓴다.
function MeaningfulCopy({ sentences, breakAfter = [] }) {
  return sentences.map((phrases, sentenceIndex) => (
    <Fragment key={`${sentenceIndex}-${phrases.join("-")}`}>
      <span className="silock-sentence-segment">
        {phrases.map((phrase, phraseIndex) => (
          <Fragment key={`${phraseIndex}-${phrase}`}>
            <span className="silock-copy-segment">{phrase}</span>
            {phraseIndex < phrases.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
      {sentenceIndex < sentences.length - 1
        ? breakAfter.includes(sentenceIndex)
          ? <br />
          : " "
        : null}
    </Fragment>
  ));
}

function BrandConceptMotion() {
  const crowd = [28, 34, 30, 38, 32, 36, 27, 33];
  const travelers = [0, 1, 2, 3, 4];

  // 이 블록에는 무한 반복 애니메이션이 여러 개 있고, 그중 일부는 drop-shadow/
  // box-shadow를 애니메이션해 매 프레임 다시 그리기(repaint)를 유발한다. 화면
  // 밖에 있는 동안에도 계속 돌면 저사양 폰에서 서재→설명 페이지로 넘어가는
  // 스크롤이 버벅인다. 뷰포트에 들어와 있을 때만 애니메이션을 재생하고, 벗어나면
  // 일시정지(animation-play-state: paused)해 그리기 비용을 없앤다.
  const motionRef = useRef(null);
  useEffect(() => {
    const el = motionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("in-view");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => el.classList.toggle("in-view", entry.isIntersecting),
      { rootMargin: "200px 0px" } // 완전히 도달하기 직전에 미리 켜 둔다
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={motionRef}
      className="silock-concept-motion"
      aria-label="소장을 원하는 독자와 창작자가 Silock 플랫폼의 연결 입구를 통과해 각자의 서재로 이어지는 지속 소장 과정"
    >
      <div className="silock-motion-stage" aria-hidden="true">
        <div className="silock-crowd-glow" />
        <div className="silock-symbol-crowd">
          {crowd.map((size, index) => (
            <span
              key={`${size}-${index}`}
              className="silock-symbol-person"
              style={{ animationDelay: `${index * 130}ms` }}
            >
              <BrandGlyphAsset size={size} tone="orange" />
            </span>
          ))}
        </div>

        <div className="silock-queue-line" />
        <div className="silock-queue-arrow silock-queue-arrow-before">→</div>
        <div className="silock-queue-arrow silock-queue-arrow-after">→</div>

        <div className="silock-traveler-lane">
          {travelers.map((traveler) => (
            <span
              key={traveler}
              className="silock-symbol-traveler"
              style={{ animationDelay: `${traveler * 0.92}s` }}
            >
              <BrandGlyphAsset size="var(--person-size)" tone="orange" />
            </span>
          ))}
        </div>

        <div className="silock-archive-gate">
          <span className="silock-gate-ripple" />
          <span className="silock-gate-hole">
            <BrandGlyphAsset size="var(--person-size)" tone="black" />
          </span>
          <span className="silock-gate-brand">SILOCK</span>
        </div>

        <div className="silock-library-destination">
          <span className="silock-library-label">MY LIBRARY</span>
          <span className="silock-library-shelf silock-library-shelf-top">
            <i /><i /><i /><i />
          </span>
          <span className="silock-library-shelf silock-library-shelf-bottom">
            <i /><i /><i /><i /><i />
          </span>
        </div>

        <div className="silock-motion-caption silock-motion-caption-crowd">
          <strong>독자와 창작자</strong>
          <span>소장을 원하는 사람들</span>
        </div>
        <div className="silock-motion-caption silock-motion-caption-platform">
          <strong>Silock에서 구매</strong>
          <span>지속 소장을 제공하는 플랫폼</span>
        </div>
        <div className="silock-motion-caption silock-motion-caption-library">
          <strong>나의 서재</strong>
          <span>각자의 소장 서재</span>
        </div>
      </div>
    </div>
  );
}

function ArchiveTransitionSection({ sectionRef }) {
  return (
    <section ref={sectionRef} id="archive-transition" className="silock-archive-transition">
      <div className="silock-transition-panel">
        <div className="silock-transition-record" aria-hidden="true">
          <span>ARCHIVE TRANSITION</span>
          <span>RECORD 001</span>
        </div>
        <p className="silock-transition-eyebrow">FROM PHYSICAL ARCHIVE TO DIGITAL LIBRARY</p>
        <h2>
          대대로 내려온 기록의 가치를
          <br />
          <span>이제 디지털에서도 이어갑니다</span>
        </h2>
        <p className="silock-transition-description">
          <span className="silock-copy-segment">오프라인의 소장 경험을</span>{" "}
          <span className="silock-copy-segment">Silock의 디지털 서재로 옮깁니다</span>
        </p>
        <div className="silock-transition-flow" aria-hidden="true">
          <span>오프라인 소장</span>
          <i />
          <span className="silock-transition-symbol"><KeyholeSquareIcon size={48} filled /></span>
          <i />
          <span>디지털 서재</span>
        </div>
      </div>
    </section>
  );
}

function SectionRecord({ number, label }) {
  return (
    <div className="silock-section-record" aria-hidden="true">
      <span>{number}</span>
      <i />
      <span>{label}</span>
    </div>
  );
}

function BrandStorySection() {
  return (
    <section id="brand-story" className="silock-story-section silock-brand-section" style={{ ...storyStyles.section, ...storyStyles.brandSection }}>
      <SectionRecord number="01" label="BRAND ARCHIVE" />
      <div style={storyStyles.inner}>
        <p style={storyStyles.eyebrow}>WHY SILOCK</p>
        <h2 style={storyStyles.displayTitle}>
          Silock에서 구매하고
          <br />
          <span style={storyStyles.orangeText}>
            <span className="silock-copy-segment">나의 서재에</span>{" "}
            <span className="silock-copy-segment">오래 소장</span>
          </span>
        </h2>
        <p style={storyStyles.lead}>
          <span className="silock-copy-segment">사람을 닮은 심볼은</span>{" "}
          <span className="silock-copy-segment">독자와 창작자를,</span>
          <br />
          <span className="silock-copy-segment">네모난 프레임은</span>{" "}
          <span className="silock-copy-segment">개인의 서재를 뜻합니다</span>
        </p>

        <BrandConceptMotion />

        <div className="silock-value-grid">
          {BRAND_VALUES.map((value) => (
            <article key={value.number} className="silock-record-card" style={storyStyles.valueCard}>
              <span style={storyStyles.cardNumber}>{value.number}</span>
              <h3 style={storyStyles.cardTitle}>{value.title}</h3>
              <p style={storyStyles.cardDescription} aria-label={value.description}>
                <MeaningfulCopy sentences={value.descriptionSegments} />
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section id="qna" className="silock-story-section silock-faq-section" style={{ ...storyStyles.section, ...storyStyles.faqSection }}>
      <SectionRecord number="02" label="OPEN RECORDS" />
      <div className="silock-faq-layout" style={storyStyles.inner}>
        <div style={storyStyles.faqIntro}>
          <p style={storyStyles.eyebrow}>Q&amp;A</p>
          <h2 style={storyStyles.sectionTitle}>지속 소장에 대해<br />궁금한 점</h2>
          <p style={storyStyles.sectionDescription}>
            <span className="silock-copy-segment">지금 Silock이 만들고 있는 가치와</span>{" "}
            <span className="silock-copy-segment">검증 단계를 솔직하게 답합니다</span>
          </p>
        </div>
        <div style={storyStyles.faqList}>
          {FAQ_ITEMS.map((item, index) => (
            <details key={item.question} className="silock-faq-item" open={index === 0}>
              <summary>
                <span className="silock-faq-question">
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <span>{item.question}</span>
                </span>
                <span className="silock-faq-plus" aria-hidden="true">+</span>
              </summary>
              <p aria-label={item.answer}>
                <MeaningfulCopy sentences={item.answerSegments} breakAfter={item.breakAfter} />
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalSurveySection({ onSurveyOpen }) {
  return (
    <section id="survey" className="silock-final-survey-section" style={{ ...storyStyles.section, ...storyStyles.surveySection }}>
      <SectionRecord number="03" label="YOUR RECORD" />
      <div className="silock-survey-inner" style={{ ...storyStyles.inner, ...storyStyles.surveyInner }}>
        <div className="silock-survey-message">
          <div className="silock-survey-symbol" aria-hidden="true">
            <KeyholeSquareIcon size={96} filled />
          </div>
          <p style={{ ...storyStyles.eyebrow, color: COLOR.orange }}>YOUR VOICES UNLOCK SILOCK</p>
          <h2 style={{ ...storyStyles.displayTitle, color: COLOR.white }}>
            당신의 경험이
            <br />
            다음 서재를 엽니다
          </h2>
          <p style={{ ...storyStyles.lead, color: "rgba(255,255,255,0.7)" }}>
            <span className="silock-copy-segment">콘텐츠를 잃었거나,</span>{" "}
            <span className="silock-copy-segment">잃을까 걱정했던 경험을 들려주세요</span>
            <br />
            <span className="silock-copy-segment">Silock의 지속 소장 경험을</span>{" "}
            <span className="silock-copy-segment">설계하는 데 사용됩니다</span>
          </p>
        </div>
        <div className="silock-survey-action">
          <button type="button" className="silock-final-cta" onClick={onSurveyOpen}>
            참여하기
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p style={storyStyles.surveyNote}>설문 참여 후 오픈 알림을 신청할 수 있습니다</p>
        </div>
      </div>
      <footer className="silock-final-footer" style={storyStyles.footer}>
        <span className="silock-final-footer-brand">SILOCK</span>
        <span className="silock-final-footer-note">
          <span className="silock-copy-segment">온라인도 오프라인처럼 안심하고 소장하세요</span>
        </span>
        <a href="mailto:silockload@gmail.com" className="silock-final-footer-email" style={storyStyles.footerEmail}>silockload@gmail.com</a>
      </footer>
    </section>
  );
}

function StorySections({ sectionRef, onSurveyOpen }) {
  return (
    <div style={storyStyles.page}>
      <ArchiveTransitionSection sectionRef={sectionRef} />
      <BrandStorySection />
      <FAQSection />
      <FinalSurveySection onSurveyOpen={onSurveyOpen} />
    </div>
  );
}

const storyStyles = {
  page: { position: "relative", zIndex: 2, background: COLOR.white },
  section: { position: "relative", padding: "clamp(88px, 11vw, 160px) 24px", overflow: "hidden" },
  brandSection: { background: COLOR.white },
  faqSection: { background: COLOR.lightGray },
  surveySection: { minHeight: "82vh", background: COLOR.black, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: 0 },
  inner: { width: "min(1160px, 100%)", margin: "0 auto" },
  eyebrow: { margin: "0 0 18px", color: COLOR.orange, fontSize: "clamp(15px, 1.4vw, 20px)", fontWeight: 800, lineHeight: 1.3, letterSpacing: "0.14em" },
  displayTitle: { margin: 0, color: COLOR.black, fontSize: "clamp(42px, 6.5vw, 84px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.055em" },
  orangeText: { color: COLOR.orange },
  lead: { margin: "28px 0 0", color: "#5f5f5f", fontSize: "clamp(16px, 1.7vw, 21px)", lineHeight: 1.75, letterSpacing: "-0.02em" },
  valueCard: { minHeight: 250, padding: "30px 28px", border: `1px solid ${COLOR.neutralGray}`, borderRadius: 14, background: COLOR.white, display: "flex", flexDirection: "column" },
  cardNumber: { color: COLOR.orange, fontSize: "clamp(20px, 1.8vw, 26px)", fontWeight: 800, lineHeight: 1, letterSpacing: "0.12em" },
  cardTitle: { minHeight: "2.6em", margin: "28px 0 12px", color: COLOR.black, fontSize: "clamp(19px, 2vw, 25px)", lineHeight: 1.3, letterSpacing: "-0.035em", display: "flex", alignItems: "flex-end" },
  cardDescription: { margin: 0, color: "#686868", fontSize: 15, lineHeight: 1.7, letterSpacing: "-0.018em" },
  faqIntro: { position: "sticky", top: 96, alignSelf: "start" },
  sectionTitle: { margin: 0, color: COLOR.black, fontSize: "clamp(36px, 4.8vw, 62px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.05em" },
  sectionDescription: { maxWidth: 380, margin: "22px 0 0", color: "#686868", fontSize: 16, lineHeight: 1.7 },
  faqList: { borderTop: `1px solid ${COLOR.neutralGray}` },
  surveyInner: { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" },
  surveyNote: { margin: "clamp(22px, 2.4vw, 34px) 0 0", color: "rgba(255,255,255,0.58)", fontSize: "clamp(14px, 1.25vw, 17px)", lineHeight: 1.5 },
  footer: { width: "min(1160px, calc(100% - 48px))", margin: "80px auto 0", padding: "24px 0", borderTop: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.48)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "8px 16px", fontSize: "clamp(10px, 2.6vw, 12px)" },
  footerEmail: { color: "inherit", textDecoration: "none" },
};

// 이미 참여한 사용자에게 보여주는 안내 — 예전에는 앱 전체를 이 화면으로
// 교체(full-page)해 랜딩으로 돌아갈 방법이 없었고(새로고침해도 그대로, 뒤로가기
// 시 사이트를 아예 나감), 그래서 "닫을 수 있는 모달"로 바꿨다. 랜딩 페이지는
// 항상 정상적으로 보이고, 이미 참여한 사람이 "참여하기"를 다시 누르거나 방금
// 제출을 마친 순간에만 이 모달이 뜬다.
function AlreadyParticipatedModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={modalStyles.overlay}
      className="silock-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="participated-title"
    >
      <ModalBackdrop />
      <div style={participatedStyles.card}>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="silock-modal-btn"
          style={participatedStyles.closeBtn}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 5l14 14M19 5L5 19" stroke={COLOR.white} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <img src={entranceLogoImg} alt="Silock" style={participatedStyles.logo} />
        <h2 id="participated-title" style={participatedStyles.title}>이미 참여하셨습니다</h2>
        <p style={participatedStyles.description}>
          소중한 의견을 보내주셔서 감사합니다
          <br />
          Silock의 시작 소식을 기다려주세요
        </p>
        <button type="button" onClick={onClose} className="silock-modal-btn" style={participatedStyles.homeButton} autoFocus>
          메인으로 돌아가기
        </button>
      </div>
    </div>
  );
}

const participatedStyles = {
  card: {
    position: "relative",
    width: "min(440px, calc(100% - 40px))",
    padding: "clamp(32px, 6vw, 48px) clamp(24px, 5vw, 40px)",
    boxSizing: "border-box",
    background: COLOR.black,
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 18,
    boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
    color: COLOR.white,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    animation: "modal-pop-in 300ms ease-out",
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    borderRadius: 10,
    background: "rgba(255,255,255,0.08)",
  },
  logo: { width: "clamp(120px, 30vw, 180px)", height: "auto", objectFit: "contain", marginBottom: 20 },
  title: { margin: 0, fontSize: "clamp(22px, 5vw, 30px)", lineHeight: 1.25, letterSpacing: "-0.03em" },
  description: { margin: "14px 0 0", fontSize: "clamp(13px, 3.4vw, 16px)", lineHeight: 1.7, color: "rgba(255,255,255,0.72)" },
  homeButton: {
    marginTop: "clamp(24px, 5vw, 32px)",
    padding: "13px 30px",
    border: "none",
    borderRadius: 999,
    background: COLOR.orange,
    color: COLOR.white,
    fontSize: "clamp(14px, 3.4vw, 16px)",
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
};

// ============================================================
// 최상위: EntranceSection(입구+스크롤 전환) + LibrarySection
// ============================================================
export default function SilockLibraryDemo() {
  const [activated, setActivated] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(readSurveyCompleted);
  // 이미 참여한 사용자에게 보여주는 안내 모달의 표시 여부. surveyCompleted(영구
  // 저장되는 참여 기록)와 분리해, 랜딩 페이지 자체는 항상 정상적으로 노출한다.
  const [showParticipatedNotice, setShowParticipatedNotice] = useState(false);
  // 저사양 기기 여부는 기기 특성이라 세션 내내 바뀌지 않으므로 최초 1회만 계산한다.
  const [lowPower] = useState(detectLowPower);
  const ctaRef = useRef(null);
  const storyRef = useRef(null);

  useEffect(() => {
    // 입구 활성화 전 스크롤 잠금 + 설문/안내 모달 열린 동안 배경 스크롤 잠금
    document.body.style.overflow =
      !activated || surveyOpen || showParticipatedNotice ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [activated, surveyOpen, showParticipatedNotice]);

  const handleActivate = useCallback(() => {
    trackEvent("entrance_activated");
    setActivated(true);
    setTimeout(() => window.scrollBy({ top: 80, behavior: "smooth" }), 400);
  }, []);

  const handleSurveyOpen = useCallback((event) => {
    if (event?.currentTarget) ctaRef.current = event.currentTarget;
    // 이미 참여한 사용자는 설문 폼 대신 안내 모달을 띄운다(중복 응답 방지).
    if (surveyCompleted) {
      setShowParticipatedNotice(true);
      return;
    }
    trackEvent("survey_open");
    setSurveyOpen(true);
  }, [surveyCompleted]);
  const handleSurveyClose = useCallback(() => setSurveyOpen(false), []);
  const handleParticipatedNoticeClose = useCallback(() => {
    setShowParticipatedNotice(false);
    // 안내를 닫으면 방금 참여하기를 눌렀던 요소로 포커스를 되돌린다.
    ctaRef.current?.focus?.();
  }, []);
  const handleExplore = useCallback(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    storyRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, []);
  const handleSurveyComplete = useCallback(() => {
    saveSurveyCompleted();
    trackEvent("survey_complete");
    setSurveyOpen(false);
    setSurveyCompleted(true);
    // 제출 직후에는 감사 안내를 한 번 보여준다(닫으면 랜딩으로 돌아간다).
    setShowParticipatedNotice(true);
  }, []);

  return (
    <div
      className={lowPower ? "silock-app silock-lite" : "silock-app"}
      style={{
        fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
        wordBreak: "keep-all",
        overflowWrap: "break-word",
      }}
    >
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&display=swap");
        @keyframes ink-ripple { from { transform: scale(0.3); opacity: 0.55; } to { transform: scale(3.2); opacity: 0; } }
        @keyframes boot-brightness { from { filter: brightness(0); } to { filter: brightness(1); } }
        @keyframes mark-pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes boot-dot { 0%, 100% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }
        @keyframes screen-power-on {
          0% { opacity: 0; transform: scaleX(0.16) scaleY(0.008); filter: brightness(2.4); }
          18% { opacity: 1; transform: scaleX(1) scaleY(0.012); filter: brightness(2.1); }
          58% { opacity: 1; transform: scaleX(1) scaleY(1); filter: brightness(1.45); }
          100% { opacity: 1; transform: scaleX(1) scaleY(1); filter: brightness(1); }
        }
        @keyframes book-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modal-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-pop-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }

        .silock-app :is(h1, h2, h3, p, summary, button, footer span) {
          word-break: keep-all;
          overflow-wrap: break-word;
          text-wrap: balance;
        }
        .silock-copy-segment {
          display: inline-block;
          max-width: 100%;
          white-space: nowrap;
        }
        .silock-sentence-segment {
          display: inline-block;
          max-width: 100%;
        }

        /* 모달 버튼(메인으로 돌아가기 / 닫기)의 기본 파란색 포커스 테두리·탭
           하이라이트를 없애고, 브랜드 톤에 맞는 주황색 포커스 링으로 대체한다. */
        .silock-modal-btn {
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }
        .silock-modal-btn:focus-visible {
          box-shadow: 0 0 0 3px ${COLOR.orange}66;
        }

        .silock-explore-arrow:hover { color: ${COLOR.orange} !important; }
        .silock-explore-arrow svg { animation: explore-arrow-bounce 1.5s ease-in-out infinite; }
        @keyframes explore-arrow-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }

        .silock-archive-transition {
          position: relative;
          min-height: clamp(640px, 92vh, 920px);
          padding: clamp(96px, 12vw, 160px) 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: linear-gradient(180deg, #17130f 0%, #2a2017 39%, #eee8e1 39.2%, #ffffff 100%);
        }
        .silock-archive-transition::before {
          content: "";
          position: absolute;
          inset: 0 0 55% 0;
          opacity: 0.13;
          background-image:
            linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px);
          background-size: 24px 24px;
          mask-image: linear-gradient(180deg, #000, transparent);
        }
        .silock-transition-panel {
          position: relative;
          z-index: 1;
          width: min(1040px, 100%);
          padding: clamp(42px, 7vw, 82px);
          border: 1px solid ${COLOR.neutralGray};
          border-top: 3px solid ${COLOR.orange};
          background: rgba(255,255,255,0.97);
          box-shadow: 0 32px 90px rgba(17,17,17,0.18);
        }
        .silock-transition-record {
          margin-bottom: clamp(34px, 5vw, 58px);
          padding-bottom: 13px;
          border-bottom: 1px solid ${COLOR.neutralGray};
          display: flex;
          justify-content: space-between;
          gap: 24px;
          color: #777;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }
        .silock-transition-eyebrow {
          margin: 0 0 18px;
          color: ${COLOR.orange};
          font-size: clamp(12px, 1.25vw, 16px);
          font-weight: 900;
          letter-spacing: 0.13em;
        }
        .silock-transition-panel h2 {
          margin: 0;
          color: ${COLOR.black};
          font-family: "Noto Serif KR", serif;
          font-size: clamp(34px, 5.5vw, 66px);
          font-weight: 700;
          line-height: 1.24;
          letter-spacing: -0.045em;
        }
        .silock-transition-panel h2 span { color: ${COLOR.orange}; }
        .silock-transition-description {
          margin: 26px 0 0;
          color: #65605b;
          font-size: clamp(15px, 1.55vw, 19px);
          line-height: 1.75;
          letter-spacing: -0.02em;
        }
        .silock-transition-flow {
          margin-top: clamp(42px, 6vw, 68px);
          display: grid;
          grid-template-columns: max-content minmax(34px, 1fr) 48px minmax(34px, 1fr) max-content;
          align-items: center;
          gap: clamp(10px, 2vw, 24px);
          color: ${COLOR.black};
          font-size: clamp(12px, 1.3vw, 15px);
          font-weight: 800;
        }
        .silock-transition-flow > i {
          position: relative;
          height: 1px;
          overflow: hidden;
          background: ${COLOR.neutralGray};
        }
        .silock-transition-flow > i::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 34%;
          height: 100%;
          background: ${COLOR.orange};
          animation: transition-line-travel 2.2s ease-in-out infinite;
        }
        .silock-transition-flow > i:nth-of-type(2)::after { animation-delay: 0.35s; }
        .silock-transition-symbol { filter: drop-shadow(0 10px 22px rgba(255,106,0,0.22)); }
        @keyframes transition-line-travel {
          0% { transform: translateX(-110%); }
          55%, 100% { transform: translateX(310%); }
        }
        @supports (animation-timeline: view()) {
          .silock-transition-panel {
            animation: archive-panel-reveal both;
            animation-timeline: view();
            animation-range: entry 12% cover 48%;
          }
          @keyframes archive-panel-reveal {
            from { opacity: 0.3; transform: translateY(42px); }
            to { opacity: 1; transform: translateY(0); }
          }
        }

        .silock-section-record {
          position: absolute;
          z-index: 2;
          top: clamp(28px, 3.4vw, 48px);
          left: max(24px, calc((100% - 1160px) / 2));
          right: max(24px, calc((100% - 1160px) / 2));
          display: grid;
          grid-template-columns: max-content 1fr max-content;
          align-items: center;
          gap: 14px;
          color: #8b8b8b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }
        .silock-section-record i { height: 1px; background: currentColor; opacity: 0.32; }
        .silock-section-record span:first-child { color: ${COLOR.orange}; }
        .silock-final-survey-section .silock-section-record { color: rgba(255,255,255,0.48); }
        .silock-brand-section::before {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: min(38vw, 560px);
          height: min(38vw, 560px);
          opacity: 0.38;
          background-image:
            linear-gradient(${COLOR.lightGray} 1px, transparent 1px),
            linear-gradient(90deg, ${COLOR.lightGray} 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: linear-gradient(225deg, #000, transparent 72%);
          pointer-events: none;
        }
        .silock-record-card {
          position: relative;
          overflow: hidden;
          transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
        }
        .silock-record-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 56px;
          height: 3px;
          background: ${COLOR.orange};
        }
        @media (hover: hover) and (pointer: fine) {
          .silock-record-card:hover {
            transform: translateY(-5px);
            border-color: rgba(255,106,0,0.38) !important;
            box-shadow: 0 22px 48px rgba(17,17,17,0.08);
          }
        }
        .silock-faq-section {
          background-image: linear-gradient(90deg, transparent 0 49.94%, rgba(17,17,17,0.035) 49.94% 50.06%, transparent 50.06%);
        }

        .silock-concept-motion {
          position: relative;
          width: min(920px, 100%);
          min-height: 390px;
          margin: clamp(64px, 9vw, 120px) auto;
          padding: clamp(56px, 6vw, 72px) clamp(24px, 4vw, 46px) clamp(24px, 4vw, 46px);
          box-sizing: border-box;
          border: 1px solid ${COLOR.neutralGray};
          border-radius: 16px;
          background:
            radial-gradient(circle at 14% 48%, rgba(255,106,0,0.09), transparent 27%),
            linear-gradient(145deg, #ffffff 0%, #faf8f5 100%);
          box-shadow: 0 28px 80px rgba(17,17,17,0.06);
          overflow: hidden;
        }
        /* 화면 밖(.in-view 없음)일 때는 내부 무한 애니메이션을 모두 멈춘다 —
           보이지 않는 동안의 repaint 비용을 없애 저사양 폰의 스크롤 버벅임을 줄인다.
           in-view가 되면 이어서 재생된다(처음부터 다시 시작하지 않음). */
        .silock-concept-motion:not(.in-view),
        .silock-concept-motion:not(.in-view) * {
          animation-play-state: paused !important;
        }
        .silock-concept-motion::before {
          content: "ARCHIVE FLOW 01";
          position: absolute;
          top: 20px;
          left: 24px;
          color: #8b8b8b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }
        .silock-concept-motion::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 72px;
          height: 3px;
          background: ${COLOR.orange};
        }
        .silock-motion-stage {
          --platform-size: clamp(92px, 11vw, 108px);
          --person-size: calc(var(--platform-size) / 2);
          --library-width: clamp(108px, 15vw, 136px);
          --library-right: clamp(0px, 1.5vw, 14px);
          --journey-start: clamp(96px, 17vw, 158px);
          --crowd-left: clamp(2px, 2vw, 18px);
          --crowd-width: clamp(120px, 18vw, 168px);
          --caption-offset: 82px;
          position: relative;
          z-index: 1;
          height: clamp(210px, 27vw, 260px);
        }
        .silock-crowd-glow {
          position: absolute;
          left: -10px;
          top: 50%;
          width: 190px;
          height: 190px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,106,0,0.13), rgba(255,106,0,0) 70%);
          transform: translateY(-50%);
          animation: crowd-glow-breathe 2.8s ease-in-out infinite;
        }
        .silock-symbol-crowd {
          position: absolute;
          left: var(--crowd-left);
          top: 50%;
          width: var(--crowd-width);
          height: 142px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          align-items: center;
          justify-items: center;
          transform: translateY(-50%);
        }
        .silock-symbol-person {
          display: flex;
          filter: drop-shadow(0 7px 8px rgba(255,106,0,0.16));
          animation: symbol-murmur 2.1s ease-in-out infinite;
        }
        .silock-symbol-person:nth-child(3n + 1) { translate: 0 10px; }
        .silock-symbol-person:nth-child(3n + 2) { translate: 0 -8px; }
        @keyframes symbol-murmur {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          35% { transform: translateY(-7px) rotate(3deg); }
          70% { transform: translateY(3px) rotate(-1deg); }
        }
        @keyframes crowd-glow-breathe {
          0%, 100% { opacity: 0.55; transform: translateY(-50%) scale(0.92); }
          50% { opacity: 1; transform: translateY(-50%) scale(1.06); }
        }
        .silock-queue-line {
          position: absolute;
          left: clamp(122px, 18vw, 168px);
          right: calc(var(--library-right) + var(--library-width) / 2);
          top: 50%;
          height: 1px;
          background: repeating-linear-gradient(90deg, ${COLOR.neutralGray} 0 7px, transparent 7px 14px);
        }
        .silock-queue-arrow {
          position: absolute;
          top: 50%;
          color: rgba(255,106,0,0.46);
          font-size: 20px;
          transform: translateY(-55%);
          animation: queue-arrow-nudge 1.4s ease-in-out infinite;
        }
        .silock-queue-arrow-before { left: 39%; }
        .silock-queue-arrow-after { left: 67%; animation-delay: 180ms; }
        @keyframes queue-arrow-nudge {
          0%, 100% { translate: 0 0; opacity: 0.38; }
          50% { translate: 5px 0; opacity: 0.9; }
        }
        .silock-traveler-lane { position: absolute; inset: 0; }
        .silock-symbol-traveler {
          position: absolute;
          left: var(--journey-start);
          top: 50%;
          width: var(--person-size);
          height: var(--person-size);
          display: flex;
          z-index: 4;
          opacity: 0;
          filter: drop-shadow(0 9px 9px rgba(255,106,0,0.24));
          animation: consumer-journey 7s cubic-bezier(0.42, 0, 0.35, 1) infinite both;
        }
        @keyframes consumer-journey {
          0% {
            left: var(--journey-start);
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.68);
          }
          8% { opacity: 1; }
          16% { transform: translate(-50%, calc(-50% - 11px)) scale(0.88); }
          24% { transform: translate(-50%, -50%) scale(0.94); }
          34% { transform: translate(-50%, calc(-50% - 8px)) scale(0.98); }
          44% {
            left: 50%;
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          49% {
            left: 50%;
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            filter: drop-shadow(0 0 18px rgba(255,106,0,0.72));
          }
          55% {
            left: 50%;
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.72);
          }
          59% {
            left: 56%;
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.78);
          }
          64% {
            left: 60%;
            opacity: 1;
            transform: translate(-50%, calc(-50% - 9px)) scale(0.9);
          }
          72% { transform: translate(-50%, -50%) scale(0.96); }
          80% { transform: translate(-50%, calc(-50% - 7px)) scale(1); }
          92% {
            left: calc(100% - var(--library-right) - var(--library-width) / 2);
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.92);
          }
          98%, 100% {
            left: calc(100% - var(--library-right) - var(--library-width) / 2);
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.72);
          }
        }
        .silock-archive-gate {
          position: absolute;
          left: 50%;
          top: 50%;
          width: var(--platform-size);
          height: var(--platform-size);
          box-sizing: border-box;
          border: max(3px, calc(var(--platform-size) * 0.05)) solid ${COLOR.orange};
          border-radius: calc(var(--platform-size) * 0.24);
          background: ${COLOR.white};
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
          transform: translate(-50%, -50%);
          box-shadow: 0 20px 44px rgba(17,17,17,0.1);
          animation: archive-gate-pulse 920ms ease-in-out infinite;
        }
        .silock-gate-hole {
          width: var(--person-size);
          height: var(--person-size);
          display: flex;
        }
        .silock-gate-ripple {
          position: absolute;
          inset: -3px;
          border: 2px solid ${COLOR.orange};
          border-radius: inherit;
          opacity: 0;
          animation: gate-unlock-ripple 920ms ease-out infinite;
        }
        .silock-gate-brand {
          position: absolute;
          left: 50%;
          bottom: 7px;
          color: ${COLOR.orange};
          font-size: clamp(8px, 0.85vw, 11px);
          font-weight: 900;
          letter-spacing: 0.14em;
          transform: translateX(-50%);
        }
        @keyframes archive-gate-pulse {
          0%, 58%, 100% { box-shadow: 0 20px 44px rgba(17,17,17,0.1); }
          76% { box-shadow: 0 20px 44px rgba(17,17,17,0.1), 0 0 28px rgba(255,106,0,0.4); }
        }
        @keyframes gate-unlock-ripple {
          0%, 62% { opacity: 0; transform: scale(1); }
          76% { opacity: 0.65; }
          100% { opacity: 0; transform: scale(1.22); }
        }
        .silock-library-destination {
          position: absolute;
          right: var(--library-right);
          top: 50%;
          width: var(--library-width);
          height: calc(var(--platform-size) * 0.9);
          box-sizing: border-box;
          border: 2px solid ${COLOR.black};
          border-radius: 11px 11px 4px 4px;
          background: linear-gradient(180deg, #fff 0%, #f7f3ee 100%);
          z-index: 5;
          transform: translateY(-50%);
          box-shadow: 0 18px 34px rgba(17,17,17,0.11);
          overflow: visible;
        }
        .silock-library-label {
          position: absolute;
          left: 50%;
          top: -21px;
          color: ${COLOR.black};
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
          white-space: nowrap;
          transform: translateX(-50%);
        }
        .silock-library-shelf {
          position: absolute;
          left: 9px;
          right: 9px;
          height: 33%;
          border-bottom: 3px solid ${COLOR.black};
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 4px;
        }
        .silock-library-shelf-top { top: 7px; }
        .silock-library-shelf-bottom { bottom: 7px; }
        .silock-library-shelf i {
          width: clamp(7px, 1vw, 10px);
          height: 72%;
          border-radius: 2px 2px 0 0;
          background: ${COLOR.orange};
        }
        .silock-library-shelf i:nth-child(2n) { height: 92%; background: ${COLOR.black}; }
        .silock-library-shelf i:nth-child(3n) { height: 62%; background: #d6d0c8; }
        .silock-motion-caption {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transform: translateX(-50%);
        }
        .silock-motion-caption-crowd {
          left: calc(var(--crowd-left) + var(--crowd-width) / 2);
          top: calc(50% + var(--caption-offset));
          width: var(--crowd-width);
        }
        .silock-motion-caption-platform {
          left: 50%;
          top: calc(50% + var(--caption-offset));
          width: clamp(96px, 25%, 210px);
        }
        .silock-motion-caption-library {
          left: calc(100% - var(--library-right) - var(--library-width) / 2);
          top: calc(50% + var(--caption-offset));
          width: var(--library-width);
        }
        .silock-motion-caption strong { color: ${COLOR.black}; font-size: clamp(14px, 1.8vw, 18px); }
        .silock-motion-caption span { margin-top: 6px; color: #777; font-size: clamp(10px, 1.1vw, 12px); line-height: 1.5; }
        /* repeat(3, minmax(0,1fr))는 트랙 자체는 안 넘치지만, 카드 안의 문구
           (.silock-copy-segment, white-space:nowrap 한 단어 뭉치)는 트랙이 좁아져도
           줄바꿈되지 않는다 — 실측 결과 가장 긴 문구가 235px, 카드 좌우 패딩
           56px(28px×2)을 더하면 최소 293px가 있어야 안 잘린다. 761~960px처럼
           "모바일 전용 1열" 구간(<=760px)보다는 넓지만 3열이 들어가기엔 좁은 폭에서
           고정 3열을 쓰면 각 카드가 293px보다 좁아져 문구가 카드 박스를 넘어간다.
           auto-fit으로 바꾸면 칼럼이 이 최소 폭(여유를 둔 310px)보다 좁아지기 전에
           스스로 3→2→1열로 줄어들어, 어떤 폭에서도 카드 안 문구가 넘치지 않는다. */
        .silock-value-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
          gap: 18px;
        }
        .silock-faq-layout {
          display: grid;
          grid-template-columns: minmax(260px, 0.8fr) minmax(420px, 1.2fr);
          gap: clamp(56px, 9vw, 130px);
        }
        /* 위 2열 그리드는 각 트랙의 최소값(260px+420px)과 최소 간격(56px)을 더한
           736px보다 콘텐츠 폭이 좁아지면 그리드 자체가 넘친다. 섹션에 overflow:hidden이
           걸려 있어(storyStyles.section), 넘친 만큼 오른쪽이 그대로 잘려나가고 —
           하필 각 질문 우측 끝의 "+" 아이콘이 바로 그 잘리는 자리라 아이콘이 반만
           보이는 형태로 나타난다. 아래(<=760px)의 "완전히 모바일" 전용 스택 규칙과는
           별개로, 2열이 실제로 들어갈 수 있는 폭(약 800px)에 도달하기 전까지는 먼저
           1열로 유지해 겹침 구간을 없앤다. */
        @media (max-width: 860px) {
          .silock-faq-layout { grid-template-columns: 1fr; gap: 52px; }
          .silock-faq-layout > div:first-child { position: static !important; }
        }
        .silock-faq-item { border-bottom: 1px solid ${COLOR.neutralGray}; }
        .silock-faq-item summary {
          min-height: 84px;
          padding: 24px 4px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          color: ${COLOR.black};
          font-size: clamp(17px, 1.8vw, 21px);
          font-weight: 700;
          line-height: 1.45;
          cursor: pointer;
          list-style: none;
        }
        .silock-faq-item summary::-webkit-details-marker { display: none; }
        .silock-faq-item summary:focus-visible { outline: 2px solid ${COLOR.orange}; outline-offset: 4px; }
        .silock-faq-question {
          min-width: 0;
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr);
          align-items: baseline;
          gap: 12px;
        }
        .silock-faq-question small {
          color: ${COLOR.orange};
          font-size: clamp(14px, 1.4vw, 18px);
          font-weight: 900;
          letter-spacing: 0.12em;
        }
        .silock-faq-item p { margin: -4px 48px 28px 4px; color: #626262; font-size: 15px; line-height: 1.8; }
        .silock-faq-plus { flex-shrink: 0; color: ${COLOR.orange}; font-size: 28px; font-weight: 400; transition: transform 180ms ease; }
        .silock-faq-item[open] .silock-faq-plus { transform: rotate(45deg); }
        .silock-survey-message,
        .silock-survey-action {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .silock-survey-action { margin-top: 38px; }
        .silock-survey-symbol { margin-bottom: 32px; filter: drop-shadow(0 18px 32px rgba(255,106,0,0.22)); }
        .silock-final-cta {
          min-height: 58px;
          margin-top: 38px;
          padding: 0 32px;
          border: 0;
          border-radius: 999px;
          background: ${COLOR.orange};
          color: ${COLOR.white};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 17px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 16px 36px rgba(255,106,0,0.28);
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }
        .silock-survey-action .silock-final-cta { margin-top: 0; }
        .silock-final-cta:hover { transform: translateY(-3px); box-shadow: 0 20px 44px rgba(255,106,0,0.38); background: #ff7b20; }
        .silock-final-cta:active { transform: translateY(0) scale(0.98); }
        .silock-final-cta:focus-visible { outline: 3px solid ${COLOR.white}; outline-offset: 4px; }

        /* 반응형 규칙표: 설문 모달 — 데스크톱 중앙 고정형 / 모바일 전체 화면형 */
        .silock-modal-overlay { padding: 16px; }
        .silock-modal-container {
          width: min(820px, calc(100vw - 32px));
          height: min(860px, 92vh);
          max-height: 92vh;
          border-radius: 18px;
          border-top: 3px solid ${COLOR.orange};
        }
        .silock-modal-body { padding: 18px; }
        .silock-survey-iframe { border-radius: 8px; background: ${COLOR.white}; box-shadow: 0 0 0 1px ${COLOR.neutralGray}; }
        @media (max-width: 640px) {
          .silock-modal-overlay { padding: 0; }
          .silock-modal-container {
            width: 100%;
            height: 100vh;
            height: 100dvh;
            max-height: none;
            border-radius: 0;
          }
          .silock-modal-body { padding: 0; }
          .silock-survey-iframe { border-radius: 0; }
          .silock-survey-trust { padding-inline: 12px !important; }
          .silock-survey-trust > span:last-child { font-size: 10px; }
        }

        @media (max-width: 760px) {
          .silock-archive-transition {
            min-height: 760px;
            padding: 84px 18px;
            background: linear-gradient(180deg, #17130f 0%, #2a2017 32%, #eee8e1 32.2%, #ffffff 100%);
          }
          .silock-transition-panel { padding: 34px 22px 38px; }
          .silock-transition-record { margin-bottom: 30px; font-size: 8px; }
          .silock-transition-panel h2 { font-size: clamp(30px, 9vw, 42px); line-height: 1.3; }
          .silock-transition-description { margin-top: 20px; }
          .silock-transition-flow {
            margin-top: 36px;
            grid-template-columns: 1fr;
            justify-items: center;
            gap: 10px;
          }
          .silock-transition-flow > i { width: 1px; height: 26px; }
          .silock-transition-flow > i::after {
            width: 100%;
            height: 34%;
            animation-name: transition-line-travel-y;
          }
          @keyframes transition-line-travel-y {
            0% { transform: translateY(-110%); }
            55%, 100% { transform: translateY(310%); }
          }
          .silock-final-survey-section {
            min-height: 100vh !important;
            min-height: 100svh !important;
            padding-top: 0 !important;
          }
          .silock-survey-inner {
            flex: 1;
            min-height: 0;
            justify-content: center;
            box-sizing: border-box;
            padding-top: clamp(44px, 6svh, 64px);
            padding-bottom: clamp(44px, 6svh, 64px);
          }
          .silock-survey-action { margin-top: clamp(42px, 6svh, 60px); }
          .silock-final-survey-section > footer { margin-top: 0 !important; }
          .silock-concept-motion {
            min-height: 350px;
            padding: 52px 14px 26px;
            border-radius: 14px;
          }
          .silock-motion-stage {
            --platform-size: 76px;
            --library-width: 86px;
            --library-right: 0px;
            --journey-start: 86px;
            --crowd-left: -8px;
            --crowd-width: 118px;
            --caption-offset: 54px;
            height: 210px;
          }
          .silock-crowd-glow { left: -44px; width: 150px; height: 150px; }
          .silock-symbol-crowd {
            height: 112px;
            transform: translateY(-50%) scale(0.78);
            transform-origin: left center;
          }
          .silock-queue-line { left: 82px; }
          .silock-queue-arrow { display: none; }
          .silock-motion-caption-platform { width: 31%; }
          .silock-motion-caption strong { font-size: 13px; }
          .silock-motion-caption span { font-size: 10px; }
          .silock-value-grid { grid-template-columns: 1fr; }
          .silock-faq-layout { grid-template-columns: 1fr; gap: 52px; }
          .silock-faq-layout > div:first-child { position: static !important; }
          .silock-faq-item summary { min-height: 74px; padding: 20px 2px; }
          .silock-faq-item p { margin: -2px 34px 24px 2px; }
          .silock-faq-question { grid-template-columns: 38px minmax(0, 1fr); gap: 8px; }
        }
        /* 위 760px 이하 규칙은 값이 고정 px라 "화면 폭에 반응해 움직이지" 않는다 —
           760px 폰과 320px 폰이 똑같은 크기의 아이콘 박스·캡션을 받는다. 폭이
           넉넉한 폰(대략 400px~)에서는 이 값이 여유 있게 맞지만, 그보다 좁은 폰
           (iPhone SE·구형 안드로이드 등 320~390px대)에서는 게이트 박스가 서재
           박스를 덮거나("그림끼리 겹치거나") 캡션 문구 3개가 서로 겹쳐 읽을 수 없는
           지점까지 온다(실측: 320px에서 게이트·서재 박스 3px, "소장을 원하는
           사람들"·"Silock에서 구매" 캡션 26px 겹침). 그래서 좁은 폰 전용으로 한 단계
           더 작은 값을 추가한다 — 아이콘 박스 사이·캡션 사이에 항상 최소 10px 이상
           여백이 남도록 실측 기반으로 계산한 값이다.
           (참고: 이 값들도 760px 폭까지는 고정이지만, 400px 경계 바로 위(401px~)부터는
           위 760px 블록의 원래 값이 이미 여유 있게 맞는다는 것을 실측으로 확인했다.) */
        @media (max-width: 400px) {
          .silock-motion-stage {
            --platform-size: 56px;
            --library-width: 62px;
            --library-right: 0px;
            --journey-start: 64px;
            --crowd-left: -6px;
            --crowd-width: 84px;
          }
          .silock-motion-caption-platform { width: 27%; }
        }

        /* 반응형 규칙표: 서재 배경 — 데스크톱 전체 노출 / 모바일 중앙부 중심 크롭 */
        .silock-library-bg { background-position: center; }
        @media (max-width: 640px) {
          .silock-library-bg { background-size: 180% 180%; background-position: center 30%; }
        }
        /* 마지막 설문 섹션 하단 푸터 — 좁은 화면에서는 한 줄에 브랜드명/멘트/이메일이
           다 들어가지 못해 justify-content: space-between + flex-wrap만으로는
           애매하게 줄바꿈된다. 멘트를 첫 줄에 단독으로, 브랜드명·이메일을 두 번째
           줄에 나란히 두도록 명시적으로 순서를 고정한다. */
        @media (max-width: 480px) {
          .silock-final-footer-note {
            order: -1;
            flex: 1 1 100%;
            text-align: center;
          }
        }
        /* ── 저사양 기기 라이트 모드 ──────────────────────────────
           .silock-lite는 detectLowPower()가 true인 아주 느린 기기에만 붙는다.
           GPU 합성으로 처리되는 transform/opacity 모션은 그대로 두고, 매 프레임
           다시 그리기(repaint)를 강제하는 무거운 요소 — 움직이는 요소에 걸린
           drop-shadow 필터, box-shadow를 애니메이션하는 게이트 펄스, blur 글로우,
           물결(ripple) — 만 덜어낸다. 성능이 넉넉한 폰은 이 클래스가 없어 100%
           동일하게 보인다. */
        .silock-lite .silock-concept-motion :is(
          .silock-symbol-person,
          .silock-symbol-traveler,
          .silock-archive-gate,
          .silock-transition-symbol
        ) {
          filter: none !important;
        }
        .silock-lite .silock-crowd-glow { animation: none !important; }
        .silock-lite .silock-archive-gate { animation: none !important; }
        .silock-lite .silock-gate-ripple { display: none !important; }

        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
        }
      `}</style>
      <EntranceSection
        activated={activated}
        onActivate={handleActivate}
        onSurveyOpen={handleSurveyOpen}
        onExplore={handleExplore}
        ctaRef={ctaRef}
        lowPower={lowPower}
      />
      <StorySections sectionRef={storyRef} onSurveyOpen={handleSurveyOpen} />
      <SurveyModal
        open={surveyOpen}
        onClose={handleSurveyClose}
        onComplete={handleSurveyComplete}
        returnFocusRef={ctaRef}
      />
      <AlreadyParticipatedModal
        open={showParticipatedNotice}
        onClose={handleParticipatedNoticeClose}
      />
    </div>
  );
}
