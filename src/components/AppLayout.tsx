import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken } from "../api/client";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    "text-sm font-medium transition-colors",
    isActive ? "text-primary" : "text-slate-700 hover:text-primary",
  ].join(" ");

const AppLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold text-primary">Despesas</div>
          <nav className="flex items-center gap-4">
            <NavLink to="/" end className={linkClasses}>
              Dashboard
            </NavLink>
            <NavLink to="/entries" className={linkClasses}>
              Lancamentos
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
