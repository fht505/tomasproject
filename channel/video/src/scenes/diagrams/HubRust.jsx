import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { T } from '../../theme';

// Scene 11 cutaway: hub face vs rotor hat in side view. Rust flakes between
// the mating faces tilt the disc a fraction of a degree; the tilted rotor
// sweeps side-to-side as it spins and the pads shave it thin at two spots.
export const HubRust = () => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const flakes = Math.min(12, Math.floor(interpolate(frame, [90, 420], [0, 13], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const tilt = interpolate(frame, [380, 470], [0, 2.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const wobble = Math.sin(frame / 9) * tilt;
  const CX = 1060, CY = 540;
  return (
    <AbsoluteFill style={{ background: T.bg, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="1920" height="1080" opacity={intro}>
        {/* hub: fixed vertical face */}
        <rect x={640} y={CY - 190} width={130} height={380} fill={T.bgPanel} stroke={T.line} strokeWidth={4} />
        <text x={705} y={CY + 250} fill={T.dim} fontFamily={T.mono} fontSize={28} textAnchor="middle" letterSpacing={3}>HUB</text>
        {/* axle line */}
        <line x1={430} y1={CY} x2={1650} y2={CY} stroke={T.line} strokeWidth={1.5} strokeDasharray="20 14" opacity={0.4} />
        {/* rust flakes accumulating between the faces */}
        {Array.from({ length: flakes }, (_, i) => {
          const y = CY - 160 + (i * 313) % 320;
          const r = 7 + (i * 37) % 9;
          return <circle key={i} cx={787 + (i * 17) % 18} cy={y} r={r} fill="#C96A3B" opacity={0.9} />;
        })}
        {flakes > 3 ? <text x={800} y={CY - 220} fill="#C96A3B" fontFamily={T.mono} fontSize={26} letterSpacing={2}>RUST</text> : null}
        {/* rotor hat + disc, tilting off the contaminated face */}
        <g transform={`rotate(${wobble} 820 ${CY})`}>
          <rect x={800} y={CY - 170} width={60} height={340} fill={T.bg} stroke={T.line} strokeWidth={4} />
          <rect x={860} y={CY - 420} width={44} height={840} rx={8} fill={T.bgPanel} stroke={T.line} strokeWidth={5} />
          <text x={882} y={CY - 450} fill={T.text} fontFamily={T.mono} fontSize={28} textAnchor="middle" letterSpacing={2}>ROTOR</text>
        </g>
        {/* pads at fixed caliper position — sweep zone */}
        <rect x={960} y={CY - 430} width={120} height={60} rx={6} fill={T.warn} opacity={0.95} />
        <rect x={960} y={CY + 370} width={120} height={60} rx={6} fill={T.warn} opacity={0.95} />
        {tilt > 1 ? (<g>
          <path d={`M 930 ${CY - 400} h -60 m 12 -12 l -12 12 l 12 12`} stroke={T.danger} strokeWidth={4} fill="none" />
          <path d={`M 1110 ${CY - 400} h 60 m -12 -12 l 12 12 l -12 12`} stroke={T.danger} strokeWidth={4} fill="none" />
          <text x={1330} y={CY - 390} fill={T.danger} fontFamily={T.mono} fontSize={26}>SWEEP — SHAVES TWO SPOTS</text>
        </g>) : null}
        <text x={110} y={120} fill={T.line} fontFamily={T.mono} fontSize={30} letterSpacing={5}>HUB FACE — SIDE VIEW</text>
        <text x={110} y={165} fill={T.dim} fontFamily={T.font} fontSize={26}>a film of rust tilts the disc a fraction of a degree — the shake is ground in over months</text>
      </svg>
    </AbsoluteFill>
  );
};
