import type { DashboardCategoryTrendEntry } from "@/lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import type {
  ValueType,
  NameType,
  Payload as DefaultTooltipPayload,
} from "recharts/types/component/DefaultTooltipContent";

const CATEGORY_ORDER = [
  "HEDGING",
  "VAGUE",
  "QUANTITY",
  "RESPONSIBILITY",
  "OTHER",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  HEDGING: "#6366f1",
  VAGUE: "#0ea5e9",
  QUANTITY: "#10b981",
  RESPONSIBILITY: "#f97316",
  OTHER: "#94a3b8",
};

function buildChartData(entries: DashboardCategoryTrendEntry[]) {
  return entries.map((entry, idx) => {
    const base: Record<string, number | string | Date> = {
      name: `v${idx + 1}`,
      createdAt: entry.createdAt,
    };
    CATEGORY_ORDER.forEach((category) => {
      base[category] = entry.counts[category] ?? 0;
    });
    return base;
  });
}

type CategoryTooltipPayload = DefaultTooltipPayload<ValueType, NameType>;

function TooltipContent(props: TooltipContentProps<ValueType, NameType>) {
  if (!props.active || !props.payload?.length) return null;

  const payloadItems = props.payload as CategoryTooltipPayload[];
  const chartPayload = payloadItems[0];
  if (!chartPayload) return null;

  const dataPoint = chartPayload.payload as ReturnType<
    typeof buildChartData
  >[number];

  const createdAt = new Date(String(dataPoint.createdAt)).toLocaleString(
    undefined,
    { hour12: false }
  );

  return (
    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{String(dataPoint.name)}</p>
      <p className="text-muted-foreground">{createdAt}</p>
      <div className="mt-2 space-y-1">
        {payloadItems.map((entry) => (
          <p key={String(entry.dataKey)} style={{ color: entry.color }}>
            {String(entry.dataKey)}: {entry.value}
          </p>
        ))}
      </div>
    </div>
  );
}

export function CategoryTrendSection({
  entries,
}: {
  entries: DashboardCategoryTrendEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-muted-foreground">
        カテゴリ別の件数はまだありません。
      </div>
    );
  }

  const chartData = buildChartData(entries);

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-700">
          カテゴリ別件数
        </h3>
        <span className="text-xs text-muted-foreground">
          （直近 {entries.length} 件）
        </span>
      </div>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 24, left: 0, bottom: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={TooltipContent} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {CATEGORY_ORDER.map((category, idx) => (
              <Bar
                key={category}
                dataKey={category}
                stackId="counts"
                fill={CATEGORY_COLORS[category]}
                radius={
                  // 最上段だけ角丸
                  idx === CATEGORY_ORDER.length - 1
                    ? [4, 4, 0, 0]
                    : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
