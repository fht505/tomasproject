import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { T } from '../../theme';

// Scene 7 cutaway: front corner assembly — ghosted wheel, rotor, caliper,
// pads, hub. Labels appear in narration order with leader lines; the rotor's
// vent slots rotate continuously so the disc reads as spinning.
const CX = 960, CY = 560;
const label = (x, y, tx, ty, text, opacity) => (
  <g opacity={opacity}>
    <line x1={x} y1={y} x2={tx} y2={ty} stroke={T.accent} strokeWidth={2.5} />
    <circle cx={x} cy={y} r={6} fill={T.accent} />
    <text x={tx + (tx > CX ? 14 : -14)} y={ty + 8} fill={T.text} fontSize={34}
      fontFamily={T.mono} textAnchor={tx > CX ? 'start' : 'end'} letterSpacing={2}>{text}</text>
  </g>
);

export const BrakeCorner = () => {
  const frame = useCurrentFrame();
  const spin = frame * 1.2;
  const seq = (start) => interpolate(frame, [start, start + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: T.bg, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="1920" height="1080">
        {/* ghosted wheel + tire */}
        <circle cx={CX} cy={CY} r={430} fill="none" stroke={T.dim} strokeWidth={3} strokeDasharray="14 12" opacity={0.5} />
        <circle cx={CX} cy={CY} r={360} fill="none" stroke={T.dim} strokeWidth={2} strokeDasharray="8 10" opacity={0.35} />
        {/* rotor */}
        <circle cx={CX} cy={CY} r={260} fill={T.bgPanel} stroke={T.line} strokeWidth={5} />
        <circle cx={CX} cy={CY} r={200} fill="none" stroke={T.line} strokeWidth={2} opacity={0.6} />
        {/* rotating vent slots */}
        <g transform={`rotate(${spin} ${CX} ${CY})`}>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30) * Math.PI / 180;
            return <line key={i}
              x1={CX + Math.cos(a) * 210} y1={CY + Math.sin(a) * 210}
              x2={CX + Math.cos(a) * 250} y2={CY + Math.sin(a) * 250}
              stroke={T.line} strokeWidth={6} opacity={0.7} strokeLinecap="round" />;
          })}
        </g>
        {/* hub */}
        <circle cx={CX} cy={CY} r={80} fill={T.bg} stroke={T.line} strokeWidth={4} />
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i * 72 - 90 + spin) * Math.PI / 180;
          return <circle key={i} cx={CX + Math.cos(a) * 48} cy={CY + Math.sin(a) * 48} r={11}
            fill="none" stroke={T.line} strokeWidth={3} />;
        })}
        {/* caliper straddling the rotor at 12 o'clock */}
        <path d={`M ${CX - 150} ${CY - 330} A 340 340 0 0 1 ${CX + 150} ${CY - 330} L ${CX + 120} ${CY - 205} A 240 240 0 0 0 ${CX - 120} ${CY - 205} Z`}
          fill={T.bg} stroke={T.accent} strokeWidth={5} />
        {/* pads: the two friction blocks inside the caliper */}
        <path d={`M ${CX - 108} ${CY - 300} A 300 300 0 0 1 ${CX + 108} ${CY - 300} L ${CX + 96} ${CY - 262} A 268 268 0 0 0 ${CX - 96} ${CY - 262} Z`} fill={T.warn} opacity={0.9} />
        <path d={`M ${CX - 92} ${CY - 250} A 262 262 0 0 1 ${CX + 92} ${CY - 250} L ${CX + 82} ${CY - 216} A 234 234 0 0 0 ${CX - 82} ${CY - 216} Z`} fill={T.warn} opacity={0.9} />
        {/* labels in narration order */}
        {label(CX + 184, CY + 184, CX + 480, CY + 330, 'ROTOR', seq(20))}
        {label(CX, CY - 320, CX + 460, CY - 420, 'CALIPER', seq(55))}
        {label(CX - 96, CY - 268, CX - 470, CY - 380, 'BRAKE PADS', seq(90))}
        {label(CX + 40, CY + 40, CX + 430, CY + 120, 'HUB', seq(125))}
        {/* title strip */}
        <text x={110} y={120} fill={T.line} fontFamily={T.mono} fontSize={30} letterSpacing={5}>FRONT CORNER — CUTAWAY</text>
        <text x={110} y={165} fill={T.dim} fontFamily={T.font} fontSize={26}>pads squeeze the spinning rotor · friction slows the wheel</text>
      </svg>
    </AbsoluteFill>
  );
};
