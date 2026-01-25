import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ASSISTANT_OPEN_EVENT } from "../constants/assistantEvents";

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
  const openAssistant = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_EVENT));
  }, []);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(max-width: 767px)").matches;
  });

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
            className="relative -top-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-primary text-2xl text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 active:translate-y-0.5"
          >
            🙂
          </button>
        </div>
        <div className="flex flex-1 items-center justify-end gap-1">{tabs.slice(2).map(renderTab)}</div>
      </div>
    </nav>
  );
};

export default BottomTabBar;
