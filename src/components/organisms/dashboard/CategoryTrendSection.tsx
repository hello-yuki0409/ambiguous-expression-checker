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
import { formatDateTime } from "@/lib/formatters";
import {
  DashboardEmptyState,
  DashboardSectionCard,
} from "@/components/molecules/dashboard/DashboardSectionCard";

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

const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
  HEDGING: "推量・断定回避",
  VAGUE: "ぼかし",
  QUANTITY: "数量曖昧",
  RESPONSIBILITY: "責任回避",
  OTHER: "その他",
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

  const createdAt = formatDateTime(String(dataPoint.createdAt));

  return (
    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{String(dataPoint.name)}</p>
      <p className="text-muted-foreground">{createdAt}</p>
      <div className="mt-2 space-y-1">
        {payloadItems.map((entry) => {
          const key = String(entry.dataKey) as (typeof CATEGORY_ORDER)[number];
          const label = CATEGORY_LABELS[key] ?? key;
          return (
            <p key={key} style={{ color: entry.color }}>
              {label}: {entry.value}
            </p>
          );
        })}
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
    return <DashboardEmptyState message="カテゴリ別の件数はまだありません。" />;
  }

  const chartData = buildChartData(entries);

  return (
    <DashboardSectionCard
      title="カテゴリ別件数"
      subtitle={`（直近 ${entries.length} 件）`}
      contentClassName="h-72"
    >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 24, left: 0, bottom: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={TooltipContent} />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) =>
                CATEGORY_LABELS[value as (typeof CATEGORY_ORDER)[number]] ?? value
              }
            />
            {CATEGORY_ORDER.map((category, idx) => (
              <Bar
                key={category}
                dataKey={category}
                name={CATEGORY_LABELS[category]}
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
    </DashboardSectionCard>
  );
}
