import { MODES } from "../../../lib/prompts";

export const maxDuration = 30;

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "مفتاح GEMINI_API_KEY غير مضبوط في إعدادات Vercel." },
      { status: 500 }
    );
  }

  // التحقق من أن الطلب من مستخدم مسجّل في Supabase
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !sbUrl || !sbKey) {
    return Response.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }
  const who = await fetch(`${sbUrl}/auth/v1/user`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${token}` },
  });
  if (!who.ok) {
    return Response.json({ error: "انتهت الجلسة، سجّل الدخول من جديد." }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const mode = MODES[body.mode];
  const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
  if (!mode || messages.length === 0) {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const profile =
    typeof body.profile === "string" ? body.profile.slice(0, 2000) : "";
  const system =
    mode.prompt +
    (profile ? `\n\nمعلومات محفوظة عن المستخدم:\n${profile}` : "");

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content).slice(0, 8000) }],
  }));

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1800 },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return Response.json(
        { error: data?.error?.message || "تعذّر الاتصال بالذكاء الاصطناعي." },
        { status: 502 }
      );
    }
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("");
    return Response.json({ reply: text || "لم أستطع توليد جواب، أعد المحاولة." });
  } catch {
    return Response.json({ error: "خطأ في الشبكة، أعد المحاولة." }, { status: 502 });
  }
}
