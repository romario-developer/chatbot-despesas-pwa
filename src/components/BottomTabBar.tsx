import { NavLink } from "react-router-dom";

const tabs = [
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
  {
    label: "Mais",
    to: "/more",
    icon: (
      <path d="M6 10h8M6 6h8M6 14h8" strokeWidth="1.5" strokeLinecap="round" />
    ),
  },
];

const BottomTabBar = () => {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-50 flex bg-white border-t border-slate-200 md:hidden"
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }: { isActive: boolean }) =>
              [
                "flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-xs font-semibold transition",
                isActive ? "text-primary" : "text-slate-500 hover:text-primary",
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
        ))}
      </div>
    </nav>
  );
};

export default BottomTabBar;
