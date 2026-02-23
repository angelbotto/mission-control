"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Shell from "@/components/Shell";

// Dynamic import — CodeMirror no puede correr en SSR
const CodeEditor = dynamic(() => import("@/components/CodeEditor"), { ssr: false });

interface FileEntry {
  agent: string;
  agentLabel: string;
  emoji: string;
  files: string[];
}

const AGENTS_FILES = [
  { agent: "main", label: "K", emoji: "👽" },
  { agent: "assistant", label: "Vera", emoji: "⚡" },
  { agent: "infra", label: "Nexo", emoji: "🖥️" },
  { agent: "content", label: "Pluma", emoji: "✒️" },
  { agent: "coder", label: "Arq", emoji: "🏗️" },
  { agent: "research", label: "Oráculo", emoji: "🔬" },
  { agent: "finance", label: "Vault", emoji: "💰" },
];

const MD_FILES = ["SOUL.md", "USER.md", "HEARTBEAT.md", "TOOLS.md", "AGENTS.md"];

export default function EditorPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isModified = content !== originalContent;

  const loadFile = useCallback(async (agent: string, path: string) => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/files?agent=${agent}&path=${path}`);
      if (res.ok) {
        const data = await res.json();
        setContent(data.content || "");
        setOriginalContent(data.content || "");
        setSelectedAgent(agent);
        setSelectedFile(path);
        // En móvil, cierra el sidebar al seleccionar archivo
        if (window.innerWidth < 768) setSidebarOpen(false);
      } else {
        const data = await res.json();
        setStatus(`Error: ${data.error}`);
        setContent("");
        setOriginalContent("");
      }
    } catch {
      setStatus("Error loading file");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveFile = useCallback(async () => {
    if (!selectedAgent || !selectedFile) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: selectedAgent, path: selectedFile, content }),
      });
      if (res.ok) {
        setOriginalContent(content);
        setStatus("✅ Guardado");
        setTimeout(() => setStatus(null), 2000);
      } else {
        const data = await res.json();
        setStatus(`Error: ${data.error}`);
      }
    } catch {
      setStatus("Error saving");
    } finally {
      setSaving(false);
    }
  }, [selectedAgent, selectedFile, content]);

  // Keyboard shortcut Cmd/Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isModified) saveFile();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isModified, saveFile]);

  return (
    <Shell>
      {/* Mobile: hamburger toggle */}
      <div className="editor-mobile-toolbar" style={{ display: "none", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: "6px",
            padding: "6px 10px",
            color: "#888",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          {sidebarOpen ? "✕" : "☰"} Archivos
        </button>
        {selectedFile && (
          <span style={{ fontSize: "12px", color: "#666" }}>
            {AGENTS_FILES.find((a) => a.agent === selectedAgent)?.emoji} {selectedFile}
            {isModified && <span style={{ color: "#f59e0b", marginLeft: "6px" }}>●</span>}
          </span>
        )}
      </div>

      <div
        className="editor-layout"
        style={{
          display: "grid",
          gridTemplateColumns: sidebarOpen ? "220px 1fr" : "0px 1fr",
          gap: sidebarOpen ? "16px" : "0",
          height: "calc(100vh - 130px)",
          transition: "grid-template-columns 0.2s ease",
        }}
      >
        {/* Sidebar */}
        <div
          className="editor-sidebar"
          style={{
            background: "#111",
            border: "1px solid #1f1f1f",
            borderRadius: "12px",
            padding: "12px",
            overflowY: "auto",
            overflowX: "hidden",
            display: sidebarOpen ? "block" : "none",
          }}
        >
          <h3 style={{ fontSize: "11px", fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px 0" }}>
            Archivos de Agentes
          </h3>
          {AGENTS_FILES.map((a) => (
            <div key={a.agent} style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{a.emoji}</span> {a.label}
              </div>
              {MD_FILES.map((f) => {
                const isActive = selectedAgent === a.agent && selectedFile === f;
                return (
                  <div
                    key={f}
                    onClick={() => loadFile(a.agent, f)}
                    style={{
                      padding: "4px 8px 4px 24px",
                      fontSize: "11px",
                      color: isActive ? "#00c691" : "#666",
                      background: isActive ? "#0a1a15" : "transparent",
                      borderRadius: "4px",
                      cursor: "pointer",
                      marginBottom: "1px",
                    }}
                  >
                    📄 {f}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Editor panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0", background: "#111", border: "1px solid #1f1f1f", borderRadius: "12px", overflow: "hidden", minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
            <span style={{ fontSize: "13px", color: "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedAgent && selectedFile ? (
                <>
                  <span style={{ color: "#555" }}>{AGENTS_FILES.find((a) => a.agent === selectedAgent)?.emoji}</span>
                  {" "}
                  <span style={{ color: "#666" }}>{AGENTS_FILES.find((a) => a.agent === selectedAgent)?.label}</span>
                  {" / "}
                  <span style={{ color: "#ccc" }}>{selectedFile}</span>
                  {isModified && <span style={{ color: "#f59e0b", marginLeft: "8px" }}>● modificado</span>}
                </>
              ) : (
                <span style={{ color: "#444" }}>Selecciona un archivo del sidebar</span>
              )}
            </span>

            {status && (
              <span style={{ fontSize: "11px", color: status.startsWith("✅") ? "#00c691" : "#ef4444", flexShrink: 0 }}>
                {status}
              </span>
            )}

            <button
              onClick={saveFile}
              disabled={!isModified || saving}
              style={{
                background: isModified ? "#1a3a2a" : "#1a1a1a",
                border: `1px solid ${isModified ? "#2a5a3a" : "#222"}`,
                borderRadius: "6px",
                padding: "6px 12px",
                color: isModified ? "#00c691" : "#444",
                fontSize: "12px",
                cursor: isModified ? "pointer" : "default",
                opacity: saving ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              💾 {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>

          {/* Editor area — CodeMirror */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#555" }}>
                Cargando…
              </div>
            ) : selectedFile ? (
              <CodeEditor value={content} onChange={setContent} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#333", fontSize: "14px" }}>
                ← Selecciona un archivo para editar
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
