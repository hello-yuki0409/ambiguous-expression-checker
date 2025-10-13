import { Button } from "@/components/ui/button";

export type DashboardHeaderProps = {
  loading: boolean;
  onRefresh: () => void;
};

export function DashboardHeader({ loading, onRefresh }: DashboardHeaderProps) {
  // ダッシュボード上部のタイトルと更新ボタンを共通化する
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          ダッシュボード
        </h1>
        <p className="text-sm text-muted-foreground">
          曖昧度スコアの推移や頻出語句を振り返り、改善状況を把握しましょう。
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "更新中..." : "最新の情報に更新"}
        </Button>
      </div>
    </header>
  );
}
