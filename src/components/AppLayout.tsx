import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AssistantWidget from "./AssistantWidget";
import BottomTabBar from "./BottomTabBar";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    "text-sm font-medium transition-colors",
    isActive ? "text-primary" : "text-slate-700 hover:text-primary",
  ].join(" ");

const AppLayout = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
          <div className="flex-1 md:hidden" />
          <div className="flex flex-1 items-center justify-center">
            <div className="h-10 w-10 rounded-full border border-slate-200 bg-primary text-white shadow-sm flex items-center justify-center text-lg font-semibold">
              D
            </div>
          </div>
          <div className="flex flex-1 justify-end">
            <nav className="hidden items-center gap-4 md:flex">
              <NavLink to="/" end className={linkClasses}>
                Dashboard
              </NavLink>
              <NavLink to="/entries" className={linkClasses}>
                Lancamentos
              </NavLink>
              <NavLink to="/categories" className={linkClasses}>
                Categorias
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
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
      <AssistantWidget />
      <BottomTabBar />

    </div>
  );
};

export default AppLayout;
