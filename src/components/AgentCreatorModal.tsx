"use client";

import { useState } from "react";

const SOUL_TEMPLATE = `# SOUL.md — {name}

## Identidad
Soy {name}, agente del universo Bottico.

## Rol
{role}

## Principios
1. Hacer bien mi trabajo específico
2. Reportar a mi manager cuando termine
3. Pedir ayuda si estoy bloqueado
4. Documentar lo que hago
`;

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function AgentCreatorModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    id: "",
    name: "",
    emoji: "🤖",
    role: "",
    model: "claude-sonnet-4-6",
    botToken: "",
    manager: "K",
    soul: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const soulContent = form.soul || SOUL_TEMPLATE.replace(/\{name\}/g, form.name || "Agent").replace(/\{role\}/g, form.role || "General");

  const handleSubmit = async () => {
    if (!form.id || !form.name) {
      setError("ID y nombre son requeridos");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.id)) {
      setError("ID solo acepta letras minúsculas, números y guiones");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, soul: soulContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error creating agent");
        return;
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "#0a0a0a",
    border: "1px solid #222",
    borderRadius: "6px",
    padding: "8px 10px",
    color: "#ccc",
    fontSize: "13px",
    fontFamily: "inherit",
  };

  const labelStyle = { fontSize: "11px", color: "#888", marginBottom: "4px", display: "block" as const };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#111",
          border: "1px solid #1f1f1f",
          borderRadius: "12px",
          padding: "24px",
          width: "500px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#ededed", margin: "0 0 20px 0" }}>
          + Crear Nuevo Agente
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Agent ID</label>
              <input
                placeholder="qa-bot"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Nombre</label>
              <input
                placeholder="QA Bot"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Emoji</label>
              <input
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                style={{ ...inputStyle, textAlign: "center", fontSize: "20px" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Rol / descripción</label>
              <input
                placeholder="Testing y QA"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Modelo</label>
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                style={inputStyle}
              >
                <option value="claude-sonnet-4-6">Claude Sonnet 4</option>
                <option value="claude-opus-4-6">Claude Opus 4</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Manager</label>
              <select
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
                style={inputStyle}
              >
                <option value="K">K (👽)</option>
                <option value="Vera">Vera (⚡)</option>
                <option value="Arq">Arq (🏗️)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Bot Token de Telegram (opcional)</label>
            <input
              type="password"
              placeholder="123456:ABC..."
              value={form.botToken}
              onChange={(e) => setForm({ ...form, botToken: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>SOUL.md inicial</label>
            <textarea
              value={soulContent}
              onChange={(e) => setForm({ ...form, soul: e.target.value })}
              style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
            />
          </div>
        </div>

        {error && (
          <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "12px" }}>⚠️ {error}</div>
        )}

        <div style={{ display: "flex", gap: "8px", marginTop: "20px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "8px 16px", color: "#888", fontSize: "13px", cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ background: "#1a3a2a", border: "1px solid #2a5a3a", borderRadius: "6px", padding: "8px 16px", color: "#00c691", fontSize: "13px", cursor: "pointer", fontWeight: 600, opacity: saving ? 0.5 : 1 }}
          >
            {saving ? "Creando…" : "🚀 Crear Agente"}
          </button>
        </div>
      </div>
    </div>
  );
}
