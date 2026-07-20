import roofImg from "./assets/roof.png";
import entranceLogoImg from "./assets/logo_main_org.png";
import blackLogoImg from "./assets/logo_main_black.png";
import libraryBGImg from "./assets/library.png"
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
function EntranceSection({ activated, onActivate, onSurveyOpen, onExplore, ctaRef }) {
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
  // 부팅을 바로 시작하지 않고, 화면이 꺼진 리더기 앞에 "켜시겠습니까?" 퀘스트창을
  // 먼저 띄운다 — 둘 중 어느 버튼을 눌러도(둘 다 긍정문) 같은 동작(부팅 시작)으로
  // 이어진다
  const [showQuest, setShowQuest] = useState(false);
  const libraryStartedRef = useRef(false);
  const handleQuestConfirm = useCallback(() => {
    setShowQuest(false);
    setBooting(true);
  }, []);
  // 화면이 켜진(bootDone) 뒤 잠깐의 유예를 두고서야 스크롤이 좌우 비교를 제어하게
  // 하던 방식은 폐기 — 화면이 켜지는 즉시 스크롤이 곧바로 좌우 비교를 제어한다.
  // 그 전(꺼진 화면~퀘스트~부팅) 구간의 스크롤만 막으면 된다.
  const comparisonReady = bootDone;

  const inLibraryPhase = showQuest || booting || bootDone;
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
  const comparisonProgress =
    comparisonBaseline === null
      ? 0
      : clamp01((libraryProgress - comparisonBaseline) / COMPARISON_RANGE);
  // 가득 찬 서재 전환이 90%에 도달하면 가치 문구와 CTA를 한 번에 노출한다.
  // 서로 다른 libraryProgress 구간을 쓰지 않고 실제 비교 전환률을 단일 기준으로
  // 삼아, 완성 화면에서 여러 스텝으로 나뉘어 보이지 않게 한다.
  const showCompletionContent = bootDone && comparisonProgress >= LIBRARY_KF.contentRevealAt;
  const showLibraryGuide = bootDone && !showCompletionContent;
  const showValue = showCompletionContent;
  const showCTA = showCompletionContent;

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
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useLayoutEffect(() => {
      if (!roofRef.current) return;

      const update = () => {
          const rect = roofRef.current.getBoundingClientRect();
          setRoofHeight(rect.height);
          setRoofWidth(rect.width);
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
      iterationsPerFrame: 4,
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

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
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
    const centerCol = (CONFIG.gridW - 1) / 2;
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

      const columnText = columnWords.join(" ");
      const rowChars = Array(CONFIG.gridH).fill(" ");
      // 남는 높이는 자간과 띄어쓰기 간격에 고르게 분산하고 마지막 실제 글자를
      // 항상 커튼의 마지막 줄에 놓아 모든 열의 시각적 길이를 동일하게 맞춘다
      for (let charIndex = 0; charIndex < columnText.length; charIndex++) {
        const rowIndex = columnText.length === 1
          ? CONFIG.gridH - 1
          : Math.round((charIndex * (CONFIG.gridH - 1)) / (columnText.length - 1));
        rowChars[rowIndex] = columnText[charIndex];
      }

      // 버튼(중앙) 기준 왼쪽 열은 -1, 오른쪽 열은 +1 — 같은 열의 모든 줄이
      // 동일하게 이 방향으로 밀려나 열 전체가 평행하게(11자로) 이동한다
      const spreadDir = i === centerCol ? 0 : i < centerCol ? -1 : 1;
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
        const off = document.createElement("canvas");
        off.width = off.height = Math.ceil(fontSize * 1.5);
        const octx = off.getContext("2d");
        octx.font = `500 ${fontSize}px "Noto Serif KR", serif`;
        octx.textAlign = "center";
        octx.textBaseline = "middle";
        octx.fillStyle = "#3a3a3a";
        octx.fillText(ch, off.width / 2, off.height / 2);
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
      const rect = canvas.getBoundingClientRect();
      return new Vec2((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
    }
    function onPointerDown(e) {
      const p = toLocal(e);

      const logoElement = entranceLogoRef.current;

      if (logoElement) {
        const logoRect = logoElement.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;

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
        const half = img.width / 2;
        ctx.setTransform(cos, sin, -sin, cos, p.pos.x, p.pos.y);
        ctx.drawImage(img, -half, -half);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);

    }
    const bottomRowParticles = [];
    for (let i = 0; i < CONFIG.gridW; i++) {
      bottomRowParticles.push(particles[getPointID(CONFIG.gridH - 1, i, CONFIG.gridH)]);
    }

    // 커튼이 중력으로 늘어져 자리를 잡을 때까지만 안내 문구 위치를 갱신하고,
    // 이후에는(마우스 상호작용으로 천이 흔들려도) 문구가 같이 흔들리지 않도록 고정한다
    let guidePositionSettled = false;
    let stableFrameCount = 0;
    let unsettledFrameCount = 0;
    let lastAvgBottomY = null;
    const SETTLE_MOVEMENT_THRESHOLD = 0.05; // px, 프레임 간 변화가 이보다 작으면 "정지"로 간주
    const SETTLE_STABLE_FRAMES_REQUIRED = 20; // 이만큼 연속으로 정지 상태여야 확정
    const SETTLE_MAX_FRAMES = 240; // 4초(60fps) 안에 못 정착해도 그 시점 값으로 강제 고정

    function updateGuidePosition(avgBottomY) {
      const guideEl = guideRef.current;
      if (!guideEl) return;
      // 커튼의 실제(물리 시뮬레이션 결과) 하단 위치 — 섹션 좌표계 기준
      const curtainVisualBottom = curtainTop + avgBottomY;
      const midpoint = (curtainVisualBottom + viewportHeight) / 2;
      guideEl.style.bottom = `${viewportHeight - midpoint}px`;
    }

    // 스크롤(=버튼 속으로 다가가는 진행률)이 커질수록 줄이 ㅅ자로 더 크게 벌어지도록
    // 열의 최대 수평 이동 거리를 캔버스 폭 기준으로 정해 둔다
    const maxSpreadPx = width * 0.55;

    function loop() {
      if (disposed) return;
      rafId = requestAnimationFrame(loop);
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

      if (!guidePositionSettled) {
        const avgBottomY =
          bottomRowParticles.reduce((sum, p) => sum + p.pos.y, 0) / bottomRowParticles.length;
        unsettledFrameCount++;
        if (
          lastAvgBottomY !== null &&
          Math.abs(avgBottomY - lastAvgBottomY) < SETTLE_MOVEMENT_THRESHOLD
        ) {
          stableFrameCount++;
        } else {
          stableFrameCount = 0;
        }
        lastAvgBottomY = avgBottomY;
        updateGuidePosition(avgBottomY);
        if (
          stableFrameCount >= SETTLE_STABLE_FRAMES_REQUIRED ||
          unsettledFrameCount >= SETTLE_MAX_FRAMES
        ) {
          guidePositionSettled = true;
        }
      }
    }
    rafId = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [roofHeight, roofWidth, curtainTop, viewportHeight]);

  // 활성화된 뒤에만 스크롤을 관찰한다 — 활성화 전에는 body 스크롤 자체가 잠겨 있다
  useEffect(() => {
    if (!activated) return;
    function onScroll() {
      const el = journeyWrapRef.current;
      if (!el) return;
      const total = el.offsetHeight - viewportHeight;
      if (total <= 0) return;
      const rect = el.getBoundingClientRect();
      const p = clamp01(-rect.top / total);
      setJourneyProgress(p);
      // 입구 연출이 끝나고 리더기 구간으로 넘어가는 순간(=같은 화면 안에서) 부팅을
      // 곧장 시작하지 않고, 먼저 "화면을 켜시겠습니까?" 퀘스트창을 띄운다
      if (!libraryStartedRef.current && p > ENTRANCE_PHASE_END) {
        libraryStartedRef.current = true;
        setShowQuest(true);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
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

  useEffect(() => {
    handleActivateRef.current = handleActivate;
  }, [handleActivate]);

return (
    <section style={{ position: "relative", width: "100%", background: COLOR.white }}>
      <div
        ref={journeyWrapRef}
        style={{
          position: "relative",
          height: activated ? `calc(${viewportHeight}px + ${TOTAL_SCROLL_VH}vh)` : viewportHeight,
        }}
      >
        <div style={{ position: "sticky", top: 0, height: viewportHeight, overflow: "hidden" }}>
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

          <div ref={guideRef} style={{ ...eStyles.guide, bottom: guideBottom, opacity: gateOpacity }}>
            {activated
              ? "아래로 스크롤하여 서재 안으로 들어가세요"
              : isMobile
              ? "화면을 터치해 입구를 찾아보세요"
              : "마우스를 움직여 입구를 찾아보세요"}
          </div>

          {activated && (
            <>
              <WhiteTransitionLayer progress={entranceProgress} />
              <LibraryBackdrop progress={entranceProgress} />
              <ReaderJourney
                entranceProgress={entranceProgress}
                booting={booting}
                bootDone={bootDone}
                showQuest={showQuest}
                onQuestConfirm={handleQuestConfirm}
                onBootComplete={() => setBootDone(true)}
                comparisonProgress={comparisonProgress}
                showGuide={showLibraryGuide}
                showValue={showValue}
                showCTA={showCTA}
                onSurveyOpen={onSurveyOpen}
                onExplore={onExplore}
                ctaRef={ctaRef}
                isMobile={isMobile}
                // 실제 보이는 화면 높이를 그대로 사용해야 낮은 노트북에서도
                // 리더기·안내 문구·CTA의 중간 지점 계산이 정확하게 유지된다.
                viewportHeight={viewportHeight}
                viewportWidth={viewportWidth}
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
    transform: "translateX(-50%)",
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
const LIBRARY_SCROLL_VH = 260;
const TOTAL_SCROLL_VH = ENTRANCE_SCROLL_VH + LIBRARY_SCROLL_VH;
const ENTRANCE_PHASE_END = ENTRANCE_SCROLL_VH / TOTAL_SCROLL_VH;

const GATE_KF = {
  // 0.55→0.4 지점에서 최대 배율 도달(확대 속도↑), 최대 배율 1.5→7(로고가 화면을
  // 가득 채울 정도로 커짐).
  scale: [[0, 1], [0.4, 7], [1, 7]],
  opacity: [[0, 1], [0.4, 1], [0.58, 0], [1, 0]],
};
// 버튼 속으로 다가갈수록(스크롤 진행률↑) 커튼 줄이 11자로(위아래 구분 없이 나란히)
// 더 크게 벌어지도록 하는 0~1 정규화 계수 — 실제 픽셀 이동량은 maxSpreadPx를 곱해서 구한다
const CURTAIN_SPREAD_KF = [[0, 0], [0.4, 1], [1, 1]];

const KF = {
  whiteOpacity: [[0, 0], [0.3, 0.25], [0.5, 0.75], [0.6, 1], [1, 1]],
  libraryOpacity: [[0, 0], [0.55, 0], [0.7, 1], [1, 1]],
  libraryBlur: [[0.6, 12], [0.8, 4], [1, 0]],
  readerOpacity: [[0, 0], [0.75, 0], [0.9, 1], [1, 1]],
  readerTranslateY: [[0, 40], [0.8, 40], [1, 0]],
};

function WhiteTransitionLayer({ progress }) {
  return <div style={{ position: "absolute", inset: 0, background: COLOR.white, opacity: interpolateKeyframes(progress, KF.whiteOpacity), pointerEvents: "none" }} />;
}
function LibraryBackdrop({ progress }) {
  const opacity = interpolateKeyframes(progress, KF.libraryOpacity);
  const blur = interpolateKeyframes(progress, KF.libraryBlur);
  return (
    <div
      className="silock-library-bg"
      style={{
        position: "absolute",
        inset: 0,
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
  showQuest,
  onQuestConfirm,
  onBootComplete,
  comparisonProgress,
  showGuide,
  showValue,
  showCTA,
  onSurveyOpen,
  onExplore,
  ctaRef,
  isMobile,
  viewportHeight,
  viewportWidth,
}) {
  const opacity = interpolateKeyframes(entranceProgress, KF.readerOpacity);
  const translateY = interpolateKeyframes(entranceProgress, KF.readerTranslateY);
  // 헤드라인(위)이나 안내 문구/가치 설명/CTA(아래)가 나타나거나 사라져도 리더기
  // 자체의 위치는 절대 흔들리지 않도록, 리더기는 화면 중앙에 독립적으로 고정하고
  // 위/아래 텍스트 영역은 리더기 높이를 기준으로 "리더기로부터 고정 간격"에만
  // 배치한다 — 같은 flex 그룹으로 묶어 함께 가운데 정렬하면 콘텐츠 유무에 따라
  // 전체 그룹 높이가 바뀌면서 리더기까지 밀려 움직이기 때문이다
  const { width: frameWidth, height: frameHeight } = computeReaderFrameSize(
    viewportWidth,
    viewportHeight,
    isMobile
  );
  // 리더기를 화면 전체의 정중앙에 두되, 화면이 낮아 위쪽 헤드라인이나 아래쪽
  // 캡션(안내 문구/가치 설명/CTA)이 잘릴 상황에서만 그만큼 위/아래로 밀어 넣는다
  const minCenterY = frameHeight / 2 + READER_TOP_MARGIN + READER_HEADLINE_GAP + READER_HEADLINE_RESERVE;
  const rawMaxCenterY = viewportHeight - frameHeight / 2 - READER_CAPTION_GAP - READER_CAPTION_RESERVE;
  const maxCenterY = Math.max(minCenterY, rawMaxCenterY);
  const readerCenterY = clamp(viewportHeight / 2, minCenterY, maxCenterY);
  const readerBottomY = readerCenterY + frameHeight / 2;
  // CTA는 리더기 하단과 화면 하단의 중간, 안내 문구는 다시 그 둘의 중간에 둔다.
  // 콘텐츠의 표시 여부와 무관하게 좌표가 고정되어 등장할 때 레이아웃이 흔들리지 않는다.
  // 리더기 자체가 커지는 화면에서는 주변 문구도 같은 비율로 확대한다.
  const headlineFontSize = clamp(Math.round(frameWidth * 0.115), 26, 44);
  const guideFontSize = clamp(Math.round(frameWidth * 0.052), 13, 18);
  const ctaFontSize = guideFontSize;
  const ctaButtonHeight = clamp(Math.round(ctaFontSize * 2.7), 44, 54);
  const ctaPaddingInline = clamp(Math.round(ctaFontSize * 2.2), 30, 44);
  const headlineWidth = clamp(Math.round(frameWidth * 1.75), 360, 760);
  const guideWidth = clamp(Math.round(frameWidth * 1.55), 340, 680);
  const ctaCenterY = readerBottomY + (viewportHeight - readerBottomY) / 2;
  const ctaTopY = ctaCenterY - ctaButtonHeight / 2;
  const ctaBottomY = ctaCenterY + ctaButtonHeight / 2;
  // 안내 문구는 버튼 중심이 아니라 실제 버튼 윗면과 리더기 하단 사이의 정중앙에 둔다.
  const ctaGuideCenterY = (readerBottomY + ctaTopY) / 2;
  const exploreCenterY = (ctaBottomY + viewportHeight) / 2;

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
          transform: `translate(-50%, -50%) translateY(${translateY}px)`,
          width: `min(${headlineWidth}px, 92vw)`,
        }}
      >
        <ValueHeadline visible={bootDone && showValue} isMobile={isMobile} fontSize={headlineFontSize} />
      </div>
      <div
        style={{
          position: "absolute",
          top: readerCenterY,
          left: "50%",
          transform: `translate(-50%, -50%) translateY(${translateY}px)`,
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
          transform: `translate(-50%, -50%) translateY(${translateY}px)`,
          width: `min(${guideWidth}px, 90vw)`,
          display: "grid",
        }}
      >
        <LoadingGuide visible={booting && !bootDone} fontSize={guideFontSize} />
        <ComparisonGuide visible={bootDone && showGuide} fontSize={guideFontSize} />
        <CTAGuide visible={bootDone && showValue} isMobile={isMobile} fontSize={guideFontSize} />
      </div>
      <div
        style={{
          position: "absolute",
          top: ctaCenterY,
          left: "50%",
          transform: `translate(-50%, -50%) translateY(${translateY}px)`,
        }}
      >
        <SurveyCTA
          visible={bootDone && showCTA}
          onClick={onSurveyOpen}
          buttonRef={ctaRef}
          fontSize={ctaFontSize}
          height={ctaButtonHeight}
          paddingInline={ctaPaddingInline}
        />
      </div>
      <ExploreArrow
        visible={bootDone && showCTA}
        onClick={onExplore}
        top={exploreCenterY}
        fontSize={guideFontSize}
      />
      {showQuest && (
        // 리더기 "화면 안"이 아니라 리더기 전체를 가로지르며 그 앞에 뜨는 독립
        // 레이어 — 진짜 게임 팝업창처럼 리더기보다 커도 되므로, 리더기의 폭/높이와
        // 무관하게 자체적으로 더 큰 크기를 갖는다 같은 readerCenterY를 기준으로
        // 리더기와 같은 중심에서 뜨도록 해 "리더기 앞에 떠 있다"는 인상을 준다
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.55)",
            pointerEvents: "auto",
            animation: "quest-fade-in 220ms ease-out",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: readerCenterY,
              left: "50%",
              transform: `translate(-50%, -50%) translateY(${translateY}px)`,
            }}
          >
            <ReaderQuestPrompt onConfirm={onQuestConfirm} />
          </div>
        </div>
      )}
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
// 꺼진 리더기 앞에 뜨는 "화면을 켜시겠습니까?" 퀘스트창 — 게임 NPC 대화창처럼
// 장식적인 카드에 물음과 두 개의 긍정형 버튼("네" / "YES")만 제시한다 어느
// 버튼을 눌러도 같은 동작(부팅 시작)으로 이어진다
// ============================================================
// 이제 이 컴포넌트는 리더기 "화면 안"이 아니라 ReaderJourney가 리더기 전체를
// 가로질러 띄우는 독립 레이어의 내용물이다 — 배경 딤 처리와 중앙 정렬은
// 호출부(ReaderJourney)가 담당하고, 여기서는 카드 자체만 그린다
function ReaderQuestPrompt({ onConfirm }) {
  return (
    <div style={questStyles.card}>
      <span style={{ ...questStyles.corner, ...questStyles.cornerTL }} />
      <span style={{ ...questStyles.corner, ...questStyles.cornerTR }} />
      <span style={{ ...questStyles.corner, ...questStyles.cornerBL }} />
      <span style={{ ...questStyles.corner, ...questStyles.cornerBR }} />

      <div style={questStyles.iconRow}>
        <span style={questStyles.iconLine} />
        <div style={questStyles.diamond}>
          <span style={questStyles.exclaim}>!</span>
        </div>
        <span style={questStyles.iconLine} />
      </div>
      <span style={questStyles.smallDiamond} />

      <p style={questStyles.question}>화면을 켜시겠습니까?</p>

      <div style={questStyles.buttonRow}>
        <button type="button" className="silock-quest-choice" style={questStyles.choiceButton} onClick={onConfirm}>
          네
        </button>
        <button type="button" className="silock-quest-choice" style={questStyles.choiceButton} onClick={onConfirm}>
          YES
        </button>
      </div>
    </div>
  );
}
const QUEST_TAN = "#B79A72";
const questStyles = {
  card: {
    position: "relative",
    width: "min(380px, 88vw)",
    background: "#FBF6EE",
    border: `1px solid ${QUEST_TAN}88`,
    borderRadius: 14,
    padding: "30px 26px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
    animation: "quest-pop-in 260ms ease-out",
  },
  corner: { position: "absolute", width: 14, height: 14, borderColor: QUEST_TAN, borderStyle: "solid" },
  cornerTL: { top: 6, left: 6, borderWidth: "1.8px 0 0 1.8px" },
  cornerTR: { top: 6, right: 6, borderWidth: "1.8px 1.8px 0 0" },
  cornerBL: { bottom: 6, left: 6, borderWidth: "0 0 1.8px 1.8px" },
  cornerBR: { bottom: 6, right: 6, borderWidth: "0 1.8px 1.8px 0" },
  iconRow: { display: "flex", alignItems: "center", gap: 10, width: "100%" },
  iconLine: { flex: 1, height: 1, background: `${QUEST_TAN}66` },
  diamond: {
    width: 42,
    height: 42,
    flexShrink: 0,
    border: `1.8px solid ${QUEST_TAN}`,
    background: "#FBF6EE",
    transform: "rotate(45deg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  exclaim: { transform: "rotate(-45deg)", color: COLOR.orange, fontWeight: 800, fontSize: 20, lineHeight: 1 },
  smallDiamond: {
    width: 7,
    height: 7,
    marginTop: 8,
    marginBottom: 20,
    border: `1.4px solid ${QUEST_TAN}`,
    transform: "rotate(45deg)",
  },
  question: { margin: "0 0 24px", fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 700, color: COLOR.black, textAlign: "center", lineHeight: 1.45, letterSpacing: "-0.02em" },
  buttonRow: { display: "flex", gap: 12, width: "100%" },
  choiceButton: {
    flex: 1,
    padding: "14px 0",
    borderRadius: 10,
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    transition: "background-color 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 100ms ease",
  },
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
  bookGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px 12px", width: "100%" },
  bookCover: {
    width: "100%",
    aspectRatio: "3 / 4.1",
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

function ComparisonGuide({ visible, fontSize }) {
  return (
    <div style={{ ...guideStyles.wrap, fontSize, opacity: visible ? 1 : 0 }}>
      <span className="silock-copy-segment">아래로 스크롤하여</span>{" "}
      <span className="silock-copy-segment">서재의 변화를 확인하세요</span>
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
function ValueHeadline({ visible, isMobile, fontSize }) {
  return (
    <h3
      style={{
        ...valueStyles.headline,
        fontSize,
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? 0 : 8}px)`,
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
function CTAGuide({ visible, fontSize }) {
  return (
    <p
      style={{
        ...valueStyles.sub,
        fontSize,
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? 0 : 8}px)`,
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

function SurveyCTA({ visible, onClick, buttonRef, fontSize, height, paddingInline }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      disabled={!visible}
      style={{
        ...ctaStyles.button,
        height,
        paddingInline,
        fontSize,
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? 0 : 14}px)`,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      참여하기
      <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function ExploreArrow({ visible, onClick, top, fontSize }) {
  const iconSize = fontSize + 5;
  return (
    <button
      type="button"
      className="silock-explore-arrow"
      onClick={onClick}
      aria-label="브랜드 이야기로 이동"
      disabled={!visible}
      style={{
        ...ctaStyles.exploreArrow,
        top,
        fontSize,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: `translate(-50%, -50%) translateY(${visible ? 0 : -6}px)`,
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
//  - contentRevealAt: 완성 화면의 문구와 버튼이 동시에 나타나는 비교 진행률
const LIBRARY_KF = {
  comparison: [[0.08, 0], [0.55, 1]],
  contentRevealAt: 0.9,
};

// ============================================================
// STEP9/10 : SurveyModal (신규)
// ============================================================
// 실제 프로젝트에서는 임베드 가능한 Google Form 링크로 교체하세요.
// (Google Form은 "응답 수집" 켠 상태에서 우측 상단 "보내기" → <> 아이콘 → embed src 사용)
const GOOGLE_FORM_URL = "https://forms.gle/bWd1c8Cbaem1n9Ue8";
const SURVEY_COMPLETED_STORAGE_KEY = "silock_survey_completed";

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
  const formLoadCountRef = useRef(0);
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
    formLoadCountRef.current = 0;
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
                  formLoadCountRef.current += 1;
                  setFormStatus("loaded");
                  if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
                  // Google Form은 제출 완료 후 iframe 안에서 확인 화면으로 다시
                  // 이동한다. 첫 로드는 설문 표시, 두 번째 로드는 제출 완료로 본다.
                  if (formLoadCountRef.current > 1) onComplete();
                }}
                onError={() => setFormStatus("error")}
              />
            </>
          )}
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
    description: "독자는 구매한 작품이 사라질 걱정을 덜고 마음에 드는 콘텐츠를 안심하고 소장할 수 있습니다",
    descriptionSegments: [
      ["독자는 구매한 작품이 사라질 걱정을 덜고", "마음에 드는 콘텐츠를", "안심하고 소장할 수 있습니다"],
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
    answer: "그 상태를 가능하게 만드는 것이 Silock의 핵심 목표입니다. 구체적인 저장 방식과 권리 범위, 접근 구조는 독자와 창작자의 의견을 바탕으로 MVP에서 검증하고 있습니다",
    answerSegments: [
      ["그 상태를 가능하게 만드는 것이", "Silock의 핵심 목표입니다."],
      ["구체적인 저장 방식과 권리 범위, 접근 구조는", "독자와 창작자의 의견을 바탕으로", "MVP에서 검증하고 있습니다"],
    ],
  },
  {
    question: "다른 플랫폼에서 구매한 콘텐츠도 가져올 수 있나요?",
    answer: "아니요. 지속 소장은 Silock에서 구매한 콘텐츠에만 적용됩니다. 다른 플랫폼의 구매 내역이나 콘텐츠를 가져와 보관하는 서비스는 아닙니다",
    answerSegments: [
      ["아니요."],
      ["지속 소장은", "Silock에서 구매한 콘텐츠에만 적용됩니다."],
      ["다른 플랫폼의 구매 내역이나 콘텐츠를", "가져와 보관하는 서비스는 아닙니다"],
    ],
  },
  {
    question: "어떤 콘텐츠부터 시작하나요?",
    answer: "Silock은 웹툰·웹소설·전자책부터 시작합니다. 이후 지속 소장이 필요한 다른 디지털 창작물로 범위를 넓힐 계획입니다",
    answerSegments: [
      ["Silock은", "웹툰·웹소설·전자책부터 시작합니다."],
      ["이후 지속 소장이 필요한", "다른 디지털 창작물로 범위를 넓힐 계획입니다"],
    ],
  },
  {
    question: "지금은 어느 단계인가요?",
    answer: "현재는 고객 문제와 이용 의향을 확인하는 초기 검증 단계입니다. 설문 결과는 지속 소장 방식과 첫 MVP의 우선순위를 결정하는 데 사용됩니다",
    answerSegments: [
      ["현재는 고객 문제와 이용 의향을 확인하는", "초기 검증 단계입니다."],
      ["설문 결과는 지속 소장 방식과", "첫 MVP의 우선순위를 결정하는 데 사용됩니다"],
    ],
  },
];

function MeaningfulCopy({ sentences }) {
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
      {sentenceIndex < sentences.length - 1 ? " " : null}
    </Fragment>
  ));
}

function BrandConceptMotion() {
  const crowd = [28, 34, 30, 38, 32, 36, 27, 33];
  const travelers = [0, 1, 2, 3, 4];

  return (
    <div
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
          <strong>소장을 원하는 사람들</strong>
          <span>독자와 창작자</span>
        </div>
        <div className="silock-motion-caption silock-motion-caption-platform">
          <strong>Silock에서 구매</strong>
          <span>지속 소장을 제공하는 플랫폼</span>
        </div>
        <div className="silock-motion-caption silock-motion-caption-library">
          <strong>나의 서재</strong>
          <span>나만의 소장 서재</span>
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
          <span style={storyStyles.orangeText}>나의 서재에 오래 소장</span>
        </h2>
        <p style={storyStyles.lead}>
          <span className="silock-copy-segment">사람을 닮은 심볼은</span>{" "}
          <span className="silock-copy-segment">독자와 창작자를,</span>
          <br />
          <span className="silock-copy-segment">네모난 프레임은</span>{" "}
          <span className="silock-copy-segment">각자의 서재로 이어지는 Silock을 뜻합니다</span>
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
                <MeaningfulCopy sentences={item.answerSegments} />
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
      <footer style={storyStyles.footer}>
        <span>SILOCK</span>
        <span>
          <span className="silock-copy-segment">온라인도 오프라인처럼 안심하고 소장하세요</span>
        </span>
        <a href="mailto:silockload@gmail.com" style={storyStyles.footerEmail}>silockload@gmail.com</a>
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
  cardNumber: { color: COLOR.orange, fontSize: "clamp(16px, 1.35vw, 20px)", fontWeight: 800, lineHeight: 1, letterSpacing: "0.12em" },
  cardTitle: { minHeight: "2.6em", margin: "28px 0 12px", color: COLOR.black, fontSize: "clamp(19px, 2vw, 25px)", lineHeight: 1.3, letterSpacing: "-0.035em", display: "flex", alignItems: "flex-end" },
  cardDescription: { margin: 0, color: "#686868", fontSize: 15, lineHeight: 1.7, letterSpacing: "-0.018em" },
  faqIntro: { position: "sticky", top: 96, alignSelf: "start" },
  sectionTitle: { margin: 0, color: COLOR.black, fontSize: "clamp(36px, 4.8vw, 62px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.05em" },
  sectionDescription: { maxWidth: 380, margin: "22px 0 0", color: "#686868", fontSize: 16, lineHeight: 1.7 },
  faqList: { borderTop: `1px solid ${COLOR.neutralGray}` },
  surveyInner: { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" },
  surveyNote: { margin: "clamp(22px, 2.4vw, 34px) 0 0", color: "rgba(255,255,255,0.58)", fontSize: "clamp(14px, 1.25vw, 17px)", lineHeight: 1.5 },
  footer: { width: "min(1160px, calc(100% - 48px))", margin: "80px auto 0", padding: "24px 0", borderTop: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.48)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 24, fontSize: 12 },
  footerEmail: { color: "inherit", textDecoration: "none" },
};

function AlreadyParticipatedPage() {
  return (
    <main style={participatedStyles.page}>
      <img src={entranceLogoImg} alt="Silock" style={participatedStyles.logo} />
      <h1 style={participatedStyles.title}>이미 참여하셨습니다</h1>
      <p style={participatedStyles.description}>
        소중한 의견을 보내주셔서 감사합니다
        <br />
        Silock의 시작 소식을 기다려주세요
      </p>
    </main>
  );
}

const participatedStyles = {
  page: {
    width: "100%",
    minHeight: "100vh",
    height: "100dvh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    boxSizing: "border-box",
    background: COLOR.black,
    color: COLOR.white,
    textAlign: "center",
  },
  logo: { width: "clamp(150px, 22vw, 260px)", height: "auto", objectFit: "contain", marginBottom: 24 },
  title: { margin: 0, fontSize: "clamp(26px, 4vw, 42px)", lineHeight: 1.25, letterSpacing: "-0.03em" },
  description: { margin: "16px 0 0", fontSize: "clamp(14px, 1.8vw, 18px)", lineHeight: 1.7, color: "rgba(255,255,255,0.72)" },
};

// ============================================================
// 최상위: EntranceSection(입구+스크롤 전환) + LibrarySection
// ============================================================
export default function SilockLibraryDemo() {
  const [activated, setActivated] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(readSurveyCompleted);
  const ctaRef = useRef(null);
  const storyRef = useRef(null);

  useEffect(() => {
    // 입구 활성화 전 스크롤 잠금 + 설문 모달 열린 동안 배경 스크롤 잠금
    document.body.style.overflow = !activated || surveyOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [activated, surveyOpen]);

  const handleActivate = useCallback(() => {
    trackEvent("entrance_activated");
    setActivated(true);
    setTimeout(() => window.scrollBy({ top: 80, behavior: "smooth" }), 400);
  }, []);

  const handleSurveyOpen = useCallback((event) => {
    if (event?.currentTarget) ctaRef.current = event.currentTarget;
    trackEvent("survey_open");
    setSurveyOpen(true);
  }, []);
  const handleSurveyClose = useCallback(() => setSurveyOpen(false), []);
  const handleExplore = useCallback(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    storyRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, []);
  const handleSurveyComplete = useCallback(() => {
    saveSurveyCompleted();
    trackEvent("survey_complete");
    setSurveyOpen(false);
    setSurveyCompleted(true);
  }, []);

  if (surveyCompleted) return <AlreadyParticipatedPage />;

  return (
    <div
      className="silock-app"
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
        @keyframes quest-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes quest-pop-in { from { opacity: 0; transform: scale(0.9) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }

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

        .silock-quest-choice {
          border: 1px solid rgba(0,0,0,0.16);
          background: ${COLOR.white};
          color: ${COLOR.black};
        }
        @media (hover: hover) and (pointer: fine) {
          .silock-quest-choice:hover {
            border-color: ${COLOR.orange};
            background: ${COLOR.orange};
            color: ${COLOR.white};
            box-shadow: 0 8px 18px ${COLOR.orange}55;
          }
        }
        .silock-quest-choice:active,
        .silock-quest-choice:focus-visible {
          border-color: ${COLOR.orange};
          background: ${COLOR.orange};
          color: ${COLOR.white};
          box-shadow: 0 8px 18px ${COLOR.orange}55;
          transform: scale(0.98);
          outline: none;
        }
        @media (pointer: coarse) {
          .silock-quest-choice { min-height: 52px; }
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
        .silock-value-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }
        .silock-faq-layout {
          display: grid;
          grid-template-columns: minmax(260px, 0.8fr) minmax(420px, 1.2fr);
          gap: clamp(56px, 9vw, 130px);
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
          grid-template-columns: 34px minmax(0, 1fr);
          align-items: baseline;
          gap: 12px;
        }
        .silock-faq-question small {
          color: ${COLOR.orange};
          font-size: 10px;
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
          .silock-faq-question { grid-template-columns: 28px minmax(0, 1fr); gap: 8px; }
        }

        /* 반응형 규칙표: 서재 배경 — 데스크톱 전체 노출 / 모바일 중앙부 중심 크롭 */
        .silock-library-bg { background-position: center; }
        @media (max-width: 640px) {
          .silock-library-bg { background-size: 180% 180%; background-position: center 30%; }
        }
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
      />
      <StorySections sectionRef={storyRef} onSurveyOpen={handleSurveyOpen} />
      <SurveyModal
        open={surveyOpen}
        onClose={handleSurveyClose}
        onComplete={handleSurveyComplete}
        returnFocusRef={ctaRef}
      />
    </div>
  );
}
