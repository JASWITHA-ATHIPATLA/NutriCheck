import React from 'react';

export interface PieSlice {
  label: string;
  value: number;
  color: string;
  displayValue?: string;
  subLabel?: string;
}

interface BreakdownPieChartProps {
  title: string;
  subtitle?: string;
  slices: PieSlice[];
  centerValue?: string;
  centerLabel?: string;
  emptyMessage?: string;
  size?: 'normal' | 'large';
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
  size = 'normal',
}: BreakdownPieChartProps) {
  const validSlices = slices.filter((s) => s.value > 0);
  const total = validSlices.reduce((acc, s) => acc + s.value, 0);

  if (total <= 0) {
    return (
      <div className={`pie-card ${size === 'large' ? 'pie-card-large' : ''}`}>
        <div className="pie-header">
          <div className="pie-title">{title}</div>
          {subtitle && <div className="pie-subtitle">{subtitle}</div>}
        </div>
        <p className="pie-empty">{emptyMessage}</p>
      </div>
    );
  }

  const isLarge = size === 'large';
  const viewBoxSize = isLarge ? 236 : 164;
  const cx = viewBoxSize / 2;
  const cy = viewBoxSize / 2;
  const outerR = isLarge ? 104 : 72;
  const innerR = isLarge ? 60 : 44;

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
    <div className={`pie-card ${isLarge ? 'pie-card-large' : ''}`}>
      <div className="pie-header">
        <div className="pie-title" style={isLarge ? { fontSize: '18.5px', fontWeight: 800 } : undefined}>
          {title}
        </div>
        {subtitle && <div className="pie-subtitle">{subtitle}</div>}
      </div>

      <div className={`pie-layout ${isLarge ? 'pie-layout-large' : ''}`}>
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className={`pie-svg ${isLarge ? 'pie-svg-large' : ''}`}
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
                strokeWidth={isLarge ? '3' : '2'}
              />
            ))
          )}

          {centerValue && (
            <text
              x={cx}
              y={centerLabel ? cy - 2 : cy + 6}
              textAnchor="middle"
              className="pie-center-val"
              style={isLarge ? { fontSize: '26px', fontWeight: 800 } : undefined}
            >
              {centerValue}
            </text>
          )}
          {centerLabel && (
            <text
              x={cx}
              y={cy + (isLarge ? 19 : 15)}
              textAnchor="middle"
              className="pie-center-lbl"
              style={isLarge ? { fontSize: '12px', fontWeight: 700 } : undefined}
            >
              {centerLabel}
            </text>
          )}
        </svg>

        <div className="pie-legend" style={isLarge ? { gap: '12px' } : undefined}>
          {computed.map((s) => (
            <div key={s.label} className="pie-legend-row" style={isLarge ? { padding: '8px 10px', borderRadius: '8px', backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' } : undefined}>
              <div className="pie-legend-left" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className="pie-swatch"
                    style={{
                      backgroundColor: s.color,
                      width: isLarge ? 12 : 10,
                      height: isLarge ? 12 : 10,
                    }}
                    aria-hidden="true"
                  />
                  <span className="pie-legend-name" style={isLarge ? { fontWeight: 700, fontSize: '14px' } : undefined}>
                    {s.label}
                  </span>
                </div>
                {s.subLabel && (
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', paddingLeft: isLarge ? '20px' : '18px' }}>
                    {s.subLabel}
                  </span>
                )}
              </div>
              <div className="pie-legend-right tabular" style={isLarge ? { fontSize: '14px', fontWeight: 700 } : undefined}>
                <span>{s.displayValue || s.value}</span>
                <span className="pie-legend-pct" style={isLarge ? { fontSize: '13.5px', fontWeight: 800, color: s.color } : undefined}>
                  ({Math.round(s.pct)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
