import React from 'react';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
  displayValue?: string;
}

interface BreakdownPieChartProps {
  title: string;
  subtitle?: string;
  slices: PieSlice[];
  centerValue?: string;
  centerLabel?: string;
  emptyMessage?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeDonutArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  const largeArc = sweep > 180 ? 1 : 0;

  const p1 = polarToCartesian(cx, cy, outerR, startAngle);
  const p2 = polarToCartesian(cx, cy, outerR, endAngle);
  const p3 = polarToCartesian(cx, cy, innerR, endAngle);
  const p4 = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export function BreakdownPieChart({
  title,
  subtitle,
  slices,
  centerValue,
  centerLabel,
  emptyMessage = 'No breakdown data available.',
}: BreakdownPieChartProps) {
  const validSlices = slices.filter((s) => s.value > 0);
  const total = validSlices.reduce((acc, s) => acc + s.value, 0);

  if (total <= 0) {
    return (
      <div className="pie-card">
        <div className="pie-header">
          <div className="pie-title">{title}</div>
          {subtitle && <div className="pie-subtitle">{subtitle}</div>}
        </div>
        <p className="pie-empty">{emptyMessage}</p>
      </div>
    );
  }

  const cx = 82;
  const cy = 82;
  const outerR = 72;
  const innerR = 44;

  let currentAngle = 0;
  const computed = validSlices.map((slice) => {
    const pct = (slice.value / total) * 100;
    const sweep = (slice.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;
    return {
      ...slice,
      pct,
      startAngle,
      endAngle,
    };
  });

  return (
    <div className="pie-card">
      <div className="pie-header">
        <div className="pie-title">{title}</div>
        {subtitle && <div className="pie-subtitle">{subtitle}</div>}
      </div>

      <div className="pie-layout">
        <svg
          viewBox="0 0 164 164"
          className="pie-svg"
          role="img"
          aria-label={title}
        >
          {computed.length === 1 ? (
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke={computed[0].color}
              strokeWidth={outerR - innerR}
            />
          ) : (
            computed.map((s) => (
              <path
                key={s.label}
                d={describeDonutArc(cx, cy, outerR, innerR, s.startAngle, s.endAngle)}
                fill={s.color}
                stroke="#ffffff"
                strokeWidth="2"
              />
            ))
          )}

          {centerValue && (
            <text x={cx} y={centerLabel ? cy - 2 : cy + 5} textAnchor="middle" className="pie-center-val">
              {centerValue}
            </text>
          )}
          {centerLabel && (
            <text x={cx} y={cy + 15} textAnchor="middle" className="pie-center-lbl">
              {centerLabel}
            </text>
          )}
        </svg>

        <div className="pie-legend">
          {computed.map((s) => (
            <div key={s.label} className="pie-legend-row">
              <div className="pie-legend-left">
                <span
                  className="pie-swatch"
                  style={{ backgroundColor: s.color }}
                  aria-hidden="true"
                />
                <span className="pie-legend-name">{s.label}</span>
              </div>
              <div className="pie-legend-right tabular">
                <span>{s.displayValue || s.value}</span>
                <span className="pie-legend-pct">({Math.round(s.pct)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
