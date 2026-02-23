"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { href: "/", label: "Team Status", icon: "📊" },
  { href: "/activity", label: "Activity", icon: "📡" },
  { href: "/kanban", label: "Kanban", icon: "📋" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/org", label: "Org Chart", icon: "🌳" },
  { href: "/office", label: "Oficina", icon: "🏢" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="navbar">
      <div className="nav-logo">
        <span style={{ fontSize: "18px" }}>🛰️</span>
        <span className="tab-label">Mission Control</span>
      </div>
      <nav className="nav-tabs">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={tab.label}
              className={`nav-tab ${isActive ? "active" : ""}`}
            >
              <span style={{ fontSize: "16px" }}>{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
