"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { JOB_TYPES } from "../lib/profileFields";

const APP_STATUS = {
  new: "جديد",
  reviewed: "تمت المراجعة",
  shortlisted: "مرشّح",
  rejected: "مرفوض",
};

const EMPTY = { title: "", company: "", city: "", job_type: "full_time", level: "", description: "" };

export default function Admin({ userId }) {
  const [form, setForm] = useState(EMPTY);
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState({});
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const [j, a] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("job_applications").select("*").order("created_at", { ascending: false }),
    ]);
    setJobs(j.data || []);
    const grouped = {};
    (a.data || []).forEach((x) => (grouped[x.job_id] = [...(grouped[x.job_id] || []), x]));
    setApps(grouped);
  }

  useEffect(() => {
    load();
  }, []);

  async function publish(e) {
    e.preventDefault();
    const { error } = await supabase.from("jobs").insert({
      ...form,
      city: form.city || null,
      level: form.level || null,
      description: form.description || null,
      created_by: userId,
    });
    if (error) return setMsg(error.message);
    setForm(EMPTY);
    setMsg("تم نشر الوظيفة ✓");
    load();
  }

  async function toggle(job) {
    await supabase.from("jobs").update({ active: !job.active }).eq("id", job.id);
    load();
  }

  async function remove(job) {
    if (!confirm("حذف الوظيفة وكل الترشحات عليها؟")) return;
    await supabase.from("jobs").delete().eq("id", job.id);
    load();
  }

  async function setStatus(id, status) {
    await supabase.from("job_applications").update({ status }).eq("id", id);
    load();
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <section className="panel">
      <h2>لوحة الإدارة</h2>
      <form className="adminform" onSubmit={publish}>
        <input required placeholder="المسمى الوظيفي" value={form.title} onChange={set("title")} />
        <input required placeholder="الشركة" value={form.company} onChange={set("company")} />
        <input placeholder="المدينة" value={form.city} onChange={set("city")} />
        <select value={form.job_type} onChange={set("job_type")}>
          {Object.entries(JOB_TYPES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input placeholder="مستوى الخبرة (مثال: مبتدئ)" value={form.level} onChange={set("level")} />
        <textarea rows={4} placeholder="وصف الوظيفة والشروط" value={form.description} onChange={set("description")} />
        <button className="primary">نشر الوظيفة</button>
      </form>
      {msg && <div className="notice">{msg}</div>}

      <h3>الوظائف المنشورة ({jobs.length})</h3>
      <ul className="jobs">
        {jobs.map((j) => (
          <li key={j.id} className="job">
            <b>{j.title}</b>
            <div className="muted">
              {[j.company, j.city, JOB_TYPES[j.job_type]].filter(Boolean).join(" · ")}
              {!j.active && " · (مخفية)"}
            </div>
            <div className="row wrap">
              <button className="ghost" onClick={() => setOpen(open === j.id ? null : j.id)}>
                المترشحون ({(apps[j.id] || []).length})
              </button>
              <button className="ghost" onClick={() => toggle(j)}>
                {j.active ? "إخفاء" : "إظهار"}
              </button>
              <button className="ghost" onClick={() => remove(j)}>
                حذف
              </button>
            </div>
            {open === j.id && (
              <ul className="jobs">
                {(apps[j.id] || []).length === 0 && <li className="muted">لا ترشحات بعد.</li>}
                {(apps[j.id] || []).map((a) => (
                  <li key={a.id} className="job">
                    <b dir="ltr" style={{ textAlign: "right" }}>
                      {a.applicant_email}
                    </b>
                    {a.message && <p className="snippet">{a.message}</p>}
                    {a.profile_summary && <pre className="summary">{a.profile_summary}</pre>}
                    <select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)}>
                      {Object.entries(APP_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
