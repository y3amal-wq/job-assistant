"use client";

import { useEffect, useState } from "react";
import { STATUSES, completeness } from "../lib/profileFields";
import { supabase } from "../lib/supabase";

export default function Dashboard({ userId, profileData }) {
  const [apps, setApps] = useState([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setApps(data || []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const { error } = await supabase.from("applications").insert({
      user_id: userId,
      title: title.trim(),
      company: company.trim() || null,
    });
    if (error) return setError(error.message);
    setTitle("");
    setCompany("");
    refresh();
  }

  async function setStatus(id, status) {
    await supabase.from("applications").update({ status }).eq("id", id);
    setApps((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  async function remove(id) {
    if (!confirm("حذف هذا العرض؟")) return;
    await supabase.from("applications").delete().eq("id", id);
    setApps((list) => list.filter((a) => a.id !== id));
  }

  const count = (...s) => apps.filter((a) => s.includes(a.status)).length;
  const stats = [
    ["عروض محفوظة", apps.length],
    ["عروض مناسبة", count("suitable")],
    ["ترشيحات مرسلة", count("applied", "interview", "offer", "rejected")],
    ["مقابلات", count("interview", "offer")],
    ["قيد المتابعة", count("applied", "interview")],
    ["اكتمال الملف", completeness(profileData) + "%"],
  ];

  return (
    <section className="panel">
      <h2>لوحة القيادة</h2>
      <div className="stats">
        {stats.map(([label, value]) => (
          <div key={label} className="stat">
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <form className="addrow" onSubmit={add}>
        <input
          placeholder="عنوان الوظيفة"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="الشركة (اختياري)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <button className="primary">إضافة</button>
      </form>
      {error && <div className="error">{error}</div>}

      <ul className="apps">
        {apps.length === 0 && <li className="muted">لم تضف أي عرض بعد.</li>}
        {apps.map((a) => (
          <li key={a.id}>
            <div>
              <b>{a.title}</b>
              {a.company && <span className="muted"> — {a.company}</span>}
            </div>
            <div className="row">
              <select
                value={a.status}
                onChange={(e) => setStatus(a.id, e.target.value)}
              >
                {Object.entries(STATUSES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <button className="ghost" onClick={() => remove(a.id)}>
                حذف
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
