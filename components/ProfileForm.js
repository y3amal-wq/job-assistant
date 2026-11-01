"use client";

import { useState } from "react";
import { FIELDS, completeness } from "../lib/profileFields";
import { supabase } from "../lib/supabase";

export default function ProfileForm({ userId, data, onSaved }) {
  const [form, setForm] = useState(data || {});
  const [saved, setSaved] = useState("");
  const pct = completeness(form);

  async function save() {
    setSaved("جارٍ الحفظ…");
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      data: form,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setSaved("تعذّر الحفظ: " + error.message);
    } else {
      onSaved(form);
      setSaved("تم الحفظ ✓");
    }
  }

  return (
    <section className="panel">
      <h2>ملفي المهني</h2>
      <div className="bar">
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="muted">اكتمال الملف: {pct}%. كلما اكتمل، كان المساعد أدق.</p>
      {FIELDS.map((f) => (
        <label key={f.key} className="field">
          <span>{f.label}</span>
          {f.long ? (
            <textarea
              rows={3}
              value={form[f.key] || ""}
              placeholder={f.placeholder}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          ) : (
            <input
              value={form[f.key] || ""}
              placeholder={f.placeholder}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          )}
        </label>
      ))}
      <div className="actions">
        <button className="primary" onClick={save}>
          حفظ
        </button>
        <span className="muted">{saved}</span>
      </div>
    </section>
  );
}
