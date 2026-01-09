import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { updateSW } from "../main";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    "text-sm font-medium transition-colors",
    isActive ? "text-primary" : "text-slate-700 hover:text-primary",
  ].join(" ");

const AppLayout = () => {
  const { user, logout } = useAuth();
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handler = () => setShowUpdate(true);
    window.addEventListener("pwa:need-refresh", handler);
    return () => window.removeEventListener("pwa:need-refresh", handler);
  }, []);

  const userLabel = () => {
    const name = user?.name?.trim();
    const email = user?.email?.trim();
    if (name) return `Ola, ${name}`;
    if (email) return email;
    return "";
  };

  const handleLogout = () => {
    logout();
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateSW(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const label = userLabel();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold text-primary">Despesas</div>
            {label && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {label}
              </span>
            )}
          </div>
          <nav className="flex items-center gap-4">
            <NavLink to="/" end className={linkClasses}>
              Dashboard
            </NavLink>
            <NavLink to="/entries" className={linkClasses}>
              Lancamentos
            </NavLink>
            <NavLink to="/planning" className={linkClasses}>
              Planejamento
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
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      {showUpdate && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg bg-blue-600 p-4 text-white shadow-lg sm:flex-row sm:items-center">
            <span className="text-sm font-semibold">Nova versao disponivel</span>
            <button
              type="button"
              onClick={handleUpdate}
              className="rounded bg-white px-3 py-1 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-70"
              disabled={isUpdating}
              aria-label="Atualizar agora"
            >
              {isUpdating ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
