"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { href: "/", label: "Team Status", icon: "📊" },
  { href: "/activity", label: "Activity", icon: "📡" },
  { href: "/kanban", label: "Kanban", icon: "📋" },
  { href: "/org", label: "Org Chart", icon: "🌳" },
  { href: "/editor", label: "Editor", icon: "📝" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header
      style={{
        borderBottom: "1px solid #1a1a1a",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        background: "#0a0a0a",
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 0",
            marginRight: "8px",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "18px" }}>🛰️</span>
          <span
            className="tab-label"
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#ededed",
              letterSpacing: "-0.02em",
            }}
          >
            Mission Control
          </span>
        </div>

        {/* Tabs */}
        <nav style={{ display: "flex", gap: "2px", flex: 1 }}>
          {TABS.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                title={tab.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "12px 14px",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#ededed" : "#666",
                  textDecoration: "none",
                  borderBottom: isActive
                    ? "2px solid #00c691"
                    : "2px solid transparent",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: "16px" }}>{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
