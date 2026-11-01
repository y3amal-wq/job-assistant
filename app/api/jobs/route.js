import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const TTL_MS = 12 * 60 * 60 * 1000; // نتائج البحث تُحفظ 12 ساعة لتوفير الحصة

function stripHtml(s = "") {
  return String(s).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export async function POST(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) {
    return Response.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: auth } = await sb.auth.getUser(token);
  if (!auth?.user) {
    return Response.json({ error: "انتهت الجلسة، سجّل الدخول من جديد." }, { status: 401 });
  }

  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "البحث الخارجي غير مفعّل: أضف JOOBLE_API_KEY في الإعدادات." },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const keywords = String(body.keywords || "").trim().slice(0, 100);
  const location = String(body.location || "").trim().slice(0, 60) || "Maroc";
  const page = Math.min(Math.max(parseInt(body.page) || 1, 1), 5);
  if (!keywords) {
    return Response.json({ error: "اكتب كلمة بحث (مسمى وظيفي)." }, { status: 400 });
  }

  const cacheKey = [keywords.toLowerCase(), location.toLowerCase(), page].join("|");
  const { data: cached } = await sb
    .from("search_cache")
    .select("results, fetched_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < TTL_MS) {
    return Response.json({ jobs: cached.results, cached: true });
  }

  try {
    const res = await fetch(`https://jooble.org/api/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, location, page, ResultOnPage: 20 }),
    });
    if (!res.ok) {
      return Response.json(
        { error: `تعذّر جلب الوظائف (رمز ${res.status}). تحقق من مفتاح Jooble.` },
        { status: 502 }
      );
    }
    const data = await res.json();
    const jobs = (data.jobs || []).map((j) => ({
      key: `jooble:${j.id}`,
      external: true,
      title: stripHtml(j.title),
      company: stripHtml(j.company),
      city: stripHtml(j.location),
      snippet: stripHtml(j.snippet).slice(0, 300),
      type: j.type || "",
      salary: j.salary || "",
      link: j.link,
      source: j.source || "Jooble",
      updated: j.updated,
    }));

    await sb
      .from("search_cache")
      .upsert({ cache_key: cacheKey, results: jobs, fetched_at: new Date().toISOString() });

    return Response.json({ jobs, cached: false });
  } catch {
    return Response.json({ error: "خطأ في الشبكة، أعد المحاولة." }, { status: 502 });
  }
}
