"use client";

import dynamic from "next/dynamic";
import Shell from "@/components/Shell";

const OfficeCanvas = dynamic(() => import("@/components/OfficeCanvas"), {
  ssr: false,
  loading: () => (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      color: "var(--text-muted, #555)",
      fontSize: "13px",
      fontFamily: "monospace",
    }}>
      Cargando oficina...
    </div>
  ),
});

export default function OfficePage() {
  return (
    <Shell>
      <h2 style={{
        fontSize: "13px",
        fontWeight: 600,
        color: "var(--text-muted, #555)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "0 0 12px 0",
      }}>
        La Oficina
      </h2>

      <div style={{
        height: "calc(100vh - 130px)",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid var(--border, #1f1f1f)",
        background: "#0d0d0d",
      }}>
        <OfficeCanvas />
      </div>
    </Shell>
  );
}
