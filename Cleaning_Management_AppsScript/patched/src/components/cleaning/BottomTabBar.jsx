import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutList, BarChart3, Repeat } from "lucide-react";

const BASE_TABS = [
  {
    root: "/dashboard",
    label: "Dashboard",
    icon: LayoutList,
    matches: ["/dashboard", "/task/", "/settings"],
  },
  { root: "/periodik", label: "Periodik", icon: Repeat, matches: ["/periodik"] },
];

export default function BottomTabBar({ isAdmin }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const tabs = isAdmin
    ? [
        ...BASE_TABS,
        { root: "/monitoring", label: "Monitoring", icon: BarChart3, matches: ["/monitoring"] },
      ]
    : BASE_TABS;

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className={`max-w-3xl mx-auto grid ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
        {tabs.map((tab) => {
          const isActive = tab.matches.some((m) => pathname.startsWith(m));
          const Icon = tab.icon;
          return (
            <button
              key={tab.root}
              onClick={() => {
                if (pathname !== tab.root) navigate(tab.root);
              }}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 h-16 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}