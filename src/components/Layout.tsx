import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  const linkBase = "px-3 py-2 rounded-lg hover:opacity-80 transition";
  const active = "font-semibold underline";
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="max-w-5xl mx-auto p-4 flex gap-3">
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
      </header>
      <main className="max-w-5xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
