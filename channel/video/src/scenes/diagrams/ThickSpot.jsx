import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { T } from '../../theme';

// Scene 8 flow: the rotor surface unrolled into a moving strip. One
// exaggerated thick patch passes through the pads once per "revolution",
// kicking them apart — the 13-times-a-second hammer the narration describes.
const W = 1920, MID = 560, STRIP_H = 90, PERIOD = 75; // frames per revolution
export const ThickSpot = () => {
  const frame = useCurrentFrame();
  const phase = (frame % PERIOD) / PERIOD;            // 0..1 across the strip
  const bumpX = W - phase * W;                        // patch travels right→left
  const nearPads = Math.max(0, 1 - Math.abs(bumpX - 960) / 130);
  const kick = nearPads * 34;                          // pads shoved apart
  const hits = Math.floor(frame / PERIOD);
  const intro = interpolate(useCurrentFrame(), [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: T.bg, justifyContent: 'center', alignItems: 'center' }}>
      <svg width={W} height="1080" opacity={intro}>
        {/* rotor surface strip */}
        <rect x={0} y={MID - STRIP_H / 2} width={W} height={STRIP_H} fill={T.bgPanel} stroke={T.line} strokeWidth={3} />
        {Array.from({ length: 33 }, (_, i) => (
          <line key={i} x1={((i * 60) + (W - (frame * (W / PERIOD)) % 60)) % W} y1={MID - STRIP_H / 2}
            x2={((i * 60) + (W - (frame * (W / PERIOD)) % 60)) % W} y2={MID + STRIP_H / 2}
            stroke={T.line} strokeWidth={1} opacity={0.25} />
        ))}
        {/* the deposit patch — a thick spot on the surface */}
        <ellipse cx={bumpX} cy={MID - STRIP_H / 2 - 8} rx={110} ry={16} fill={T.danger} opacity={0.95} />
        <ellipse cx={bumpX} cy={MID + STRIP_H / 2 + 8} rx={110} ry={16} fill={T.danger} opacity={0.95} />
        {/* pads at the fixed caliper position */}
        <rect x={890} y={MID - STRIP_H / 2 - 70 - kick} width={140} height={52} rx={6} fill={T.warn} />
        <rect x={890} y={MID + STRIP_H / 2 + 18 + kick} width={140} height={52} rx={6} fill={T.warn} />
        <text x={960} y={MID - STRIP_H / 2 - 92 - kick} fill={T.dim} fontFamily={T.mono} fontSize={24} textAnchor="middle">PAD</text>
        <text x={960} y={MID + STRIP_H / 2 + 106 + kick} fill={T.dim} fontFamily={T.mono} fontSize={24} textAnchor="middle">PAD</text>
        {/* shock arrows when the patch hits */}
        {nearPads > 0.4 ? (<g>
          <path d={`M 960 ${MID - 190} l -22 38 h 44 z`} fill={T.danger} />
          <path d={`M 960 ${MID + 190} l -22 -38 h 44 z`} fill={T.danger} />
        </g>) : null}
        {/* counters */}
        <text x={110} y={120} fill={T.line} fontFamily={T.mono} fontSize={30} letterSpacing={5}>ROTOR SURFACE — UNROLLED</text>
        <text x={110} y={165} fill={T.dim} fontFamily={T.font} fontSize={26}>one thick spot · once per revolution · ~13×/second at 60 mph</text>
        <text x={1810} y={120} fill={T.accent} fontFamily={T.mono} fontSize={44} textAnchor="end">HITS: {hits}</text>
      </svg>
    </AbsoluteFill>
  );
};
