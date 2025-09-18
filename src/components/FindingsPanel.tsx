import { useState } from "react";
import { type Finding } from "@/lib/detection";

type SortMode = "order" | "category" | "frequency";

type Props = {
  findings: Finding[];
  onJump?: (offset: number) => void;
};

export default function FindingsPanel({ findings, onJump }: Props) {
  const [sort, setSort] = useState<SortMode>("order");

  // ソート関数を切り替え時だけ適用する
  const sortFindings = (list: Finding[], mode: SortMode) => {
    if (mode === "order") return list;

    if (mode === "category") {
      return [...list].sort((a, b) => {
        if (a.category === b.category) return a.start - b.start;
        return a.category.localeCompare(b.category);
      });
    }

    if (mode === "frequency") {
      const freq = new Map<string, number>();
      list.forEach((f) => freq.set(f.text, (freq.get(f.text) ?? 0) + 1));
      return [...list].sort((a, b) => {
        const fa = freq.get(a.text)!;
        const fb = freq.get(b.text)!;
        if (fb !== fa) return fb - fa;
        return a.start - b.start;
      });
    }

    return list;
  };

  const sorted = sortFindings(findings, sort);

  if (!findings.length) {
    return <div className="text-sm text-muted-foreground">検出なし</div>;
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="font-medium">一覧（{findings.length}件）</div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="border rounded-md px-2 py-1 text-xs"
          aria-label="sort"
        >
          <option value="order">登場順</option>
          <option value="category">カテゴリ</option>
          <option value="frequency">頻度</option>
        </select>
      </div>

      {sorted.map((f, i) => (
        <button
          key={`${f.start}-${i}`}
          className="w-full text-left p-2 rounded-md border hover:bg-muted/40 transition"
          onClick={() => onJump?.(f.start)}
          title={f.reason ?? "曖昧な表現"}
        >
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full sev-${f.severity}`}
            />
            <span className="font-mono text-[11px] opacity-70">
              [{f.category}]
            </span>
            <span className="truncate">{f.text}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
