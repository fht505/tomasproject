import React from 'react';
import { Composition, AbsoluteFill, Sequence } from 'remotion';
import { Callout } from './scenes/Callout';
import { Diagram } from './scenes/Diagram';
import { BrakeCorner } from './scenes/diagrams/BrakeCorner';
import { ThickSpot } from './scenes/diagrams/ThickSpot';
import { T } from './theme';
import manifest from '../manifests/01-car-shakes-when-braking.scenes.json';

const FPS = 30;

// real diagrams by scene index; everything else falls back to the placeholder
const DIAGRAMS = { 7: BrakeCorner, 8: ThickSpot };

const Scene = ({ s }) => {
  const Real = DIAGRAMS[s.idx];
  if (Real) return <Real />;
  if (s.kind === 'callout') return <Callout spec={s.spec} />;
  return <Diagram spec={s.spec ?? '(narration over previous visual)'} kind={s.kind} narration={s.narration} />;
};

const Pilot = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      {manifest.scenes.map((s) => {
        const from = Math.round(at * FPS);
        const dur = Math.max(Math.round(s.est_seconds * FPS), 30);
        at += s.est_seconds;
        return (
          <Sequence key={s.idx} from={from} durationInFrames={dur}>
            <Scene s={s} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const Root = () => (
  <Composition
    id="Pilot"
    component={Pilot}
    fps={FPS}
    width={1920}
    height={1080}
    durationInFrames={Math.round(manifest.est_total_seconds * FPS)}
  />
);
