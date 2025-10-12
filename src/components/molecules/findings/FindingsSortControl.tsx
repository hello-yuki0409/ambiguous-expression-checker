import type { ChangeEvent } from "react";
import { cn } from "@/lib/utils";

export type FindingsSortMode = "order" | "category" | "frequency";

type FindingsSortControlProps = {
  count: number;
  sort: FindingsSortMode;
  onSortChange: (mode: FindingsSortMode) => void;
  className?: string;
};

export function FindingsSortControl({
  count,
  sort,
  onSortChange,
  className,
}: FindingsSortControlProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onSortChange(event.target.value as FindingsSortMode);
  };

  // 件数表示とソート選択を部品化し、同じ UI を他の一覧にも水平展開できるようにする
  return (
    <div className={cn("flex items-center justify-between mb-1", className)}>
      <div className="font-medium">一覧（{count}件）</div>
      <select
        value={sort}
        onChange={handleChange}
        className="border rounded-md px-2 py-1 text-xs"
        aria-label="sort"
      >
        <option value="order">登場順</option>
        <option value="category">カテゴリ</option>
        <option value="frequency">頻度</option>
      </select>
    </div>
  );
}
