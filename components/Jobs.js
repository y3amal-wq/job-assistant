"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { JOB_TYPES } from "../lib/profileFields";

function normalizeInternal(j) {
  return {
    key: `job:${j.id}`,
    external: false,
    id: j.id,
    title: j.title,
    company: j.company,
    city: j.city || "",
    type: j.job_type,
    level: j.level || "",
    snippet: j.description || "",
    created_at: j.created_at,
  };
}

function matchesText(job, keywords) {
  const tokens = keywords.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = `${job.title} ${job.company} ${job.snippet}`.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

function matchesType(job, type) {
  if (!type) return true;
  if (!job.external) return job.type === type;
  const t = `${job.type} ${job.title} ${job.snippet}`.toLowerCase();
  const rules = {
    full_time: /full|temps plein|كامل/,
    part_time: /part|temps partiel|جزئي/,
    contract: /contract|temporary|cdd|عقد/,
    internship: /intern|stage|تدريب/,
    remote: /remote|télétravail|teletravail|عن بعد/,
  };
  return rules[type]?.test(t) ?? true;
}

export default function Jobs({ session, profileSummary }) {
  const userId = session.user.id;
  const [sub, setSub] = useState("search");
  const [filters, setFilters] = useState({ keywords: "", city: "", type: "", level: "" });
  const [internal, setInternal] = useState([]);
  const [external, setExternal] = useState(null);
  const [extLoading, setExtLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState({});
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [alerts, setAlerts] = useState([]);
  const [applying, setApplying] = useState(null);
  const [message, setMessage] = useState("");

  async function loadAll() {
    const [j, s, a, al] = await Promise.all([
      supabase.from("jobs").select("*").eq("active", true).order("created_at", { ascending: false }).limit(200),
      supabase.from("saved_jobs").select("job_key, job").order("created_at", { ascending: false }),
      supabase.from("job_applications").select("job_id").eq("user_id", userId),
      supabase.from("job_alerts").select("*").order("created_at", { ascending: false }),
    ]);
    setInternal((j.data || []).map(normalizeInternal));
    const map = {};
    (s.data || []).forEach((r) => (map[r.job_key] = r.job));
    setSaved(map);
    setAppliedIds(new Set((a.data || []).map((r) => r.job_id)));
    setAlerts(al.data || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredInternal = useMemo(
    () =>
      internal.filter(
        (j) =>
          matchesText(j, filters.keywords) &&
          (!filters.city || j.city.toLowerCase().includes(filters.city.toLowerCase())) &&
          (!filters.level || j.level.toLowerCase().includes(filters.level.toLowerCase())) &&
          matchesType(j, filters.type)
      ),
    [internal, filters]
  );

  const filteredExternal = (external || []).filter((j) => matchesType(j, filters.type));

  async function searchExternal() {
    setNotice("");
    if (!filters.keywords.trim()) return setNotice("اكتب مسمى وظيفي أولاً.");
    setExtLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ keywords: filters.keywords, location: filters.city }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ.");
      setExternal(data.jobs);
      if (data.jobs.length === 0) setNotice("لا نتائج خارجية لهذا البحث.");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setExtLoading(false);
    }
  }

  async function toggleSave(job) {
    if (saved[job.key]) {
      await supabase.from("saved_jobs").delete().eq("job_key", job.key);
      setSaved((s) => {
        const n = { ...s };
        delete n[job.key];
        return n;
      });
    } else {
      await supabase.from("saved_jobs").upsert({ user_id: userId, job_key: job.key, job });
      setSaved((s) => ({ ...s, [job.key]: job }));
    }
  }

  async function track(job, status = "found") {
    const { error } = await supabase.from("applications").insert({
      user_id: userId,
      title: job.title,
      company: job.company || null,
      status,
      notes: job.link || null,
    });
    setNotice(error ? error.message : "أُضيفت إلى لوحة القيادة ✓");
  }

  async function quickApply(job) {
    const { error } = await supabase.from("job_applications").insert({
      job_id: job.id,
      user_id: userId,
      applicant_email: session.user.email,
      profile_summary: profileSummary,
      message: message.trim() || null,
    });
    if (error) return setNotice("تعذّر التقديم: " + error.message);
    setAppliedIds((s) => new Set(s).add(job.id));
    setApplying(null);
    setMessage("");
    track(job, "applied");
    setNotice("تم إرسال ترشحك ✓");
  }

  async function addAlert() {
    if (!filters.keywords.trim() && !filters.city.trim()) {
      return setNotice("اكتب كلمة بحث أو مدينة لإنشاء التنبيه.");
    }
    const { error } = await supabase.from("job_alerts").insert({
      user_id: userId,
      keywords: filters.keywords.trim() || null,
      city: filters.city.trim() || null,
    });
    if (error) return setNotice(error.message);
    setNotice("تم إنشاء التنبيه ✓");
    loadAll();
  }

  async function removeAlert(id) {
    await supabase.from("job_alerts").delete().eq("id", id);
    setAlerts((a) => a.filter((x) => x.id !== id));
  }

  function alertMatches(a) {
    return internal.filter(
      (j) =>
        new Date(j.created_at) > new Date(a.last_checked) &&
        (!a.keywords || matchesText(j, a.keywords)) &&
        (!a.city || j.city.toLowerCase().includes(a.city.toLowerCase()))
    );
  }

  async function markSeen(a) {
    const now = new Date().toISOString();
    await supabase.from("job_alerts").update({ last_checked: now }).eq("id", a.id);
    setAlerts((list) => list.map((x) => (x.id === a.id ? { ...x, last_checked: now } : x)));
  }

  const newCount = alerts.reduce((n, a) => n + alertMatches(a).length, 0);

  function Card({ job }) {
    const isSaved = !!saved[job.key];
    return (
      <li className="job">
        <div>
          <b>{job.title}</b>
          <div className="muted">
            {[job.company, job.city, JOB_TYPES[job.type] || job.type, job.level]
              .filter(Boolean)
              .join(" · ")}
          </div>
          {job.salary && <div className="muted">💰 {job.salary}</div>}
          {job.snippet && <p className="snippet">{job.snippet.slice(0, 220)}</p>}
          {job.external && <div className="muted">المصدر: {job.source}</div>}
        </div>
        <div className="row wrap">
          <button className="ghost" onClick={() => toggleSave(job)}>
            {isSaved ? "❤️ محفوظة" : "🤍 حفظ"}
          </button>
          <button className="ghost" onClick={() => track(job)}>
            ➕ تتبّع
          </button>
          {job.external ? (
            <a className="primary btn" href={job.link} target="_blank" rel="noopener noreferrer">
              فتح الإعلان ↗
            </a>
          ) : appliedIds.has(job.id) ? (
            <span className="muted">✓ تم الترشح</span>
          ) : (
            <button className="primary" onClick={() => setApplying(applying === job.key ? null : job.key)}>
              تقديم سريع
            </button>
          )}
        </div>
        {applying === job.key && (
          <div className="apply">
            {!profileSummary && (
              <div className="error">ملفك المهني فارغ؛ املأه من تبويب «ملفي» ليراه صاحب العمل.</div>
            )}
            <p className="muted">سيصل صاحب العمل ملخص ملفك المهني وبريدك. أضف رسالة قصيرة (اختياري):</p>
            <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
            <button className="primary" onClick={() => quickApply(job)}>
              إرسال الترشح
            </button>
          </div>
        )}
      </li>
    );
  }

  return (
    <section className="panel">
      <nav className="tabs sub">
        {[
          ["search", "🔎 بحث"],
          ["saved", `❤️ المحفوظة (${Object.keys(saved).length})`],
          ["alerts", `🔔 التنبيهات${newCount ? ` (${newCount} جديد)` : ""}`],
        ].map(([k, l]) => (
          <button key={k} className={k === sub ? "tab active" : "tab"} onClick={() => setSub(k)}>
            {l}
          </button>
        ))}
      </nav>

      {notice && <div className="notice">{notice}</div>}

      {sub === "search" && (
        <>
          <div className="filters">
            <input
              placeholder="المسمى الوظيفي أو كلمة مفتاحية"
              value={filters.keywords}
              onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
            />
            <input
              placeholder="المدينة"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
            />
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="">كل أنواع الدوام</option>
              {Object.entries(JOB_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              placeholder="مستوى الخبرة (مثال: مبتدئ)"
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
            />
          </div>
          <div className="row wrap">
            <button className="primary" onClick={searchExternal} disabled={extLoading}>
              {extLoading ? "جارٍ البحث…" : "ابحث في الإنترنت"}
            </button>
            <button className="ghost" onClick={addAlert}>
              🔔 نبّهني بهذا البحث
            </button>
          </div>

          <h3>وظائف المنصة ({filteredInternal.length})</h3>
          <ul className="jobs">
            {filteredInternal.length === 0 && <li className="muted">لا توجد وظائف منشورة تطابق بحثك.</li>}
            {filteredInternal.map((j) => (
              <Card key={j.key} job={j} />
            ))}
          </ul>

          {external && (
            <>
              <h3>من الإنترنت ({filteredExternal.length})</h3>
              <ul className="jobs">
                {filteredExternal.map((j) => (
                  <Card key={j.key} job={j} />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {sub === "saved" && (
        <ul className="jobs">
          {Object.keys(saved).length === 0 && <li className="muted">لم تحفظ أي وظيفة بعد.</li>}
          {Object.values(saved).map((j) => (
            <Card key={j.key} job={j} />
          ))}
        </ul>
      )}

      {sub === "alerts" && (
        <ul className="jobs">
          <li className="muted">
            ينبّهك الموقع إلى وظائف المنصة الجديدة المطابقة لبحثك. لإنشاء تنبيه، اكتب بحثك في تبويب «بحث» ثم اضغط «نبّهني».
          </li>
          {alerts.map((a) => {
            const m = alertMatches(a);
            return (
              <li key={a.id} className="job">
                <b>{[a.keywords, a.city].filter(Boolean).join(" · ")}</b>
                <div className="muted">{m.length ? `${m.length} وظيفة جديدة` : "لا جديد"}</div>
                {m.map((j) => (
                  <Card key={j.key} job={j} />
                ))}
                <div className="row">
                  {m.length > 0 && (
                    <button className="ghost" onClick={() => markSeen(a)}>
                      تم الاطلاع
                    </button>
                  )}
                  <button className="ghost" onClick={() => removeAlert(a.id)}>
                    حذف التنبيه
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
