import { NextRequest, NextResponse } from "next/server";

const OPENAI_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  const { name, role, description } = await req.json();

  if (!name || !OPENAI_KEY) {
    return NextResponse.json({
      soul: `# SOUL.md — ${name || "Agent"}\n\n## Esencia\nAgente del universo Bottico.\n\n## Rol\n${role || "General"}\n\n## Reglas\n1. Hacer bien mi trabajo\n2. Reportar cuando termine\n3. Pedir ayuda si estoy bloqueado`,
    });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Genera un SOUL.md completo para un agente de IA. Incluye: Esencia (3-4 bullets), Rol Operativo, Cómo Habla, Herramientas, Reglas (3-5). En español colombiano, tono directo. Formato Markdown. Responde SOLO con el markdown.",
          },
          {
            role: "user",
            content: `Nombre: ${name}\nRol: ${role}\nDescripción: ${description}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return NextResponse.json({ soul: data.choices[0].message.content });
  } catch {
    return NextResponse.json({
      soul: `# SOUL.md — ${name}\n\n## Esencia\nSoy ${name}, agente del universo Bottico.\n\n## Rol\n${role || "General"}: ${description || ""}\n\n## Reglas\n1. Hacer bien mi trabajo específico\n2. Reportar a mi manager cuando termine\n3. Pedir ayuda si estoy bloqueado\n4. Documentar lo que hago`,
    });
  }
}
