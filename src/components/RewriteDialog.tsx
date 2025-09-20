import { useState } from "react";
import { rewriteText } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  original: string;
  style: "敬体" | "常体";
  onReplace: (newText: string) => void;
};

export default function RewriteDialog({
  open,
  onOpenChange,
  original,
  style,
  onReplace,
}: Props) {
  const [candidate, setCandidate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const c = await rewriteText(original, style);
    if (c) setCandidate(c);
    setLoading(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[560px]">
        <AlertDialogHeader>
          <AlertDialogTitle>言い換え候補</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">原文</div>
          <p className="p-2 border rounded">{original}</p>

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "生成中..." : "候補を生成"}
            </Button>
            {candidate && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(candidate)}
                >
                  コピー
                </Button>
                <Button onClick={() => onReplace(candidate)}>差し替え</Button>
              </>
            )}
          </div>

          {candidate && (
            <>
              <div className="text-xs text-muted-foreground">候補</div>
              <p className="p-2 border rounded bg-muted/30">{candidate}</p>
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>閉じる</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
