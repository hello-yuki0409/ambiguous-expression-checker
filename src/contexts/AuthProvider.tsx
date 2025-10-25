import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Firebase の認証状態の変化を監視する用
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to subscribe auth state", err);
        setError(err instanceof Error ? err.message : "Authentication error");
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
