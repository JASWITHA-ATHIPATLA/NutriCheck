interface NutritionGaugeProps {
  score: number;
  label: string;
  tone: 'good' | 'moderate' | 'bad';
  title?: string;
}

export function NutritionGauge({
  score,
  label,
  tone,
  title = 'Nutrition score',
}: NutritionGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  // Semicircle from left (180 deg) to right (0 deg) centered at (110, 108) radius 82
  const cx = 110;
  const cy = 108;
  const r = 82;
  const angleRad = Math.PI * (1 - clamped / 100);
  const dotX = cx + r * Math.cos(angleRad);
  const dotY = cy - r * Math.sin(angleRad);

  const toneClass =
    tone === 'good'
      ? 'is-good'
      : tone === 'moderate'
      ? 'is-moderate'
      : 'is-bad';

  return (
    <div className="gauge-wrap">
      {title && <div className="gauge-heading">{title}</div>}
      <svg
        viewBox="0 0 220 132"
        className="gauge-svg"
        role="img"
        aria-label={`${title}: ${Math.round(clamped)} out of 100, ${label}`}
      >
        <defs>
          <linearGradient id="nutricheckArcGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="48%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>

        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="15"
          strokeLinecap="round"
        />

        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#nutricheckArcGrad)"
          strokeWidth="15"
          strokeLinecap="round"
        />

        <circle
          cx={dotX}
          cy={dotY}
          r="9"
          fill="#111827"
          stroke="#ffffff"
          strokeWidth="3.5"
        />

        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          className={`gauge-number ${toneClass}`}
        >
          {Math.round(clamped)}
        </text>
      </svg>

      <div className={`gauge-verdict ${toneClass}`}>{label}</div>
    </div>
  );
}
