"use client";

import Navbar from "./Navbar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar />
      <main className="page">
        {children}
      </main>
    </div>
  );
}
