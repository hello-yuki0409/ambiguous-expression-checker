import { memo } from "react";
import { type Finding } from "@/lib/detection";

type Props = {
  findings: Finding[];
  onJump?: (offset: number) => void;
};

function FindingsPanel({ findings, onJump }: Props) {
  if (!findings.length) {
    return <div className="text-sm text-muted-foreground">検出なし</div>;
  }
  return (
    <div className="space-y-2 text-sm">
      {findings.map((f, i) => (
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
            <span className="font-mono text-xs opacity-70">[{f.category}]</span>
            <span className="truncate">{f.text}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export default memo(FindingsPanel);
