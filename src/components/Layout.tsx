import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

export default function Layout() {
  const linkBase = "px-3 py-2 rounded-lg hover:opacity-80 transition";
  const active = "font-semibold underline";
  const { user } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const displayName =
    user?.displayName?.trim() || user?.email || "ユーザー";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Failed to sign out", error);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
          <nav className="flex gap-3">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${linkBase} ${isActive ? active : ""}`
              }
            >
              エディタ
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? active : ""}`
              }
            >
              履歴
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? active : ""}`
              }
            >
              ダッシュボード
            </NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {displayName} さん
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "ログアウト中..." : "ログアウト"}
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
