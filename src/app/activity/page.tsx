"use client";

import { useEffect, useState, useCallback } from "react";
import Shell from "@/components/Shell";

interface ActivityEvent {
  id: string;
  agent: string;
  agentEmoji: string;
  timestamp: string;
  type: string;
  label: string;
  tokensIn?: number;
  tokensOut?: number;
  sessionId: string;
}

const TYPE_ICONS: Record<string, string> = {
  message: "💬",
  tool_call: "🔧",
  model_change: "🔄",
  session_start: "🚀",
  compaction: "🗜️",
  other: "•",
};

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/activity");
      if (res.ok) setEvents(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    const i = setInterval(fetchActivity, 15000);
    return () => clearInterval(i);
  }, [fetchActivity]);

  return (
    <Shell>
      <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px 0" }}>
        Activity Feed
      </h2>
      <p style={{ fontSize: "11px", color: "#333", margin: "0 0 16px 0" }}>{events.length} eventos recientes</p>

      {loading ? (
        <div style={{ textAlign: "center", color: "#555", padding: "60px 0" }}>Cargando…</div>
      ) : (
        <div style={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: "12px", padding: "8px 16px", maxHeight: "calc(100vh - 180px)", overflowY: "auto" }}>
          {events.length === 0 ? (
            <p style={{ color: "#555", fontSize: "13px", padding: "20px 0", textAlign: "center" }}>Sin actividad reciente</p>
          ) : (
            events.map((event) => {
              const ts = new Date(event.timestamp);
              const time = ts.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
              const date = ts.toLocaleDateString("es", { month: "short", day: "numeric" });
              const diffMin = Math.round((Date.now() - ts.getTime()) / 60000);
              const shortTime = diffMin < 60 ? `${diffMin}m` : `${Math.round(diffMin / 60)}h`;
              const icon = TYPE_ICONS[event.type] || "•";
              return (
                <div
                  key={`${event.sessionId}-${event.id}`}
                  style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid #161616" }}
                >
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0 }}>
                    {event.agentEmoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "#00c691" }}>{event.agent}</span>
                      <span style={{ fontSize: "11px", color: "#333" }}>{icon} {event.type}</span>
                      <span className="activity-timestamp-full" style={{ fontSize: "11px", color: "#444", marginLeft: "auto" }}>{date} {time}</span>
                      <span className="activity-timestamp-short" style={{ display: "none", fontSize: "11px", color: "#444", marginLeft: "auto" }}>{shortTime}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#777", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {event.label}
                    </p>
                    {(event.tokensIn || event.tokensOut) && (
                      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                        {event.tokensIn && (
                          <span style={{ fontSize: "10px", color: "#444", background: "#181818", border: "1px solid #222", borderRadius: "3px", padding: "1px 5px", fontFamily: "var(--font-geist-mono)" }}>
                            ↑ {event.tokensIn.toLocaleString()}
                          </span>
                        )}
                        {event.tokensOut && (
                          <span style={{ fontSize: "10px", color: "#444", background: "#181818", border: "1px solid #222", borderRadius: "3px", padding: "1px 5px", fontFamily: "var(--font-geist-mono)" }}>
                            ↓ {event.tokensOut.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </Shell>
  );
}
