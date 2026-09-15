"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompactAmount } from "@/lib/format-amount";

type Slice = {
  key: "circulating" | "locked" | "burned";
  label: string;
  value: bigint;
  color: string;
};

type Props = {
  circulating?: bigint;
  locked?: bigint;
  burned?: bigint;
  totalSupply?: bigint;
  symbol?: string;
  decimals?: number;
};

const chartConfig = {
  circulating: { label: "Circulating", color: "#0050e0" },
  locked: { label: "Locked", color: "#4d8aff" },
  burned: { label: "Burned", color: "#64748b" },
} satisfies ChartConfig;

function toNum(value: bigint) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(value / 10n ** 12n) * 1e12;
  }
  return Number(value);
}

export function LockTokenomicsPie({
  circulating = 0n,
  locked = 0n,
  burned = 0n,
  totalSupply,
  symbol = "",
  decimals = 18,
}: Props) {
  const slices: Slice[] = [
    { key: "circulating", label: "Circulating", value: circulating < 0n ? 0n : circulating, color: "#0050e0" },
    { key: "locked", label: "Locked", value: locked < 0n ? 0n : locked, color: "#4d8aff" },
    { key: "burned", label: "Burned", value: burned < 0n ? 0n : burned, color: "#64748b" },
  ];

  const total = slices.reduce((sum, s) => sum + s.value, 0n);
  const chartData = slices
    .filter((s) => s.value > 0n)
    .map((s) => ({
      key: s.key,
      name: s.label,
      value: Math.max(toNum(s.value), 0),
      fill: s.color,
    }));

  function pct(value: bigint) {
    if (total === 0n) return "0%";
    const scaled = Number((value * 10000n) / total) / 100;
    return `${scaled.toLocaleString("en-US", {
      maximumFractionDigits: scaled < 1 ? 2 : 1,
    })}%`;
  }

  function fmt(value: bigint | undefined) {
    return formatCompactAmount(value, decimals);
  }

  return (
    <div className="proof-tok-pie">
      <div className="proof-tok-pie-visual">
        {chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="proof-tok-chart"
            initialDimension={{ width: 240, height: 240 }}
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent nameKey="name" hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={92}
                strokeWidth={2}
                stroke="rgba(8,9,12,0.9)"
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="proof-tok-empty" aria-hidden />
        )}
        <div className="proof-tok-center">
          <span>Total supply</span>
          <strong>
            {fmt(totalSupply)}
            {symbol ? <small>{symbol}</small> : null}
          </strong>
        </div>
      </div>

      <ul className="proof-tok-legend">
        {slices.map((slice) => (
          <li key={slice.key}>
            <span className="proof-tok-swatch" style={{ background: slice.color }} />
            <div>
              <strong>{slice.label}</strong>
              <em>{pct(slice.value)}</em>
            </div>
            <p>
              {fmt(slice.value)}
              {symbol ? ` ${symbol}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
