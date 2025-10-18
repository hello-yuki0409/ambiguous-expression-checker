import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

// カスタムフックっす。 ログイン/サインアップのフォーム周りをまとめた。
export type AuthMode = "signIn" | "signUp";

export function useAuthForm(initialMode: AuthMode = "signIn") {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authorLabel, setAuthorLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = useMemo(() => {
    const state = location.state as
      | { from?: { pathname?: string } }
      | undefined;
    return state?.from?.pathname ?? "/";
  }, [location.state]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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
    },
    [authorLabel, email, mode, navigate, password, redirectPath]
  );

  const submitLabel = useMemo(() => {
    if (loading) {
      return mode === "signUp" ? "登録中..." : "ログイン中...";
    }
    return mode === "signUp" ? "登録する" : "ログイン";
  }, [loading, mode]);

  return {
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
  };
}
