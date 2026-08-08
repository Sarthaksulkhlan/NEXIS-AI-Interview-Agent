import React from 'react';
import { CompetencyData } from '../types';

interface RadarChartProps {
  data: CompetencyData;
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  size = 320,
}) => {
  const center = size / 2;
  const radius = size * 0.38;

  const categories = [
    { key: 'technicalDepth', label: 'Technical Depth', value: data.technicalDepth },
    { key: 'architecture', label: 'Architecture', value: data.architecture },
    { key: 'problemSolving', label: 'Problem Solving', value: data.problemSolving },
    { key: 'communication', label: 'Communication', value: data.communication },
    { key: 'bestPractices', label: 'Best Practices', value: data.bestPractices },
  ];

  const total = categories.length;

  // Helper to calculate point coordinates
  const getCoordinates = (index: number, val: number) => {
    const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
    const r = (val / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Generate background concentric pentagon webs
  const levels = [0.25, 0.5, 0.75, 1.0];

  const dataPoints = categories.map((cat, idx) => getCoordinates(idx, cat.value));
  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="relative w-full flex items-center justify-center p-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Background Grid Circles / Pentagons */}
        {levels.map((level, levelIdx) => {
          const gridPoints = categories.map((_, idx) => getCoordinates(idx, level * 100));
          const pathString = gridPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
          return (
            <path
              key={levelIdx}
              d={pathString}
              fill="none"
              stroke="#1f2937"
              strokeWidth="1"
              strokeDasharray={levelIdx === levels.length - 1 ? 'none' : '3 3'}
            />
          );
        })}

        {/* Spokes from center */}
        {categories.map((_, idx) => {
          const outerP = getCoordinates(idx, 100);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={outerP.x}
              y2={outerP.y}
              stroke="#1f2937"
              strokeWidth="1"
            />
          );
        })}

        {/* Filled Data Polygon */}
        <path
          d={polygonPath}
          fill="rgba(0, 220, 229, 0.2)"
          stroke="#00dce5"
          strokeWidth="2"
          className="drop-shadow-[0_0_12px_rgba(0,220,229,0.4)] transition-all duration-700 ease-out"
        />

        {/* Points and Labels */}
        {categories.map((cat, idx) => {
          const point = getCoordinates(idx, cat.value);
          const labelPoint = getCoordinates(idx, 118);

          let textAnchor = 'middle';
          if (labelPoint.x < center - 10) textAnchor = 'end';
          if (labelPoint.x > center + 10) textAnchor = 'start';

          return (
            <g key={cat.key}>
              {/* Pulsing Dot */}
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#00dce5"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="drop-shadow-[0_0_6px_#00dce5]"
              />

              {/* Label */}
              <text
                x={labelPoint.x}
                y={labelPoint.y + 4}
                fill="#b9caca"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
                textAnchor={textAnchor}
                className="font-medium tracking-wider"
              >
                {cat.label} ({cat.value}%)
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
