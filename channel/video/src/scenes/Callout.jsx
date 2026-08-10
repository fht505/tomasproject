import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { T } from '../theme';

// Text card: the spec is the card copy. Slides up + fades on entry.
export const Callout = ({ spec }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(frame, [0, 12], [40, 0], { extrapolateRight: 'clamp' });
  const parts = String(spec).split(/\s*\/\s*|\s*—\s*/).filter(Boolean);
  return (
    <AbsoluteFill style={{ background: T.bg, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        opacity, transform: `translateY(${y}px)`,
        background: T.bgPanel, border: `3px solid ${T.accent}`, borderRadius: 8,
        padding: '60px 90px', maxWidth: 1400,
      }}>
        {parts.map((p, i) => (
          <div key={i} style={{
            color: i === 0 ? T.text : T.dim, fontFamily: T.font,
            fontSize: i === 0 ? 64 : 44, lineHeight: 1.35, textAlign: 'center',
            marginTop: i === 0 ? 0 : 18,
          }}>{p.replace(/^"|"$/g, '')}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
