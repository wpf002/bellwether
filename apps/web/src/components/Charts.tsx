/** Lightweight, dependency-free SVG charts for the dashboard. */

export const PALETTE = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#ef4444",
  "#64748b",
];

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/** Donut chart. Renders proportional arcs; shows a center label. */
export function Donut({
  data,
  size = 168,
  thickness = 22,
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#eef2f7"
          strokeWidth={thickness}
        />
        {data.map((d) => {
          const len = (d.value / total) * c;
          const seg = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return seg;
        })}
      </g>
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        className="fill-ink text-[20px] font-semibold"
        dominantBaseline="middle"
      >
        {data.length}
      </text>
      <text
        x="50%"
        y="60%"
        textAnchor="middle"
        className="fill-ink-400 text-[10px] uppercase tracking-wide"
        dominantBaseline="middle"
      >
        leaders
      </text>
    </svg>
  );
}

/** Compact area sparkline for a single series (e.g. daily event volume). */
export function Sparkline({
  data,
  width = 132,
  height = 36,
  color = "#4f46e5",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const pad = 2;
  const n = data.length;
  const max = Math.max(1, ...data);
  const dx = n > 1 ? (width - pad * 2) / (n - 1) : 0;
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const pts = data.map((v, i) => [pad + i * dx, y(v)] as const);
  const line = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${(pad + (n - 1) * dx).toFixed(1)},${height - pad}`;
  const last = pts[pts.length - 1];
  const gid = `spark-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last && <circle cx={last[0]} cy={last[1]} r={2} fill={color} />}
    </svg>
  );
}

/** Horizontal labeled bars (e.g. sentiment mix, event mix). */
export function BarList({ data }: { data: Slice[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-ink-500">{d.label}</span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%`, background: d.color }}
            />
          </span>
          <span className="w-8 shrink-0 text-right tabular-nums text-ink-700">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}
