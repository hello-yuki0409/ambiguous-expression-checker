import { useState } from "react";
import { type Finding } from "@/lib/detection";
import { FindingsListItem } from "@/components/molecules/history/FindingsListItem";
import {
  FindingsSortControl,
  type FindingsSortMode,
} from "@/components/molecules/findings/FindingsSortControl";

type Props = {
  findings: Finding[];
  onJump?: (offset: number) => void;
  onSelect?: (f: Finding) => void; // 候補モーダルを開く用
};

export default function FindingsPanel({ findings, onJump, onSelect }: Props) {
  const [sort, setSort] = useState<FindingsSortMode>("order");

  const sortFindings = (list: Finding[], mode: FindingsSortMode) => {
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
      <FindingsSortControl
        count={findings.length}
        sort={sort}
        onSortChange={setSort}
      />

      {sorted.map((f, index) => (
        <FindingsListItem
          key={`${f.start}-${index}`}
          finding={f}
          index={index}
          onJump={onJump}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
