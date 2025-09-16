import { memo } from "react";
import { type Finding } from "@/lib/detection";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";

type Props = {
  findings: Finding[];
  onJump?: (offset: number) => void;
};

function FindingsPanel({ findings, onJump }: Props) {
  if (!findings.length) {
    return <div className="text-sm text-muted-foreground">検出なし</div>;
  }

  const sevColor = (sev: number) => {
    switch (sev) {
      case 1:
        return "text-yellow-500";
      case 2:
        return "text-orange-500";
      case 3:
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <ScrollArea className="h-[70vh] pr-2">
      <div className="space-y-2">
        {findings.map((f, i) => (
          <Card
            key={`${f.start}-${i}`}
            className="cursor-pointer hover:bg-accent transition"
            onClick={() => onJump?.(f.start)}
          >
            <CardContent className="p-3 flex items-center gap-2">
              <Circle size={12} className={sevColor(f.severity)} />
              <Badge variant="secondary" className="text-xs">
                {f.category}
              </Badge>
              <span className="truncate">{f.text}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

export default memo(FindingsPanel);
