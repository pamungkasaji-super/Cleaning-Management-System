import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutList, BarChart3, Repeat, Settings } from "lucide-react";

const DASHBOARD = {
  root: "/dashboard",
  label: "Dashboard",
  icon: LayoutList,
  matches: ["/dashboard", "/task/", "/settings"],
};
const PERIODIK = { root: "/periodik", label: "Periodik", icon: Repeat, matches: ["/periodik"] };
const MONITORING = { root: "/monitoring", label: "Monitoring", icon: BarChart3, matches: ["/monitoring"] };
const PENGATURAN = { root: "/settings", label: "Pengaturan", icon: Settings, matches: ["/settings"] };

// Tab per role: user = petugas, admin = semua, monitoring = hanya melihat laporan
const tabsFor = (role) => {
  if (role === "admin") return [DASHBOARD, PERIODIK, MONITORING];
  if (role === "monitoring") return [MONITORING, PENGATURAN];
  return [DASHBOARD, PERIODIK];
};

export default function BottomTabBar({ role }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tabs = tabsFor(role);

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="max-w-3xl mx-auto grid"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
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
