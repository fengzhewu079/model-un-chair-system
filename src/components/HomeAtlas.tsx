import React from 'react';

// Decorative routes, not live connections or delegate locations.
const routes = [
  'M350 270 Q505 80 740 225',
  'M740 225 Q940 90 1110 315',
  'M350 270 Q460 355 475 460',
  'M475 460 Q665 285 850 470',
  'M740 225 Q835 265 850 470',
  'M850 470 Q980 360 1110 315',
];
const nodes = [[350, 270], [740, 225], [1110, 315], [475, 460], [850, 470]];

export const HomeAtlas: React.FC = () => (
  <div className="home-atlas" aria-hidden="true">
    <svg viewBox="180 30 1100 660" focusable="false">
      <image href="/home/world-outline.svg" x="0" y="90" width="1440" height="580" />
      <g className="atlas-routes" fill="none">
        {routes.map((d, i) => <path key={`line-${i}`} d={d} className="atlas-route" />)}
        {routes.map((d, i) => <path key={`signal-${i}`} d={d} pathLength="100" className="atlas-signal" style={{ animationDelay: `${-i * 1.3}s` }} />)}
      </g>
      {nodes.map(([cx, cy], i) => <g key={i}>
        <circle className="atlas-echo" cx={cx} cy={cy} r="7" style={{ animationDelay: `${-i * .7}s`, transformOrigin: `${cx}px ${cy}px` }} />
        <circle className="atlas-node" cx={cx} cy={cy} r="5" />
      </g>)}
    </svg>
  </div>
);
