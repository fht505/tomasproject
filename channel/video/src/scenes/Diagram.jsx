import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { T } from '../theme';

// Placeholder for cutaway/flow scenes until each diagram is drawn: a
// blueprint panel that names the visual spec, with an animated grid and a
// pulsing schematic frame so timing/pacing can be judged in the pilot cut.
// Real per-scene SVG schematics replace this component's inner content.
export const Diagram = ({ spec, kind, narration }) => {
  const frame = useCurrentFrame();
  const dash = frame % 60;
  const pulse = 0.6 + 0.4 * Math.abs(Math.sin(frame / 30));
  return (
    <AbsoluteFill style={{ background: T.bg, justifyContent: 'center', alignItems: 'center' }}>
      <svg width="1560" height="760" style={{ position: 'absolute' }}>
        {Array.from({ length: 27 }, (_, i) => (
          <line key={'v' + i} x1={i * 60} y1={0} x2={i * 60} y2={760} stroke={T.line} strokeOpacity={0.08} />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <line key={'h' + i} x1={0} y1={i * 60} x2={1560} y2={i * 60} stroke={T.line} strokeOpacity={0.08} />
        ))}
        <rect x={30} y={30} width={1500} height={700} fill="none"
          stroke={T.line} strokeWidth={3} strokeDasharray="18 10" strokeDashoffset={-dash} opacity={pulse} />
      </svg>
      <div style={{ zIndex: 1, textAlign: 'center', maxWidth: 1300 }}>
        <div style={{ color: T.line, fontFamily: T.mono, fontSize: 30, letterSpacing: 4, marginBottom: 24 }}>
          [{String(kind).toUpperCase()} — DIAGRAM PENDING]
        </div>
        <div style={{ color: T.text, fontFamily: T.font, fontSize: 46, lineHeight: 1.4 }}>{spec}</div>
        {narration ? <div style={{ color: T.dim, fontFamily: T.font, fontSize: 26, marginTop: 36, lineHeight: 1.5 }}>
          {String(narration).slice(0, 220)}…
        </div> : null}
      </div>
    </AbsoluteFill>
  );
};
