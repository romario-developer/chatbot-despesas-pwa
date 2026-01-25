import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AssistantWidget from "./AssistantWidget";
import BottomTabBar from "./BottomTabBar";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    "text-sm font-medium transition-colors",
    isActive ? "text-primary" : "text-slate-700 hover:text-primary",
  ].join(" ");

const mobileLinkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    "w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
    isActive ? "bg-slate-100 text-primary" : "text-slate-700 hover:bg-slate-50",
  ].join(" ");

const AppLayout = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userLabel = () => {
    const name = user?.name?.trim();
    const email = user?.email?.trim();
    if (name) return `Ola, ${name}`;
    if (email) return email;
    return "";
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
  };

  const label = userLabel();

  return (
    <div className="min-h-screen bg-slate-50">
            <header class="sticky top-0 z-10 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)]">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="md:hidden rounded-full border border-slate-200 p-2 text-slate-700 transition hover:border-primary hover:text-primary"
              aria-label="Abrir menu"
            >
              <svg viewBox="0 0 20 20" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <span class="hidden text-lg font-semibold text-primary md:block">Despesas</span>
          </div>
          <div class="flex items-center justify-center">
            <div class="h-10 w-10 rounded-full border border-slate-200 bg-primary text-white shadow-sm flex items-center justify-center text-lg font-semibold">
              D
            </div>
          </div>
          <div class="flex items-center gap-3">
            <nav class="hidden items-center gap-4 md:flex">
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
                class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
              >
                Logout
              </button>
            </nav>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              class="md:hidden rounded-full border border-slate-200 p-2 text-slate-700 transition hover:border-primary hover:text-primary"
              aria-label="Abrir menu"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M10 6.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM10 11.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zM10 16.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-full rounded-2xl bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Fechar menu"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.72 4.72a.75.75 0 0 1 1.06 0L10 8.94l4.22-4.22a.75.75 0 1 1 1.06 1.06L11.06 10l4.22 4.22a.75.75 0 1 1-1.06 1.06L10 11.06l-4.22 4.22a.75.75 0 0 1-1.06-1.06L8.94 10 4.72 5.78a.75.75 0 0 1 0-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <NavLink
                to="/"
                end
                className={mobileLinkClasses}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/entries"
                className={mobileLinkClasses}
                onClick={() => setMobileMenuOpen(false)}
              >
                Lancamentos
              </NavLink>
              <NavLink
                to="/categories"
                className={mobileLinkClasses}
                onClick={() => setMobileMenuOpen(false)}
              >
                Categorias
              </NavLink>
              <NavLink
                to="/planning"
                className={mobileLinkClasses}
                onClick={() => setMobileMenuOpen(false)}
              >
                Planejamento
              </NavLink>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
      <AssistantWidget />
      <BottomTabBar />

    </div>
  );
};

export default AppLayout;
