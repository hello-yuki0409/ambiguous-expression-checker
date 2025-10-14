import { useEffect, useState } from "react";
import { rewriteText } from "@/lib/api";
import type { Finding } from "@/lib/detection";
import { Button } from "@/components/ui/button";
import { AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { ModalShell } from "@/components/templates/ModalShell";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  original: string;
  context: string;
  category?: Finding["category"];
  style?: "敬体" | "常体";
  onReplace: (newText: string) => void;
};

export default function RewriteDialog({
  open,
  onOpenChange,
  original,
  context,
  category,
  style,
  onReplace,
}: Props) {
  const [candidate, setCandidate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // モーダルを開いた or 原文が変わったら毎回リセット
  useEffect(() => {
    if (open) {
      setCandidate("");
      setReason("");
      setError(null);
      setLoading(false);
    }
  }, [open, original]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await rewriteText({
        text: original,
        context,
        category,
        style,
      });
      if (!response.rewrite) {
        // 一応 null の場合もメッセージを出す
        setError("候補を生成できませんでした。少し待って再度お試しください。");
      } else {
        setCandidate(response.rewrite);
        setReason(response.reason ?? "");
      }
    } catch (e) {
      const msg = (e as Error).message || "エラーが発生しました。";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="言い換え候補"
      contentClassName="sm:max-w-[560px]"
      footer={
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>閉じる</AlertDialogCancel>
        </AlertDialogFooter>
      }
    >
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
          {candidate && (
            <Button onClick={() => onReplace(candidate)}>差し替え</Button>
          )}
        </div>

        {candidate && (
          <>
            <div className="text-xs text-muted-foreground">候補</div>
            <p className="p-2 border rounded bg-muted/30 whitespace-pre-wrap">
              {candidate}
            </p>
            {reason && (
              <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {reason}
              </p>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
}
