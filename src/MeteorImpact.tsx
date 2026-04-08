import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useMemo } from "react";

function sr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const W = 1920, H = 1080;
const EX = 960, EY = 590, ER = 290;
const IX = EX + 40, IY = EY - 60;
const IMPACT = 15;
const MX0 = W + 280, MY0 = -180;

export const MeteorImpact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const stars = useMemo(() =>
    Array.from({ length: 350 }, (_, i) => ({
      x: sr(i * 3) * W, y: sr(i * 3 + 1) * H,
      r: sr(i * 3 + 2) * 1.8 + 0.2,
      op: sr(i * 3 + 0.5) * 0.5 + 0.3,
      phase: sr(i * 3 + 0.8) * Math.PI * 2,
    })), []);

  const smokeP = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      angle: sr(i * 7) * Math.PI * 2,
      speed: sr(i * 7 + 1) * 180 + 60,
      size: sr(i * 7 + 2) * 40 + 15,
      gray: sr(i * 7 + 3) * 0.4 + 0.1,
      life: sr(i * 7 + 4) * 0.6 + 0.4,
      drift: (sr(i * 7 + 5) - 0.5) * 60,
    })), []);

  const debrisP = useMemo(() =>
    Array.from({ length: 120 }, (_, i) => ({
      angle: sr(i * 11) * Math.PI * 2,
      speed: sr(i * 11 + 1) * 400 + 100,
      size: sr(i * 11 + 2) * 6 + 1,
      color: ['#332211','#554422','#776633','#998844','#ccaa66','#ffcc88'][Math.floor(sr(i * 11 + 3) * 6)],
      life: sr(i * 11 + 4) * 0.7 + 0.3,
    })), []);

  const fireP = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      angle: sr(i * 13) * Math.PI * 2,
      speed: sr(i * 13 + 1) * 300 + 100,
      size: sr(i * 13 + 2) * 20 + 8,
      life: sr(i * 13 + 3) * 0.5 + 0.3,
    })), []);

  // ── Meteor ──
  const meteorT = interpolate(t, [5, IMPACT], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.in(Easing.exp),
  });
  const meteorX = MX0 + (IX - MX0) * meteorT;
  const meteorY = MY0 + (IY - MY0) * meteorT;
  const meteorSize = interpolate(meteorT, [0, 1], [3, 82]);
  const meteorVisible = t >= 5 && t < IMPACT;
  const meteorRot = frame * 2.5;

  const trailAt = (f: number) => {
    const tp = Math.max(0, meteorT - f);
    return { x: MX0 + (IX - MX0) * tp, y: MY0 + (IY - MY0) * tp };
  };
  const tr1 = trailAt(0.04), tr2 = trailAt(0.12), tr3 = trailAt(0.26);

  const pts = [
    [1.0, 0.0],[0.62, 0.88],[-0.18, 1.05],[-0.88, 0.52],
    [-1.05, -0.22],[-0.48, -0.98],[0.62, -0.78],
  ].map(([px, py]) => `${px! * meteorSize},${py! * meteorSize}`).join(" ");

  // ── Camera ──
  const camScale = interpolate(t,
    [0, 7, 13, IMPACT, IMPACT + 0.25, IMPACT + 2, IMPACT + 9],
    [0.9, 1.0, 1.08, 1.15, 1.55, 1.28, 1.1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const camFX = interpolate(t, [11, IMPACT, IMPACT + 7], [EX, IX, EX], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const camFY = interpolate(t, [11, IMPACT, IMPACT + 7], [EY, IY, EY], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Shake ──
  const shakeAmt = interpolate(t, [IMPACT, IMPACT + 0.07, IMPACT + 0.6, IMPACT + 4], [0, 38, 28, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shakeX = t > IMPACT && t < IMPACT + 4 ? Math.sin(frame * 4.3) * shakeAmt : 0;
  const shakeY = t > IMPACT && t < IMPACT + 4 ? Math.cos(frame * 3.1) * shakeAmt * 0.75 : 0;
  const shakeRot = t > IMPACT && t < IMPACT + 3 ? Math.sin(frame * 2.7) * shakeAmt * 0.04 : 0;

  // ── Flash ──
  const flash = interpolate(t, [IMPACT, IMPACT + 0.1, IMPACT + 0.55, IMPACT + 2.5], [0, 1, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Fireball ──
  const fbR = interpolate(t, [IMPACT, IMPACT + 0.28, IMPACT + 9], [0, 480, 750], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const fbOp = interpolate(t, [IMPACT, IMPACT + 0.18, IMPACT + 6, IMPACT + 11], [0, 1, 0.88, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Shockwaves (atmospheric, subtle) ──
  const wt = Math.max(0, t - IMPACT);
  const w1r = interpolate(wt, [0, 3.5], [0, 870], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const w1op = interpolate(wt, [0, 0.2, 2.5, 3.5], [0, 0.6, 0.35, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const w2r = interpolate(Math.max(0, wt - 0.4), [0, 4.0], [0, 1020], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const w2op = interpolate(Math.max(0, wt - 0.4), [0, 0.25, 3.5, 4], [0, 0.45, 0.28, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Earth heat ──
  const earthHeat = interpolate(t, [IMPACT, IMPACT + 2.5, IMPACT + 15], [0, 1, 0.72], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Smoke / dust ──
  const smokeT = Math.max(0, t - IMPACT);
  const dustT = Math.max(0, t - IMPACT - 4);
  const dustR = interpolate(dustT, [0, 6], [0, ER * 1.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dustOp = interpolate(dustT, [0, 2, 9, 14], [0, 0.65, 0.82, 0.58], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Pre-impact atmosphere glow ──
  const preGlow = interpolate(t, [13.5, 14.8, IMPACT], [0, 0.22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Lens flare ──
  const flareI = meteorVisible
    ? interpolate(meteorT, [0.4, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : interpolate(t, [IMPACT, IMPACT + 0.3, IMPACT + 2], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flareSX = meteorVisible ? meteorX : IX;
  const flareSY = meteorVisible ? meteorY : IY;
  const flareAX = W / 2 - flareSX;
  const flareAY = H / 2 - flareSY;

  // ── Chromatic aberration ──
  const chroma = interpolate(t, [IMPACT, IMPACT + 0.15, IMPACT + 1.5], [0, 9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Darkness / fade ──
  const darkness = interpolate(t, [IMPACT + 13, IMPACT + 17], [0, 0.72], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeBlack = interpolate(t, [28, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── Texts ──
  const warningOp = interpolate(t, [1, 1.8, 7.5, 8.5], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const warningBlink = Math.floor(t * 2.5) % 2 === 0 ? 1 : 0.25;
  const etaS = Math.max(0, Math.ceil(IMPACT - t));
  const impactScale = interpolate(t, [IMPACT + 0.05, IMPACT + 0.6], [3.0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.exp) });
  const impactOp = interpolate(t, [IMPACT + 0.05, IMPACT + 0.55, IMPACT + 2.8, IMPACT + 3.8], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const endOp = interpolate(t, [29, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Earth colors (desaturated, realistic)
  const eR = Math.round(8 + earthHeat * 158);
  const eG = Math.round(52 - earthHeat * 46);
  const eB = Math.round(138 - earthHeat * 126);

  const twinkle = (op: number, phase: number) => op * (0.75 + 0.25 * Math.sin(t * 2.0 + phase));
  const grainSeed = frame % 200;

  return (
    <div style={{
      width: W, height: H, overflow: "hidden",
      backgroundColor: "#000008", position: "relative",
      // Cinematic color grade
      filter: "contrast(1.08) saturate(0.78) brightness(0.94)",
    }}>
      <svg width={W} height={H} style={{
        position: "absolute", top: shakeY, left: shakeX,
        transform: `scale(${camScale}) rotate(${shakeRot}deg)`,
        transformOrigin: `${camFX}px ${camFY}px`,
      }}>
        <defs>
          {/* Earth ocean */}
          <radialGradient id="eg" cx="37%" cy="29%" r="70%">
            <stop offset="0%" stopColor={`rgb(${eR+45},${eG+52},${eB+15})`}/>
            <stop offset="30%" stopColor={`rgb(${eR+12},${eG+18},${Math.max(0,eB-8)})`}/>
            <stop offset="70%" stopColor={`rgb(${eR+4},${eG+4},${Math.max(0,eB-30)})`}/>
            <stop offset="100%" stopColor={`rgb(${Math.max(0,eR-8)},${Math.max(0,eG-22)},${Math.max(0,eB-55)})`}/>
          </radialGradient>
          {/* Night side */}
          <radialGradient id="ns" cx="70%" cy="65%" r="56%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.92)"/>
            <stop offset="52%" stopColor="rgba(0,0,0,0.55)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
          </radialGradient>
          {/* Atmosphere (Rayleigh) */}
          <radialGradient id="atmo" cx="50%" cy="50%" r="50%">
            <stop offset="76%" stopColor="transparent"/>
            <stop offset="87%" stopColor={`rgba(${45+earthHeat*210},${Math.max(0,130-earthHeat*112)},255,0.52)`}/>
            <stop offset="94%" stopColor={`rgba(${22+earthHeat*140},${Math.max(0,75-earthHeat*60)},${Math.max(0,200-earthHeat*185)},0.3)`}/>
            <stop offset="100%" stopColor="transparent"/>
          </radialGradient>
          {/* Specular */}
          <radialGradient id="spec" cx="32%" cy="27%" r="25%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </radialGradient>
          {/* Fireball */}
          <radialGradient id="fb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity={fbOp}/>
            <stop offset="8%" stopColor="#FFFFC0" stopOpacity={fbOp}/>
            <stop offset="25%" stopColor="#FFCC44" stopOpacity={fbOp * 0.96}/>
            <stop offset="50%" stopColor="#FF5500" stopOpacity={fbOp * 0.85}/>
            <stop offset="72%" stopColor="#AA2200" stopOpacity={fbOp * 0.58}/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          {/* Meteor surface */}
          <radialGradient id="mc" cx="30%" cy="26%" r="72%">
            <stop offset="0%" stopColor="#FFFFF0"/>
            <stop offset="10%" stopColor="#FFE060"/>
            <stop offset="30%" stopColor="#FF8800"/>
            <stop offset="58%" stopColor="#AA4410"/>
            <stop offset="78%" stopColor="#663310"/>
            <stop offset="100%" stopColor="#1C0A04"/>
          </radialGradient>
          {/* Meteor plasma halo */}
          <radialGradient id="mph" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFE8" stopOpacity="0.92"/>
            <stop offset="25%" stopColor="#FFA000" stopOpacity="0.62"/>
            <stop offset="62%" stopColor="#FF3300" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          {/* Lens flare */}
          <radialGradient id="lf" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,240,200,0.55)"/>
            <stop offset="40%" stopColor="rgba(255,200,100,0.18)"/>
            <stop offset="100%" stopColor="transparent"/>
          </radialGradient>
          <linearGradient id="streak" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent"/>
            <stop offset="45%" stopColor={`rgba(255,240,220,${flareI * 0.12})`}/>
            <stop offset="50%" stopColor={`rgba(255,255,255,${flareI * 0.28})`}/>
            <stop offset="55%" stopColor={`rgba(255,240,220,${flareI * 0.12})`}/>
            <stop offset="100%" stopColor="transparent"/>
          </linearGradient>
          {/* Dust */}
          <radialGradient id="dust" cx="50%" cy="50%" r="50%">
            <stop offset="48%" stopColor="transparent"/>
            <stop offset="70%" stopColor={`rgba(88,58,25,${dustOp})`}/>
            <stop offset="85%" stopColor={`rgba(52,30,10,${dustOp * 0.68})`}/>
            <stop offset="100%" stopColor="transparent"/>
          </radialGradient>
          {/* Vignette */}
          <radialGradient id="vig" cx="50%" cy="50%" r="70%">
            <stop offset="55%" stopColor="transparent"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0.78)"/>
          </radialGradient>
          {/* Earth clip */}
          <clipPath id="ec"><circle cx={EX} cy={EY} r={ER}/></clipPath>

          {/* Earth texture displacement */}
          <filter id="etex" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.022" numOctaves="6" seed="7" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G"/>
          </filter>

          {/* Bloom */}
          <filter id="bloom" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="16" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="bigBloom" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="38" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Film grain (seed changes every frame) */}
          <filter id="grain" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="4"
              seed={grainSeed} stitchTiles="stitch" result="noise"/>
            <feColorMatrix type="saturate" values="0" in="noise"/>
          </filter>
        </defs>

        {/* Space */}
        <rect x={0} y={0} width={W} height={H} fill="#00000E"/>

        {/* Stars */}
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white"
            opacity={twinkle(s.op, s.phase) * (1 - darkness * 0.8)}/>
        ))}

        {/* Earth atmosphere limb */}
        <circle cx={EX} cy={EY} r={ER + 72} fill="url(#atmo)"/>

        {/* Earth body */}
        <circle cx={EX} cy={EY} r={ER} fill="url(#eg)" filter="url(#etex)"/>

        {/* Continents */}
        <g clipPath="url(#ec)" opacity={Math.max(0, 1 - earthHeat * 2.5)}>
          {/* Africa */}
          <path d={`M ${EX+12} ${EY-82} L ${EX+58} ${EY-98} L ${EX+82} ${EY-52} L ${EX+88} ${EY+18} L ${EX+68} ${EY+112} L ${EX+22} ${EY+134} L ${EX-12} ${EY+92} L ${EX-24} ${EY+22} L ${EX-2} ${EY-30} Z`}
            fill="rgba(72,95,32,0.62)"/>
          <ellipse cx={EX+110} cy={EY+68} rx={12} ry={28} fill="rgba(68,92,28,0.52)"/>
          {/* Europe */}
          <path d={`M ${EX-58} ${EY-132} L ${EX-22} ${EY-128} L ${EX+12} ${EY-102} L ${EX-2} ${EY-82} L ${EX-42} ${EY-90} L ${EX-78} ${EY-108} Z`}
            fill="rgba(65,90,30,0.58)"/>
          {/* Asia */}
          <path d={`M ${EX+78} ${EY-148} L ${EX+178} ${EY-112} L ${EX+222} ${EY-58} L ${EX+162} ${EY-28} L ${EX+100} ${EY-52} L ${EX+78} ${EY-98} Z`}
            fill="rgba(62,88,28,0.58)"/>
          {/* North America */}
          <path d={`M ${EX-195} ${EY-138} L ${EX-148} ${EY-128} L ${EX-112} ${EY-72} L ${EX-148} ${EY+8} L ${EX-200} ${EY-22} L ${EX-225} ${EY-88} Z`}
            fill="rgba(68,92,35,0.58)"/>
          {/* South America */}
          <path d={`M ${EX-158} ${EY+32} L ${EX-122} ${EY+22} L ${EX-102} ${EY+74} L ${EX-122} ${EY+155} L ${EX-164} ${EY+122} L ${EX-178} ${EY+68} Z`}
            fill="rgba(58,82,22,0.55)"/>
          {/* Australia */}
          <path d={`M ${EX+172} ${EY+42} L ${EX+225} ${EY+32} L ${EX+245} ${EY+78} L ${EX+215} ${EY+115} L ${EX+168} ${EY+98} L ${EX+158} ${EY+62} Z`}
            fill="rgba(155,115,42,0.52)"/>
          {/* Antarctica */}
          <ellipse cx={EX} cy={EY+ER-20} rx={108} ry={30} fill="rgba(225,240,252,0.75)"/>
        </g>

        {/* Clouds */}
        <g clipPath="url(#ec)" opacity={Math.max(0, 1 - earthHeat * 2.0)}>
          {[
            [EX-72, EY-162, 88, 24],[EX+115, EY-58, 78, 20],[EX-148, EY+58, 92, 22],
            [EX+48, EY+148, 82, 19],[EX+195, EY-134, 62, 17],[EX-225, EY-72, 68, 16],
            [EX-32, EY-240, 58, 15],[EX+140, EY+48, 55, 14],
          ].map(([cx, cy, rx, ry], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(255,255,255,0.21)"/>
          ))}
        </g>

        {/* Polar ice */}
        <ellipse cx={EX} cy={EY-ER+18} rx={112} ry={30} clipPath="url(#ec)"
          fill={`rgba(222,242,255,${0.68 * Math.max(0, 1 - earthHeat * 1.15)})`}/>

        {/* Night side */}
        <circle cx={EX} cy={EY} r={ER} fill="url(#ns)"/>

        {/* Specular */}
        <circle cx={EX} cy={EY} r={ER} fill="url(#spec)"/>

        {/* City lights on dark side */}
        <g clipPath="url(#ec)" opacity={Math.max(0, 0.4 - earthHeat)}>
          {[[EX+155,EY-65,3],[EX+180,EY-40,2],[EX+200,EY-80,2.5],[EX+165,EY-55,1.5],[EX+215,EY-30,2]].map(([cx,cy,r],i)=>(
            <circle key={i} cx={cx} cy={cy} r={r} fill="rgba(255,240,180,0.8)"/>
          ))}
        </g>

        {/* Pre-impact atmosphere heating */}
        {preGlow > 0 && <rect x={0} y={0} width={W} height={H} fill="#FF8833" opacity={preGlow}/>}

        {/* ── METEOR ── */}
        {meteorVisible && (() => {
          const tp = Math.pow(meteorT, 1.4);
          return (
            <>
              {/* Trail layers */}
              <line x1={tr3.x} y1={tr3.y} x2={meteorX} y2={meteorY} stroke="rgba(255,100,10,0.07)" strokeWidth={meteorSize * 15} strokeLinecap="round"/>
              <line x1={tr2.x} y1={tr2.y} x2={meteorX} y2={meteorY} stroke="rgba(255,160,40,0.30)" strokeWidth={meteorSize * 5.5} strokeLinecap="round"/>
              <line x1={tr1.x} y1={tr1.y} x2={meteorX} y2={meteorY} stroke="rgba(255,248,180,0.75)" strokeWidth={meteorSize * 1.5} strokeLinecap="round"/>
              {/* Plasma halo */}
              <circle cx={meteorX} cy={meteorY} r={meteorSize * 3.8} fill="url(#mph)" filter="url(#bigBloom)" opacity={tp}/>
              {/* Ionization tip */}
              <circle cx={meteorX - meteorSize*0.3} cy={meteorY - meteorSize*0.3} r={meteorSize * 2.0} fill="rgba(190,225,255,0.35)" filter="url(#bloom)"/>
              {/* Rocky body */}
              <g transform={`translate(${meteorX},${meteorY}) rotate(${meteorRot})`}>
                <polygon points={pts} fill="rgba(0,0,0,0.4)" transform="translate(4,5)"/>
                <polygon points={pts} fill="url(#mc)"/>
                <circle cx={-meteorSize*0.28} cy={meteorSize*0.22} r={meteorSize*0.24} fill="rgba(0,0,0,0.48)"/>
                <circle cx={meteorSize*0.32} cy={-meteorSize*0.38} r={meteorSize*0.17} fill="rgba(0,0,0,0.38)"/>
                <circle cx={-meteorSize*0.52} cy={-meteorSize*0.42} r={meteorSize*0.13} fill="rgba(0,0,0,0.32)"/>
                <ellipse cx={-meteorSize*0.18} cy={-meteorSize*0.22} rx={meteorSize*0.32} ry={meteorSize*0.22} fill="rgba(255,255,200,0.28)"/>
              </g>
            </>
          );
        })()}

        {/* Lens flare */}
        {flareI > 0.05 && (
          <>
            <circle cx={flareSX} cy={flareSY} r={meteorSize * 5 + 50} fill="url(#lf)" opacity={flareI * 0.4}/>
            <rect x={0} y={flareSY - 1.5} width={W} height={3} fill="url(#streak)" opacity={flareI}/>
            {[0.2, 0.45, 0.65, 0.85].map((frac, i) => (
              <circle key={i}
                cx={flareSX + flareAX * frac} cy={flareSY + flareAY * frac}
                r={[25, 18, 40, 12][i]}
                fill="rgba(180,200,255,0.25)" stroke="rgba(255,220,150,0.35)" strokeWidth={2}
                opacity={[0.25, 0.18, 0.15, 0.2][i]! * flareI}/>
            ))}
          </>
        )}

        {/* Fireball */}
        {t >= IMPACT && <circle cx={IX} cy={IY} r={fbR} fill="url(#fb)" filter="url(#bloom)"/>}

        {/* Atmospheric shockwave (subtle) */}
        {t >= IMPACT && (
          <>
            <circle cx={EX} cy={EY} r={w1r} fill="none"
              stroke="rgba(200,220,255,0.48)"
              strokeWidth={interpolate(wt, [0,3.5],[20,2],{extrapolateLeft:"clamp",extrapolateRight:"clamp"})}
              opacity={w1op} filter="url(#glow)"/>
            <circle cx={EX} cy={EY} r={w2r} fill="none"
              stroke="rgba(180,200,240,0.32)"
              strokeWidth={interpolate(Math.max(0,wt-0.4),[0,4],[12,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"})}
              opacity={w2op}/>
          </>
        )}

        {/* Smoke (big, soft puffs) */}
        {t >= IMPACT && t < IMPACT + 14 && smokeP.map((p, i) => {
          const pt = t - IMPACT;
          const decel = Math.pow(Math.max(0, 1 - pt / 10), 1.2);
          const px = IX + Math.cos(p.angle) * p.speed * pt * decel + p.drift * pt * 0.1;
          const py = IY + Math.sin(p.angle) * p.speed * pt * decel - 80 * pt;
          const pOp = interpolate(pt, [0, p.life * 1.5, p.life * 14], [0, 0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const pr = Math.max(0, p.size * (1 + pt * 0.5));
          const g = Math.round(p.gray * 80 + 20);
          return pr > 0 ? <circle key={i} cx={px} cy={py} r={pr} fill={`rgba(${g+30},${g+15},${g},${pOp})`}/> : null;
        })}

        {/* Debris */}
        {t >= IMPACT && t < IMPACT + 12 && debrisP.map((p, i) => {
          const pt = t - IMPACT;
          const decel = Math.pow(Math.max(0, 1 - pt / 9), 1.3);
          const px = IX + Math.cos(p.angle) * p.speed * pt * decel;
          const py = IY + Math.sin(p.angle) * p.speed * pt * decel + 100 * pt * pt - 120 * pt;
          const pOp = interpolate(pt, [0, p.life * 1.2, p.life * 12], [0, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const pr = Math.max(0, p.size * (1 - pt * 0.06));
          return pr > 0.3 ? <circle key={i} cx={px} cy={py} r={pr} fill={p.color} opacity={pOp}/> : null;
        })}

        {/* Fire (brief) */}
        {t >= IMPACT && t < IMPACT + 8 && fireP.map((p, i) => {
          const pt = t - IMPACT;
          const decel = Math.pow(Math.max(0, 1 - pt / 6), 1.4);
          const px = IX + Math.cos(p.angle) * p.speed * pt * decel;
          const py = IY + Math.sin(p.angle) * p.speed * pt * decel - 70 * pt;
          const pOp = interpolate(pt, [0, p.life * 1.2, p.life * 8], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * fbOp * 0.8;
          const pr = Math.max(0, p.size * (1 - pt * 0.1));
          return pr > 0 ? <circle key={i} cx={px} cy={py} r={pr} fill={`rgba(255,${Math.round(100 + (1-pt/8)*120)},20,${pOp})`}/> : null;
        })}

        {/* Mushroom cloud */}
        {t > IMPACT + 0.5 && [0, 0.7, 1.5, 2.4, 3.5, 4.8].map((delay, j) => {
          const cp = Math.max(0, smokeT - delay);
          if (cp <= 0) return null;
          const cy = IY - 48 - cp * 65;
          const cr = Math.min(200, cp * 45 + 20);
          const cOp = interpolate(cp, [0, 0.4, 10, 16], [0, 0.62, 0.44, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <ellipse key={j}
              cx={IX + (j % 2 === 0 ? 6 : -8) * Math.min(j, 3) * 0.4}
              cy={cy} rx={cr} ry={cr * 0.58}
              fill={j < 2 ? `rgba(228,138,22,${cOp})` : `rgba(58,32,12,${cOp})`}/>
          );
        })}

        {/* Dust engulf */}
        {dustR > 0 && <circle cx={EX} cy={EY} r={ER + dustR} fill="url(#dust)"/>}

        {/* Flash */}
        <rect x={0} y={0} width={W} height={H} fill="white" opacity={flash}/>

        {/* Chromatic aberration */}
        {chroma > 0 && (
          <>
            <rect x={-chroma} y={0} width={W} height={H} fill="rgba(255,0,0,0.07)" opacity={Math.min(1, chroma / 9)}/>
            <rect x={chroma} y={0} width={W} height={H} fill="rgba(0,0,255,0.07)" opacity={Math.min(1, chroma / 9)}/>
          </>
        )}

        {/* Nuclear winter */}
        <rect x={0} y={0} width={W} height={H} fill="#060200" opacity={darkness}/>

        {/* Fade to black */}
        <rect x={0} y={0} width={W} height={H} fill="black" opacity={fadeBlack}/>

        {/* Film grain overlay (key for live-action feel) */}
        <rect x={0} y={0} width={W} height={H} filter="url(#grain)" opacity={0.075}
          style={{ mixBlendMode: "overlay" as const }}/>

        {/* Vignette */}
        <rect x={0} y={0} width={W} height={H} fill="url(#vig)"/>
      </svg>

      {/* Warning */}
      {warningOp > 0 && (
        <div style={{
          position: "absolute", top: 68, left: "50%",
          transform: "translateX(-50%)",
          opacity: warningOp * warningBlink,
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: 27, color: "#FF3232",
          letterSpacing: 7,
          textShadow: "0 0 18px #FF0000, 0 0 36px #FF0000",
          whiteSpace: "nowrap", userSelect: "none",
        }}>
          {`\u26A0  IMPACT TRAJECTORY CONFIRMED  \u2014  ETA: ${etaS}s  \u26A0`}
        </div>
      )}

      {/* IMPACT! */}
      {impactOp > 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%, -50%) scale(${impactScale})`,
          opacity: impactOp,
          fontFamily: "Impact, Arial Black, sans-serif",
          fontSize: 230, fontWeight: 900, color: "#FF4500",
          textShadow: "0 0 55px #FF8C00, 0 0 110px #FF4500, 0 0 200px #FF2200, 8px 8px 0 #000",
          letterSpacing: 18, whiteSpace: "nowrap", userSelect: "none",
        }}>IMPACT!</div>
      )}

      {/* THE END */}
      {endOp > 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: endOp,
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 105, color: "#ffffff",
          letterSpacing: 30, userSelect: "none",
        }}>THE END</div>
      )}
    </div>
  );
};
