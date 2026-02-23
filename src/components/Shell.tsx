"use client";

import Navbar from "./Navbar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#ededed" }}>
      <Navbar />
      <main style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
