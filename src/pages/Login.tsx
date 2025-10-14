import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  AuthModeSwitcher,
  type AuthMode,
} from "@/components/molecules/auth/AuthModeSwitcher";
import { PageShell } from "@/components/templates/PageShell";
import { AuthPageTemplate } from "@/components/templates/AuthPageTemplate";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export default function Login() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authorLabel, setAuthorLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = useMemo(() => {
    const state = location.state as LocationState | undefined;
    return state?.from?.pathname ?? "/";
  }, [location.state]);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, user, navigate, redirectPath]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mode === "signUp" && !authorLabel.trim()) {
      setError("表示名を入力してください");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signUp") {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const displayName = authorLabel.trim();
        if (displayName) {
          await updateProfile(credential.user, { displayName });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError((err as Error).message || "認証に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading && !user) {
    return (
      <PageShell className="flex h-screen items-center justify-center">
        <div className="text-emerald-700">認証状態を確認しています...</div>
      </PageShell>
    );
  }

  const title = mode === "signUp" ? "アカウント作成" : "ログイン";
  const submitLabel = loading
    ? mode === "signUp"
      ? "登録中..."
      : "ログイン中..."
    : mode === "signUp"
    ? "登録する"
    : "ログイン";

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
