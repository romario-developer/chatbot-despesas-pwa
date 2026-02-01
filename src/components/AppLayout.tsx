import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Settings, Moon, Sun } from "lucide-react";
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
      ? "text-[var(--primary)]"
      : "text-[var(--text-muted)] hover:text-[var(--primary)]",
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
    closeSettings();
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
      closeSettings();
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

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSettings();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

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

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--page-text)] transition-colors duration-200">
      {isAssistantRoute ? (
        <header className="sticky top-0 z-10 border-b border-[var(--border-muted)] bg-[var(--header-bg)] pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm font-semibold text-[var(--text-primary)] transition hover:text-[var(--primary)]"
            >
              Voltar
            </button>
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Assistente</p>
            </div>
            <button
              type="button"
              onClick={openSettings}
              ref={gearRef}
              className="md:hidden rounded-full border border-[var(--border-muted)] p-2 text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
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
        <header className="sticky top-0 z-20 border-b border-[var(--border-muted)] bg-[var(--header-bg)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-3">
            <NavLink to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--page-bg)] p-1 transition">
                <img src="/logo.png" alt="Gestão Financeira" className="h-8 w-auto object-contain" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold text-[var(--text-primary)]">Financio</span>
                <span className="text-[0.65rem] font-semibold tracking-[0.3em] text-[var(--text-muted)] uppercase">
                  Gestão Financeira
                </span>
              </div>
            </NavLink>
            <nav
              className="hidden flex-1 items-center justify-center gap-6 md:flex"
              aria-label="Navegação principal"
            >
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
                className="rounded-2xl border border-[var(--border-muted)] bg-[var(--settings-bg)] px-3 py-2 text-[var(--text-muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                aria-label="Abrir menu de configurações"
                aria-expanded={settingsOpen}
              >
                <Settings className="h-5 w-5" />
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
              aria-label="Fechar configurações"
            />
            <div
              className="fixed inset-0 z-[999] flex items-end justify-center px-3 pb-6 md:items-start md:justify-end md:px-4"
              onClick={closeSettings}
            >
              <div
                className={[
                  "settings-panel p-4 md:absolute",
                  isMobileView
                    ? "max-h-[80vh] overflow-y-auto md:hidden"
                    : "min-w-[320px] max-w-sm",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    Configurações
                  </p>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                        closeSettings();
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-muted)] bg-[var(--card-bg)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    >
                      <span className="flex items-center gap-2">
                        {theme === "dark" ? (
                          <>
                            <Sun className="h-4 w-4" />
                            Modo claro
                          </>
                        ) : (
                          <>
                            <Moon className="h-4 w-4" />
                            Modo escuro
                          </>
                        )}
                      </span>
                    </button>
                    <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--card-bg)] p-3 text-sm text-[var(--text-muted)] shadow-[0_10px_25px_rgba(15,23,42,0.08)]">
                      <p className="font-semibold text-[var(--text-primary)]">Backup</p>
                      <div className="mt-2 space-y-2">
                        <button
                          type="button"
                          onClick={handleMenuExport}
                          disabled={isExporting}
                          className="flex w-full items-center justify-between rounded-xl border border-[var(--border-muted)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Exportar backup
                          <span aria-hidden="true">↓</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => menuFileInputRef.current?.click()}
                          disabled={isImporting}
                          className="flex w-full items-center justify-between rounded-xl border border-[var(--border-muted)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70"
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
                        <p className="text-xs text-[var(--text-muted)]">
                          Importar backup pode sobrescrever dados atuais. Validação mínima:{" "}
                          <span className="font-semibold text-[var(--text-primary)]">meta.userId</span> e{" "}
                          <span className="font-semibold text-[var(--text-primary)]">data</span>.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogoutFromSheet}
                      className="flex w-full items-center justify-between rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--danger-text)] transition hover:opacity-90"
                    >
                      Logout
                      <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </div>
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
