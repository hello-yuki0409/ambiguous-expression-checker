import type { DashboardScoreTrendEntry } from "@/lib/api";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import type {
  ValueType,
  NameType,
  Payload as DefaultTooltipPayload,
} from "recharts/types/component/DefaultTooltipContent";

function buildChartData(entries: DashboardScoreTrendEntry[]) {
  return entries.map((entry) => ({
    name: `v${entry.index + 1}`,
    aimaiScore: Number(entry.aimaiScore.toFixed(2)),
    totalCount: entry.totalCount,
    articleTitle: entry.articleTitle || "無題の記事",
    createdAt: entry.createdAt,
  }));
}

type ChartTooltipPayload = DefaultTooltipPayload<ValueType, NameType>;

function TooltipContent(props: TooltipContentProps<ValueType, NameType>) {
  if (!props.active || !props.payload?.length) return null;

  const chartPayload = props.payload[0] as ChartTooltipPayload | undefined;
  if (!chartPayload) return null;

  const item = chartPayload.payload as ReturnType<
    typeof buildChartData
  >[number];

  return (
    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{item.articleTitle}</p>
      <p className="text-muted-foreground">
        {new Date(item.createdAt).toLocaleString(undefined, { hour12: false })}
      </p>
      <p className="mt-1">曖昧度スコア: {item.aimaiScore}</p>
      <p>曖昧件数: {item.totalCount}</p>
    </div>
  );
}

export function ScoreTrendSection({
  entries,
}: {
  entries: DashboardScoreTrendEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-muted-foreground">
        表示できるスコア推移がありません。
      </div>
    );
  }

  const chartData = buildChartData(entries);

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-700">
          曖昧度スコアの推移
        </h3>
        <span className="text-xs text-muted-foreground">
          （直近 {entries.length} 件）
        </span>
      </div>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 24, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, "auto"]} />
            <Tooltip content={TooltipContent} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="aimaiScore"
              stroke="#059669"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="totalCount"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
