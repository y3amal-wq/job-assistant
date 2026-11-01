"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    const { data, error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setMsg(error.message);
    } else if (isSignUp && !data.session) {
      setMsg("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده ثم سجّل الدخول.");
    }
  }

  return (
    <div className="auth">
      <h1>مساعدي المهني</h1>
      <p>سجّل الدخول لحفظ ملفك ومحادثاتك وتتبع ترشيحاتك</p>
      <form onSubmit={submit}>
        <input
          type="email"
          required
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="كلمة المرور (6 أحرف على الأقل)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          dir="ltr"
        />
        <button className="primary" disabled={busy}>
          {isSignUp ? "إنشاء حساب" : "دخول"}
        </button>
      </form>
      {msg && <div className="error">{msg}</div>}
      <button className="link" onClick={() => setIsSignUp((v) => !v)}>
        {isSignUp ? "لدي حساب، تسجيل الدخول" : "ليس لدي حساب، إنشاء حساب"}
      </button>
    </div>
  );
}
