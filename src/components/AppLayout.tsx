import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, User, Wallet } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import AssistantWidget from "./AssistantWidget";
import BottomTabBar from "./BottomTabBar";
import ServiceWorkerUpdate from "./ServiceWorkerUpdate";
import Toast from "./Toast";
import { useBackupActions } from "../hooks/useBackupActions";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/entries", label: "Lançamentos" },
  { to: "/categories", label: "Categorias" },
  { to: "/planning", label: "Planejamento" },
];

const desktopLinkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    "px-3 py-2 text-sm font-semibold transition",
    isActive
      ? "text-primary"
      : "text-slate-600/80 hover:text-primary dark:text-slate-300 dark:hover:text-primary",
  ].join(" ");

const menuLinkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    "block rounded-2xl px-3 py-3 text-sm font-semibold transition",
    isActive
      ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
      : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:text-primary",
  ].join(" ");

type ToastState = {
  type: "success" | "error";
  message: string;
};

const AppLayout = () => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const gearRef = useRef<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 8, right: 16 });
  const location = useLocation();
  const navigate = useNavigate();
  const { exportBackup, importBackup, isExporting, isImporting } = useBackupActions();
  const [menuToast, setMenuToast] = useState<ToastState | null>(null);
  const menuFileInputRef = useRef<HTMLInputElement | null>(null);

  const openSettings = () => setSettingsOpen(true);

  const closeSettings = () => setSettingsOpen(false);

  const handleLogoutFromSheet = () => {
    closeSettings();
    logout();
  };

  const handleMenuExport = useCallback(async () => {
    if (isExporting) return;
    setMenuToast(null);
    try {
      const message = await exportBackup();
      setMenuToast({ type: "success", message });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível exportar o backup.";
      setMenuToast({ type: "error", message });
    }
  }, [exportBackup, isExporting]);

  const handleMenuFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || isImporting) return;
      setMenuToast(null);
      try {
        const message = await importBackup(file);
        setMenuToast({ type: "success", message });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível importar o backup. Verifique o arquivo e tente novamente.";
        setMenuToast({ type: "error", message });
      }
    },
    [importBackup, isImporting],
  );

  const isAssistantRoute = location.pathname.startsWith("/assistant");
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

  useLayoutEffect(() => {
    if (!settingsOpen || typeof window === "undefined") return;
    const rect = gearRef.current?.getBoundingClientRect();
    if (!rect) {
      setDropdownPosition({ top: 8, right: 16 });
      return;
    }
    const baseTop = rect.bottom + 8;
    const maxTop = window.innerHeight - 220;
    const safeTop = Math.max(8, Math.min(baseTop, maxTop));
    const right = Math.max(12, window.innerWidth - rect.right);
    setDropdownPosition({ top: safeTop, right });
  }, [settingsOpen]);

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
              ref={gearRef}
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
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/75">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Despesas
                </span>
                <span className="text-base font-semibold text-slate-900 dark:text-white">PWA</span>
              </div>
            </div>
            <nav className="hidden flex-1 justify-center gap-6 md:flex">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={Boolean(link.end)}
                  className={desktopLinkClasses}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSettingsOpen((prev) => !prev)}
                ref={gearRef}
                className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-primary"
                aria-label="Abrir menu principal"
              >
                {isMobileView ? (
                  <Menu className="h-5 w-5" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </header>
      )}
      <main className={`${hideTabBar ? "pb-6" : "app-main"} mx-auto max-w-6xl px-4 py-6 md:pb-6`}>
        <Outlet />
      </main>
      {settingsOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[998] bg-black/30 backdrop-blur-sm"
              onClick={closeSettings}
              aria-label="Fechar menu"
            />
            <div
              className={[
                "relative z-[999] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-800/30 dark:bg-slate-950/95",
                isMobileView
                  ? "fixed inset-3 overflow-y-auto"
                  : "absolute min-w-[280px] max-w-sm",
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                isMobileView
                  ? undefined
                  : {
                      position: "fixed",
                      top: dropdownPosition.top,
                      right: dropdownPosition.right,
                    }
              }
            >
              <div className="space-y-6">
                <section className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    Navegação
                  </p>
                  <div className="space-y-2">
                    {NAV_LINKS.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={Boolean(link.end)}
                        className={menuLinkClasses}
                        onClick={closeSettings}
                      >
                        {link.label}
                      </NavLink>
                    ))}
                  </div>
                </section>
                <section className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    Configurações
                  </p>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                        closeSettings();
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-800 dark:text-slate-100"
                    >
                      Alternar tema
                      <span>{theme === "dark" ? "🌙" : "☀️"}</span>
                    </button>
                    <div className="space-y-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 text-sm text-slate-700 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-200">
                      <p className="font-semibold text-slate-900 dark:text-white">Backup</p>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleMenuExport}
                          disabled={isExporting}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:text-slate-100"
                        >
                          Exportar backup
                          <span aria-hidden="true">↓</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => menuFileInputRef.current?.click()}
                          disabled={isImporting}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:text-slate-100"
                        >
                          Importar backup
                          <span aria-hidden="true">↑</span>
                        </button>
                        <input
                          ref={menuFileInputRef}
                          type="file"
                          accept=".json,application/json"
                          className="hidden"
                          onChange={handleMenuFileChange}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Importar backup pode sobrescrever dados atuais. Validação mínima:{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-100">
                            meta.userId
                          </span>{" "}
                          e{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-100">
                            data
                          </span>
                          .
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogoutFromSheet}
                      className="flex w-full items-center justify-between rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-200 hover:bg-rose-100 dark:border-rose-200/40 dark:bg-rose-900/30 dark:text-rose-200"
                    >
                      Logout
                      <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </>,
          document.body,
        )}
      {menuToast && (
        <Toast type={menuToast.type} message={menuToast.message} onClose={() => setMenuToast(null)} />
      )}
      {!isMobileView && <AssistantWidget />}
      {isMobileNavigation && <BottomTabBar />}
      <ServiceWorkerUpdate />

    </div>
  );
};

export default AppLayout;
