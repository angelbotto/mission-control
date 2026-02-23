"use client";

import { useState, useEffect } from "react";

const ROLE_OPTIONS = [
  { value: "infra", label: "Infraestructura", emoji: "🖥️", model: "claude-sonnet-4-6" },
  { value: "coder", label: "Código", emoji: "🏗️", model: "claude-opus-4-6" },
  { value: "content", label: "Contenido", emoji: "✒️", model: "claude-opus-4-6" },
  { value: "research", label: "Investigación", emoji: "🔬", model: "claude-opus-4-6" },
  { value: "finance", label: "Finanzas", emoji: "💰", model: "claude-sonnet-4-6" },
  { value: "design", label: "Diseño", emoji: "🎨", model: "claude-sonnet-4-6" },
  { value: "assistant", label: "Asistente", emoji: "⚡", model: "claude-sonnet-4-6" },
  { value: "other", label: "Otro", emoji: "🤖", model: "claude-sonnet-4-6" },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function AgentCreatorModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("other");
  const [description, setDescription] = useState("");
  const [botToken, setBotToken] = useState("");
  const [soul, setSoul] = useState("");
  const [generatingSoul, setGeneratingSoul] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === role) || ROLE_OPTIONS[7];
  const id = slugify(name);
  const emoji = selectedRole.emoji;
  const model = selectedRole.model;

  const generateSoul = async () => {
    if (!name.trim()) return;
    setGeneratingSoul(true);
    try {
      const res = await fetch("/api/generate-soul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role: selectedRole.label, description }),
      });
      if (res.ok) {
        const data = await res.json();
        setSoul(data.soul);
      }
    } finally {
      setGeneratingSoul(false);
    }
  };

  // Auto-generate soul template when name changes
  useEffect(() => {
    if (!soul && name.trim()) {
      setSoul(`# SOUL.md — ${name} ${emoji}\n\n## Esencia\nSoy ${name}, agente del universo Bottico.\n\n## Rol\n${selectedRole.label}: ${description || "pendiente"}\n\n## Reglas\n1. Hacer bien mi trabajo específico\n2. Reportar cuando termine\n3. Pedir ayuda si estoy bloqueado`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, role]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Nombre es requerido"); return; }
    if (!id) { setError("No se pudo generar ID"); return; }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          emoji,
          role: selectedRole.label,
          model,
          botToken,
          manager: "K",
          soul: soul || `# ${name}\n\n${description}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error"); return; }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = { width: "100%", background: "#0a0a0a", border: "1px solid #222", borderRadius: 6, padding: "8px 10px", color: "#ccc", fontSize: 13, fontFamily: "inherit", outline: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 12, padding: 24, width: 500, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#ededed", margin: "0 0 20px 0" }}>+ Crear Nuevo Agente</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "block" }}>Nombre del agente</label>
            <input placeholder="Nexo Dev" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoFocus />
            {id && <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>ID: <code>{id}</code> · {emoji} · {model.replace("claude-", "")}</div>}
          </div>

          {/* Role dropdown */}
          <div>
            <label style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "block" }}>Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "block" }}>Descripción libre</label>
            <textarea placeholder="Qué hace este agente, cuál es su expertise..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {/* Bot Token */}
          <div>
            <label style={{ fontSize: 11, color: "#888", marginBottom: 4, display: "block" }}>Bot Token de Telegram (opcional)</label>
            <input type="password" placeholder="123456:ABC..." value={botToken} onChange={(e) => setBotToken(e.target.value)} style={inputStyle} />
          </div>

          {/* SOUL */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: "#888" }}>SOUL.md</label>
              <button onClick={generateSoul} disabled={generatingSoul || !name.trim()}
                style={{ background: "none", border: "1px solid #2a2a3a", borderRadius: 4, padding: "2px 8px", color: generatingSoul ? "#555" : "#7c8aff", fontSize: 11, cursor: generatingSoul ? "default" : "pointer", fontFamily: "inherit" }}>
                {generatingSoul ? "⏳ Generando..." : "✨ Generar SOUL con IA"}
              </button>
            </div>
            <textarea value={soul} onChange={(e) => setSoul(e.target.value)} style={{ ...inputStyle, minHeight: 120, resize: "vertical", fontFamily: "var(--font-geist-mono)", fontSize: 11 }} />
          </div>
        </div>

        {error && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 12 }}>⚠️ {error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 16px", color: "#888", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ background: "#1a3a2a", border: "1px solid #2a5a3a", borderRadius: 6, padding: "8px 16px", color: "#00c691", fontSize: 13, cursor: "pointer", fontWeight: 600, opacity: saving ? 0.5 : 1 }}>
            {saving ? "Creando…" : "🚀 Crear Agente"}
          </button>
        </div>
      </div>
    </div>
  );
}
