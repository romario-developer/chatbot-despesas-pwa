import { useEffect, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

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
      <path d="M3 9.5L10 3l7 6.5V18a1 1 0 0 1-1 1h-4v-4H8v4H4a1 1 0 0 1-1-1V9.5z" strokeWidth="1.5" stroke="currentColor" fill="none" />
    ),
  },
  {
    label: "Lançamentos",
    to: "/entries",
    icon: (
      <path d="M4 6h12v3h3M6 17H5a1 1 0 0 1-1-1V5v-1h12v12a1 1 0 0 1-1 1h-1" strokeWidth="1.5" stroke="currentColor" fill="none" />
    ),
  },
  {
    label: "Cartões",
    to: "/cards",
    icon: (
      <path d="M4 7h12v6H4zM4 10h12M7 16h3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" fill="none" />
    ),
  },
  {
    label: "Planejamento",
    to: "/planning",
    icon: (
      <path d="M5 7h10v10H5zM12 7v10M8 7v4" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
    ),
  },
];

const tabBarStyle: CSSProperties & { "--tabbar-height": string } = {
  height: "var(--tabbar-height, 64px)",
  "--tabbar-height": "64px",
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
};

const BottomTabBar = () => {
  const location = useLocation();
  const assistantActive = useMemo(() => location.pathname.startsWith("/assistant"), [location]);

  // A MÁGICA: Este evento avisa o AssistantWidget para se abrir!
  const handleOpenAssistantModal = () => {
    window.dispatchEvent(new Event('OPEN_GLOBAL_ASSISTANT'));
  };

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;
    const html = document.documentElement;
    const mq = window.matchMedia("(max-width: 767px)");
    const setHeight = () => {
      const value = mq.matches ? "64px" : "0px";
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
          "flex-1 flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[10px] font-semibold transition-all duration-300",
          isActive
            ? "text-[var(--primary)]"
            : "text-slate-500 dark:text-slate-400 hover:text-[var(--primary)]",
        ].join(" ")
      }
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 mb-1" aria-hidden="true">
        {tab.icon}
      </svg>
      <span>{tab.label}</span>
    </NavLink>
  );

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-[70] overflow-visible border-t border-slate-200 bg-white/90 backdrop-blur-md shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:border-white/5 dark:bg-slate-950/90 md:hidden"
      style={tabBarStyle}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-2 h-full">
        <div className="flex flex-1 items-center justify-around h-full">{tabs.slice(0, 2).map(renderTab)}</div>
        
        <div className="relative flex h-full items-center justify-center w-16">
          <button
            type="button"
            onClick={handleOpenAssistantModal}
            aria-label="Abrir assistente"
            className={[
              "absolute -top-6 flex h-14 w-14 items-center justify-center rounded-[20px] border-4 border-white bg-[#25D366] text-white shadow-[0_10px_20px_rgba(37,211,102,0.3)] transition-all duration-300 focus-visible:outline-none dark:border-slate-950",
              assistantActive ? "ring-2 ring-[#25D366]/40" : "",
              !assistantActive ? "hover:-translate-y-1 active:scale-90" : "",
            ].filter(Boolean).join(" ")}
          >
             {/* Ícone customizado de Chat/Magia para a IA */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              <path d="M9.75 9.75 12 12l2.25-2.25"/>
              <path d="m9.75 14.25 2.25-2.25 2.25 2.25"/>
            </svg>
          </button>
        </div>

        <div className="flex flex-1 items-center justify-around h-full">
          {tabs.slice(2).map(renderTab)}
        </div>
      </div>
    </nav>
  );
};

export default BottomTabBar;
