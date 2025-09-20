import { useEffect, useState } from "react";
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
  const [candidate, setCandidate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルを開いた or 原文が変わったら毎回リセット
  useEffect(() => {
    if (open) {
      setCandidate("");
      setError(null);
      setLoading(false);
    }
  }, [open, original]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await rewriteText(original, style); // api.ts 側は !ok で throw する
      if (!c) {
        // 一応 null の場合もメッセージを出す
        setError("候補を生成できませんでした。少し待って再度お試しください。");
      } else {
        setCandidate(c);
      }
    } catch (e) {
      const msg = (e as Error).message || "エラーが発生しました。";
      setError(msg);
    } finally {
      setLoading(false);
    }
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

          {/* エラー表示（429: クレジット不足などが来たときに見せる） */}
          {error && (
            <div
              role="alert"
              className="text-sm border border-red-300 bg-red-50 text-red-700 rounded p-2"
            >
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "生成中..." : "候補を生成"}
            </Button>

            {candidate && !loading && (
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
              <p className="p-2 border rounded bg-muted/30 whitespace-pre-wrap">
                {candidate}
              </p>
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>閉じる</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
