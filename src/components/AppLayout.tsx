import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import AssistantWidget from "./AssistantWidget";
import BottomTabBar from "./BottomTabBar";
import AssistantIcon from "./AssistantIcon";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";
import ServiceWorkerUpdate from "./ServiceWorkerUpdate";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    "text-sm font-medium transition-colors",
    isActive ? "text-primary" : "text-slate-700 dark:text-slate-200 hover:text-primary",
  ].join(" ");

const AppLayout = () => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assistantWidgetOpen, setAssistantWidgetOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const openSettings = () => setSettingsOpen(true);

  const closeSettings = () => setSettingsOpen(false);

  const handleLogoutFromSheet = () => {
    closeSettings();
    logout();
  };

  const prefersReducedMotion = usePrefersReducedMotion();
  const isAssistantRoute = location.pathname.startsWith("/assistant");
  const assistantActive = assistantWidgetOpen || isAssistantRoute;
  const isMobileNavigation = isMobileView && !isAssistantRoute;
  const hideTabBar = isMobileView && isAssistantRoute;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const handleChange = () => setIsMobileView(mq.matches);
    handleChange();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handleChange);
    } else {
      mq.addListener(handleChange);
    }
    window.addEventListener("resize", handleChange);
    return () => {
      if (typeof mq.removeEventListener === "function") {
        mq.removeEventListener("change", handleChange);
      } else {
        mq.removeListener(handleChange);
      }
      window.removeEventListener("resize", handleChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {isAssistantRoute ? (
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm font-semibold text-slate-700 transition hover:text-slate-900 dark:text-slate-100 dark:hover:text-white"
            >
              Voltar
            </button>
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assistente</p>
            </div>
            <button
              type="button"
              onClick={openSettings}
              className="md:hidden rounded-full border border-slate-200 p-2 text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-100 dark:hover:text-white"
              aria-label="Abrir configurações"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm9-3.5a2.5 2.5 0 0 1-2.438 2.496l-.196.013-.133-.02-1.615-.414-.402 1.46.643.643c.193.193.193.506 0 .7l-1.414 1.414a.5.5 0 0 1-.707 0l-.643-.643-1.46.402.414 1.615c.021.084.023.17.013.255A2.5 2.5 0 0 1 12 21.5a2.5 2.5 0 0 1-2.496-2.438l-.013-.196.02-.133.414-1.615-1.46-.402-.643.643a.5.5 0 0 1-.707 0L5.5 16.334a.5.5 0 0 1 0-.707l.643-.643-1.46-.402-.414 1.615a2.5 2.5 0 0 1-4.985-.266l-.013-.196A2.5 2.5 0 0 1 2.5 12c0-1.246.9-2.28 2.094-2.458l.196-.033.133.02 1.615.414.402-1.46-.643-.643a.5.5 0 0 1 0-.707L5.5 5.358a.5.5 0 0 1 .707 0l.643.643 1.46-.402-.414-1.615a2.5 2.5 0 0 1 4.985.266l.013.196-.02.133-.414 1.615 1.46.402.643-.643a.5.5 0 0 1 .707 0l1.414 1.414a.5.5 0 0 1 0 .707l-.643.643 1.46.402.414-1.615c.021-.084.023-.17.013-.255A2.5 2.5 0 0 1 21.5 12z"
                />
              </svg>
            </button>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
            <div className="flex-1 md:hidden" />
            <div className="flex flex-1 items-center justify-center">
              <div
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-[#25D366] transition",
                  assistantActive ? "ring-2 ring-[#25D366]/50" : "ring-0",
                  assistantActive && !prefersReducedMotion ? "motion-safe:animate-[pulse_1.3s_ease-in-out]" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <AssistantIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex flex-1 justify-end items-center md:gap-4">
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
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-100"
                >
                  Logout
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-100"
                  aria-label="Alternar tema"
                >
                  {theme === "dark" ? "🌙" : "☀️"}
                </button>
              </nav>
              <button
                type="button"
                onClick={openSettings}
                className="md:hidden rounded-full border border-slate-200 p-2 text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-100 dark:hover:text-white"
                aria-label="Abrir configurações"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm9-3.5a2.5 2.5 0 0 1-2.438 2.496l-.196.013-.133-.02-1.615-.414-.402 1.46.643.643c.193.193.193.506 0 .7l-1.414 1.414a.5.5 0 0 1-.707 0l-.643-.643-1.46.402.414 1.615c.021.084.023.17.013.255A2.5 2.5 0 0 1 12 21.5a2.5 2.5 0 0 1-2.496-2.438l-.013-.196.02-.133.414-1.615-1.46-.402-.643.643a.5.5 0 0 1-.707 0L5.5 16.334a.5.5 0 0 1 0-.707l.643-.643-1.46-.402-.414 1.615a2.5 2.5 0 0 1-4.985-.266l-.013-.196A2.5 2.5 0 0 1 2.5 12c0-1.246.9-2.28 2.094-2.458l.196-.033.133.02 1.615.414.402-1.46-.643-.643a.5.5 0 0 1 0-.707L5.5 5.358a.5.5 0 0 1 .707 0l.643.643 1.46-.402-.414-1.615a2.5 2.5 0 0 1 4.985.266l.013.196-.02.133-.414 1.615 1.46.402.643-.643a.5.5 0 0 1 .707 0l1.414 1.414a.5.5 0 0 1 0 .707l-.643.643 1.46.402.414-1.615c.021-.084.023-.17.013-.255A2.5 2.5 0 0 1 21.5 12z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>
      )}
      <main className={`${hideTabBar ? "pb-6" : "app-main"} mx-auto max-w-6xl px-4 py-6 md:pb-6`}>
        <Outlet />
      </main>
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-transparent"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeSettings}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Configurações</p>
              <button
                type="button"
                onClick={closeSettings}
                className="text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                aria-label="Fechar configurações"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                }}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-100"
              >
                Alternar tema
                <span>{theme === "dark" ? "🌙" : "☀️"}</span>
              </button>
              <button
                type="button"
                onClick={handleLogoutFromSheet}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 dark:border-slate-700"
              >
                Logout
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {!isMobileView && (
        <AssistantWidget onStateChange={(open) => setAssistantWidgetOpen(open)} />
      )}
      {isMobileNavigation && <BottomTabBar />}
      <ServiceWorkerUpdate />

    </div>
  );
};

export default AppLayout;
