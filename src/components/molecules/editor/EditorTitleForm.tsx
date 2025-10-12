import type { ChangeEvent } from "react";
import { cn } from "@/lib/utils";

type EditorTitleFormProps = {
  title: string;
  onChange: (value: string) => void;
  articleId?: string | null;
  className?: string;
};

export function EditorTitleForm({
  title,
  onChange,
  articleId,
  className,
}: EditorTitleFormProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  // 記事タイトル入力まわりを分離し、他ページでも同じ UI を再利用できるようにしている
  return (
    <div className={cn(className)}>
      <label className="text-xs font-medium text-emerald-700">記事タイトル</label>
      <input
        value={title}
        onChange={handleChange}
        placeholder="記事タイトル（任意）"
        className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-300"
      />
      {articleId && (
        <p className="mt-1 text-[11px] text-muted-foreground">Article ID: {articleId}</p>
      )}
    </div>
  );
}
