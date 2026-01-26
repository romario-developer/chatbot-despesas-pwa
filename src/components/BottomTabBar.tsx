import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ASSISTANT_OPEN_EVENT } from "../constants/assistantEvents";
import AssistantIcon from "./AssistantIcon";
import usePrefersReducedMotion from "../hooks/usePrefersReducedMotion";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

type TabItem = {
  label: string;
  to: string;
  icon: ReactNode;
};

const tabs: TabItem[] = [
  {
    label: "Início",
    to: "/",
    icon: (
      <path
        d="M3 9.5L10 3l7 6.5V18a1 1 0 0 1-1 1h-4v-4H8v4H4a1 1 0 0 1-1-1V9.5z"
        strokeWidth="1.5"
      />
    ),
  },
  {
    label: "Lançamentos",
    to: "/entries",
    icon: (
      <path d="M4 6h12v3h3M6 17H5a1 1 0 0 1-1-1V5v-1h12v12a1 1 0 0 1-1 1h-1" strokeWidth="1.5" />
    ),
  },
  {
    label: "Cartões",
    to: "/cards",
    icon: (
      <path
        d="M4 7h12v6H4zM4 10h12M7 16h3"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "Planejamento",
    to: "/planning",
    icon: (
      <path d="M5 7h10v10H5zM12 7v10M8 7v4" strokeWidth="1.5" strokeLinecap="round" />
    ),
  },
];

const tabBarStyle: CSSProperties & { "--tabbar-height": string } = {
  height: "var(--tabbar-height, 64px)",
  "--tabbar-height": "64px",
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
};

const BottomTabBar = () => {
  const { toggleTheme, theme } = useTheme();
  const { logout } = useAuth();
  const openAssistant = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_EVENT));
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(max-width: 767px)").matches;
  });
  const assistantActive = useMemo(() => location.pathname.startsWith("/assistant"), [location]);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;
    const html = document.documentElement;
    const mq = window.matchMedia("(max-width: 767px)");
    const setHeight = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      const value = mobile ? "64px" : "0px";
      html.style.setProperty("--tabbar-height", value);
    };
    setHeight();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", setHeight);
    } else {
      mq.addListener(setHeight);
    }
    window.addEventListener("resize", setHeight);
    return () => {
      if (typeof mq.removeEventListener === "function") {
        mq.removeEventListener("change", setHeight);
      } else {
        mq.removeListener(setHeight);
      }
      window.removeEventListener("resize", setHeight);
      html.style.setProperty("--tabbar-height", "0px");
    };
  }, []);

  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [location.pathname]);

  const renderTab = (tab: TabItem) => (
    <NavLink
      key={tab.to}
      to={tab.to}
      end={tab.to === "/"}
      className={({ isActive }: { isActive: boolean }) =>
        [
          "flex-1 flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs font-semibold transition",
          isActive
            ? "text-primary"
            : "text-slate-500 dark:text-slate-300 hover:text-primary",
        ].join(" ")
      }
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-6 w-6"
        aria-hidden="true"
        stroke="currentColor"
      >
        {tab.icon}
      </svg>
      <span>{tab.label}</span>
    </NavLink>
  );

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-[70] overflow-visible border-t border-slate-200 bg-white shadow-[0_-2px_12px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 md:hidden"
      style={tabBarStyle}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-2">
        <div className="flex flex-1 items-center gap-1">{tabs.slice(0, 2).map(renderTab)}</div>
        <div className="relative flex h-full items-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (isMobile) {
                navigate("/assistant");
              } else {
                openAssistant();
              }
            }}
            aria-label="Abrir assistente"
            className={[
              "relative -top-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#25D366] text-white shadow-lg shadow-slate-900/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
              assistantActive ? "ring-2 ring-[#25D366]/40" : "",
              assistantActive && !prefersReducedMotion ? "motion-safe:animate-[pulse_1.3s_ease-in-out]" : "",
              !assistantActive ? "hover:-translate-y-0.5 active:translate-y-0.5" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <AssistantIcon className="h-8 w-8 text-white" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-end gap-1">
          {tabs.slice(2).map(renderTab)}
          <button
            type="button"
            aria-label="Mais"
            onClick={() => setIsMoreMenuOpen((prev) => !prev)}
            className="flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs font-semibold text-slate-500 transition hover:text-primary"
          >
            <span className="text-lg leading-none">⋯</span>
            <span>Mais</span>
          </button>
        </div>
      </div>
      {isMoreMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[69] bg-black/30"
            onClick={() => setIsMoreMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-3 bottom-[var(--tabbar-height,64px)] z-[70] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => {
                toggleTheme();
                setIsMoreMenuOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-primary hover:text-primary dark:border-slate-800 dark:text-slate-100"
            >
              <span>{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>
              <span className="text-lg" aria-hidden="true">
                ⛅
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                setIsMoreMenuOpen(false);
              }}
              className="mt-3 flex w-full items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-red-100 hover:text-rose-700 dark:border-rose-200/40 dark:bg-rose-900/30"
            >
              <span>Sair</span>
              <span className="text-lg" aria-hidden="true">
                ↗
              </span>
            </button>
          </div>
        </>
      )}
    </nav>
  );
};

export default BottomTabBar;
