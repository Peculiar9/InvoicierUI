interface SparklineProps {
  points: number[];
  /** drawn in the accent when the last move was downward */
  tone?: 'brand' | 'good' | 'warn';
  width?: number;
  height?: number;
}

/**
 * A number without a direction is half a fact.
 *
 * Deliberately unlabelled and unaxised: this is the shape of the last few
 * months, not a chart to read values off. The dot marks where it ends, which
 * is the only point anybody actually looks for.
 */
export const Sparkline = ({ points, tone = 'brand', width = 96, height = 30 }: SparklineProps) => {
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);

  // a little headroom top and bottom so the line never touches the edge
  const y = (value: number) => height - 3 - ((value - min) / span) * (height - 6);
  const coords = points.map((value, i) => [i * step, y(value)] as const);
  const line = coords.map(([x, yy], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yy.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = coords[coords.length - 1];
  const id = `spark-${tone}-${points.length}-${Math.round(max)}`;

  return (
    <svg
      className={`spark spark--${tone}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="spark-stop-a" />
          <stop offset="100%" className="spark-stop-b" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} className="spark-line" fill="none" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2.6" className="spark-dot" />
    </svg>
  );
};
