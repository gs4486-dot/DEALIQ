import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";

export interface FFRow {
  label: string;
  value: number;       // endpoint value (absolute)
  displayValue?: string;
  color?: string;
}

export interface FFRefLine {
  value: number;
  label: string;
  color?: string;
}

interface Props {
  title?: string;
  subtitle?: string;
  rows: FFRow[];
  referenceLines?: FFRefLine[];
  formatTick?: (v: number) => string;
  defaultColor?: string;
  height?: number;
  yAxisWidth?: number;
  /** When set, bars float from this base value to row.value (shows incremental range) */
  baseValue?: number;
}

// ── Parsing utilities ────────────────────────────────────────────
/** "$245.3B" | "$1.2T" | "$450M" → value in billions */
export const parseToB = (s: string): number | null => {
  if (!s || s === "N/A") return null;
  const clean = s.replace(/[$,\s]/g, "");
  const m = clean.match(/^([\d.]+)([TBMK]?)$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const suf = m[2].toUpperCase();
  if (suf === "T") return n * 1000;
  if (suf === "B") return n;
  if (suf === "M") return n / 1000;
  if (suf === "K") return n / 1_000_000;
  return n;
};

export const formatB = (v: number): string => {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}T`;
  if (v >= 1) return `$${v.toFixed(1)}B`;
  if (v > 0) return `$${(v * 1000).toFixed(0)}M`;
  return "$0B";
};

/** "15.3x" → 15.3 */
export const parseMultiple = (s: string): number | null => {
  if (!s || s === "N/A") return null;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) || n <= 0 ? null : n;
};

// ── Custom tooltip ───────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  // For float mode, find the "bar" entry (not the transparent spacer)
  const item = payload.find((p: any) => p.dataKey === "bar" || p.dataKey === "value");
  if (!item) return null;
  const display = item.payload._display;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
      }}
    >
      <p style={{ fontWeight: 600, color: "#111827", marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#374151" }}>{display}</p>
    </div>
  );
};

// ── Component ────────────────────────────────────────────────────
const FootballFieldChart = ({
  title,
  subtitle,
  rows,
  referenceLines = [],
  formatTick = String,
  defaultColor = "#4263eb",
  height,
  yAxisWidth = 110,
  baseValue,
}: Props) => {
  const isFloat = baseValue != null;

  // Build chart data
  const data = rows.map((r) => ({
    name: r.label,
    // Point mode
    value: r.value,
    // Float mode: stacked transparent spacer + visible increment
    spacer: isFloat ? baseValue! : 0,
    bar: isFloat ? r.value - baseValue! : r.value,
    _display: r.displayValue ?? formatTick(r.value),
    _color: r.color ?? defaultColor,
  }));

  // Domain calculation
  const allValues = [
    ...rows.map((r) => r.value),
    ...(isFloat ? [baseValue!] : []),
    ...referenceLines.map((r) => r.value),
  ].filter((v) => isFinite(v));

  if (allValues.length === 0) return null;

  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const span = Math.max(maxV - minV, maxV * 0.05, 1);
  // Always clip below the minimum (never show empty space to the left)
  const domainMin = Math.max(0, minV - span * 0.08);
  const domainMax = maxV + span * 0.65; // room for right-side value labels

  const chartHeight = height ?? Math.max(90, rows.length * 46 + 28);

  return (
    <div className="mt-5 bg-secondary-bg border border-border/50 rounded-xl p-4">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 90, bottom: 4, left: 8 }}
          barSize={20}
        >
          <XAxis
            type="number"
            domain={[domainMin, domainMax]}
            tickFormatter={formatTick}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={yAxisWidth}
            tick={{ fontSize: 11, fontWeight: 500, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />

          {[...referenceLines]
            .sort((a, b) => a.value - b.value)
            .map((rl, i) => (
              <ReferenceLine
                key={i}
                x={rl.value}
                stroke={rl.color ?? "#94a3b8"}
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{
                  value: rl.label,
                  position: "top",
                  fontSize: 9,
                  fill: rl.color ?? "#94a3b8",
                  fontWeight: 700,
                  dy: [-2, -14, -26, -38][i % 4],
                }}
              />
            ))}

          {isFloat ? (
            <>
              {/* Transparent spacer from 0 → baseValue */}
              <Bar dataKey="spacer" stackId="ff" fill="transparent" legendType="none" />
              {/* Colored increment from baseValue → value */}
              <Bar dataKey="bar" stackId="ff" radius={[0, 4, 4, 0]}>
                {data.map((row, i) => (
                  <Cell key={i} fill={row._color} fillOpacity={0.88} />
                ))}
                <LabelList
                  dataKey="_display"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: "#111827" }}
                />
              </Bar>
            </>
          ) : (
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((row, i) => (
                <Cell key={i} fill={row._color} fillOpacity={0.88} />
              ))}
              <LabelList
                dataKey="_display"
                position="right"
                style={{ fontSize: 11, fontWeight: 700, fill: "#111827" }}
              />
            </Bar>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FootballFieldChart;
