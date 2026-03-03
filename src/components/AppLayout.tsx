import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
// Adicionado Palette, Volume2, VolumeX para os novos botões
import { Settings, Moon, Sun, Palette, Volume2, VolumeX } from "lucide-react"; 
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import AssistantWidget from "./AssistantWidget";
import BottomTabBar from "./BottomTabBar";
import ServiceWorkerUpdate from "./ServiceWorkerUpdate";
import Toast from "./Toast";
import { useBackupActions } from "../hooks/useBackupActions";
import { buildTag } from "../constants/build";

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

// Funções para gerar cores harmônicas
const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

const updateGlobalTheme = (h: number) => {
  const primary = h;
  const complementary = (h + 180) % 360;
  const analogous = (h + 30) % 360;
  
  document.documentElement.style.setProperty('--primary-h', `${primary}`);
  document.documentElement.style.setProperty('--complementary-h', `${complementary}`);
  document.documentElement.style.setProperty('--analogous-h', `${analogous}`);
  
  localStorage.setItem('theme-hue', `${h}`);
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

  // NOVO: Estado para o som da IA
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('ai-sound') !== 'false');

  const openSettings = () => setSettingsOpen(true);
  const closeSettings = () => setSettingsOpen(false);

  const handleLogoutFromSheet = () => {
    closeSettings();
    logout();
  };

  // NOVO: Funções de ação das novas configurações
  const handleToggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('ai-sound', String(newValue));
  };

  const handleGeneratePalette = () => {
    const newHue = randomRange(0, 360);
    updateGlobalTheme(newHue);
  };

  // NOVO: Carrega o tema salvo ao iniciar o AppLayout
  useEffect(() => {
    const savedHue = localStorage.getItem('theme-hue');
    if (savedHue) updateGlobalTheme(Number(savedHue));
  }, []);

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

  const appVersion = import.meta.env.VITE_APP_VERSION || buildTag;
  
  const handleClearAppCache = useCallback(async () => {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm(
      "Limpar o cache do app pode deslogar você e apagar dados locais. Deseja continuar?",
    );
    if (!confirmed) return;
    setMenuToast(null);
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
      setMenuToast({ type: "success", message: "Cache limpo. O app será recarregado." });
      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível limpar o cache do app.";
      setMenuToast({ type: "error", message });
    }
  }, []);

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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
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
            {/* Ícone de configurações para Mobile */}
            <button
              type="button"
              onClick={openSettings}
              ref={gearRef}
              className="md:hidden rounded-full border border-[var(--border-muted)] p-2 text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              aria-label="Abrir configurações"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-3">
            <NavLink to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1 transition">
                <img src="/logo.png" alt="Gestão Financeira" className="h-8 w-auto object-contain" />
              </div>
              <div className="flex flex-col leading-tight cursor-pointer" onClick={() => window.location.reload()}>
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
                    {/* 1. MODO CLARO/ESCURO */}
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

                    {/* 2. NOVA SEÇÃO: PERSONALIZAÇÃO DE CORES (Aparência do Backup) */}
                    <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--card-bg)] p-3 text-sm text-[var(--text-muted)] shadow-[0_10px_25px_rgba(15,23,42,0.08)]">
                      <p className="font-semibold text-[var(--text-primary)]">Personalização</p>
                      <div className="mt-2 space-y-2">
                        <button
                          type="button"
                          onClick={handleGeneratePalette}
                          className="flex w-full items-center justify-between rounded-xl border border-[var(--border-muted)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                        >
                          Mudar tema (Cor Aleatória)
                          <Palette className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* 3. NOVA SEÇÃO: ASSISTENTE IA (Aparência do Backup) */}
                    <div className="rounded-2xl border border-[var(--border-muted)] bg-[var(--card-bg)] p-3 text-sm text-[var(--text-muted)] shadow-[0_10px_25px_rgba(15,23,42,0.08)]">
                      <p className="font-semibold text-[var(--text-primary)]">Assistente IA</p>
                      <div className="mt-2 space-y-2">
                        <button
                          type="button"
                          onClick={handleToggleSound}
                          className="flex w-full items-center justify-between rounded-xl border border-[var(--border-muted)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary)]"
                        >
                          Efeitos sonoros do Chat
                          {soundEnabled ? (
                            <Volume2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <VolumeX className="h-4 w-4 text-red-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 4. BACKUP (Original) */}
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
                      onClick={handleClearAppCache}
                      className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--text-muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                    >
                      Limpar cache do app
                      <span className="text-xs text-[var(--text-muted)]">(suporte)</span>
                    </button>
                    
                    <p
                      className="mt-2 text-xs text-[var(--text-muted)]"
                      title="Versão disponível para debug"
                    >
                      Versão: {appVersion}
                    </p>
                    
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
      
      {/* MUDANÇA AQUI: Carrega o Assistente sempre, sem a trava do !isMobileView */}
      <AssistantWidget />
      
      {isMobileNavigation && <BottomTabBar />}
      <ServiceWorkerUpdate />
    </div>
  );
};

export default AppLayout;