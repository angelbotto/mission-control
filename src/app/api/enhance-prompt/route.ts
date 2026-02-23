import { NextRequest, NextResponse } from "next/server";

const OPENAI_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text || !OPENAI_KEY) return NextResponse.json({ enhanced: text });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Eres un experto en escribir instrucciones claras para agentes de IA. Toma la descripción del usuario y mejórala: hazla más específica, con criterios de aceptación claros, y formato accionable. Responde SOLO con el texto mejorado, en español.",
          },
          { role: "user", content: text },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return NextResponse.json({ enhanced: text });
    const data = await res.json();
    return NextResponse.json({
      enhanced: data.choices[0].message.content,
    });
  } catch {
    return NextResponse.json({ enhanced: text });
  }
}
