import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { T } from '../../theme';

// Scene 9 cutaway: rotor surface under magnification — pad material smearing
// onto one patch of the disc, layer by layer, with a heat glow during the
// "parked clamp on a glowing rotor" beat. The deposit IS the thick spot.
const W = 1920;
export const PadDeposits = () => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const heat = interpolate(frame, [260, 320, 700, 760], [0, 0.85, 0.85, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // deposit grows in discrete smears
  const layers = Math.min(7, Math.floor(interpolate(frame, [120, 900], [0, 8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const surfaceY = 640;
  return (
    <AbsoluteFill style={{ background: T.bg, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={W} height="1080" opacity={intro}>
        {/* magnifier framing */}
        <circle cx={960} cy={540} r={470} fill={T.bgPanel} stroke={T.line} strokeWidth={4} />
        <circle cx={960} cy={540} r={470} fill="none" stroke={T.line} strokeWidth={2} strokeDasharray="4 14" opacity={0.5} />
        <clipPath id="lens"><circle cx={960} cy={540} r={466} /></clipPath>
        <g clipPath="url(#lens)">
          {/* rotor steel: machined grooves */}
          <rect x={430} y={surfaceY} width={1060} height={400} fill={T.bg} stroke={T.line} strokeWidth={4} />
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={430} y1={surfaceY + 34 + i * 40} x2={1490} y2={surfaceY + 34 + i * 40}
              stroke={T.line} strokeWidth={1.5} opacity={0.25} />
          ))}
          <text x={960} y={surfaceY + 220} fill={T.dim} fontFamily={T.mono} fontSize={30} textAnchor="middle" letterSpacing={4}>ROTOR STEEL</text>
          {/* heat glow in the deposit zone */}
          <ellipse cx={960} cy={surfaceY} rx={330} ry={70} fill={T.danger} opacity={heat * 0.35} />
          {/* pad material smearing on, layer by layer */}
          {Array.from({ length: layers }, (_, i) => {
            const w = 460 - i * 52;
            return <rect key={i} x={960 - w / 2} y={surfaceY - 14 - i * 13} width={w} height={14} rx={7}
              fill={T.warn} opacity={0.55 + i * 0.06} />;
          })}
          {layers > 0 ? <text x={960} y={surfaceY - 60 - layers * 13} fill={T.warn} fontFamily={T.mono}
            fontSize={26} textAnchor="middle" letterSpacing={2}>PAD MATERIAL — BAKED ON</text> : null}
        </g>
        {/* scale + titles */}
        <text x={110} y={120} fill={T.line} fontFamily={T.mono} fontSize={30} letterSpacing={5}>ROTOR SURFACE — MAGNIFIED</text>
        <text x={110} y={165} fill={T.dim} fontFamily={T.font} fontSize={26}>the "warped" rotor that never bent: friction material printed on by heat</text>
        <text x={1810} y={120} fill={heat > 0.5 ? T.danger : T.dim} fontFamily={T.mono} fontSize={34} textAnchor="end">
          {heat > 0.5 ? 'HOT + CLAMPED' : 'SURFACE TEMP: NORMAL'}
        </text>
      </svg>
    </AbsoluteFill>
  );
};
