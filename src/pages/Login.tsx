import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AuthModeSwitcher } from "@/components/molecules/auth/AuthModeSwitcher";
import { PageShell } from "@/components/templates/PageShell";
import { AuthPageTemplate } from "@/components/templates/AuthPageTemplate";
import { useAuthForm } from "@/hooks/useAuthForm";

export default function Login() {
  const { user, loading: authLoading } = useAuth();
  const {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    authorLabel,
    setAuthorLabel,
    error,
    setError,
    loading,
    handleSubmit,
    submitLabel,
  } = useAuthForm("signIn");

  useEffect(() => {
    if (!authLoading && user) {
      // カスタムフック側でリダイレクト済みなのでページ側では確認のみ
    }
  }, [authLoading, user]);

  if (authLoading && !user) {
    return (
      <PageShell className="flex h-screen items-center justify-center">
        <div className="text-emerald-700">認証状態を確認しています...</div>
      </PageShell>
    );
  }

  const title = mode === "signUp" ? "アカウント作成" : "ログイン";
  return (
    <AuthPageTemplate
      title={title}
      description={
        mode === "signUp"
          ? "メールアドレスとパスワードでアカウントを作成します。"
          : "登録済みのメールアドレスでログインしてください。"
      }
      footer={
        <AuthModeSwitcher
          mode={mode}
          onSwitch={(nextMode) => {
            setMode(nextMode);
            setError(null);
          }}
          className="mt-6"
        />
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-medium text-emerald-700" htmlFor="email">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-emerald-700" htmlFor="password">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          {mode === "signUp" && (
            <div>
              <label className="text-xs font-medium text-emerald-700" htmlFor="authorLabel">
                表示名（投稿者名）
              </label>
              <input
                id="authorLabel"
                type="text"
                value={authorLabel}
                onChange={(e) => setAuthorLabel(e.target.value)}
                placeholder="例: 山田 太郎"
                className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={loading}
          >
            {submitLabel}
          </Button>
      </form>
    </AuthPageTemplate>
  );
}
