import React from 'react';

interface CircularProgressProps {
  progress: number; // 0 ~ 1
  remaining: number;
  size?: number;
  period: number;
}

export default function CircularProgress({ progress, remaining, size = 40, period }: CircularProgressProps) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const getColor = () => {
    if (period > 30) return 'var(--success)';
    if (remaining > 10) return 'var(--success)';
    if (remaining > 5) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <svg width={size} height={size} className="circular-progress">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={getColor()}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="progress-ring"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={getColor()}
        fontSize={12}
        fontWeight="600"
        fontFamily="inherit"
      >
        {remaining}
      </text>
    </svg>
  );
}
