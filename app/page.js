"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { summarize } from "../lib/profileFields";
import AuthForm from "../components/AuthForm";
import Chat from "../components/Chat";
import Dashboard from "../components/Dashboard";
import ProfileForm from "../components/ProfileForm";
import Jobs from "../components/Jobs";
import Admin from "../components/Admin";

const VIEWS = [
  ["chat", "💬 المساعد"],
  ["jobs", "💼 الوظائف"],
  ["dashboard", "📊 لوحة القيادة"],
  ["profile", "👤 ملفي"],
];

export default function Home() {
  const [session, setSession] = useState(undefined);
  const [view, setView] = useState("chat");
  const [profileData, setProfileData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfileData(null);
      return;
    }
    supabase
      .from("profiles")
      .select("data")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfileData(data?.data || {}));
    supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session?.user?.id]);

  if (!supabase) {
    return (
      <div className="app">
        <div className="error" style={{ marginTop: 40 }}>
          متغيرات Supabase غير مضبوطة. أضف NEXT_PUBLIC_SUPABASE_URL و
          NEXT_PUBLIC_SUPABASE_ANON_KEY (راجع README).
        </div>
      </div>
    );
  }

  if (session === undefined) return <div className="app muted">…</div>;
  if (!session)
    return (
      <div className="app">
        <AuthForm />
      </div>
    );

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>مساعدي المهني</h1>
          <p dir="ltr" style={{ textAlign: "right" }}>
            {session.user.email}
          </p>
        </div>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>
          خروج
        </button>
      </header>

      <nav className="tabs">
        {[...VIEWS, ...(isAdmin ? [["admin", "🛠️ الإدارة"]] : [])].map(([key, label]) => (
          <button
            key={key}
            className={key === view ? "tab active" : "tab"}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {profileData === null ? (
        <div className="muted">جارٍ التحميل…</div>
      ) : view === "chat" ? (
        <Chat session={session} profileSummary={summarize(profileData)} />
      ) : view === "jobs" ? (
        <Jobs session={session} profileSummary={summarize(profileData)} />
      ) : view === "admin" && isAdmin ? (
        <Admin userId={session.user.id} />
      ) : view === "dashboard" ? (
        <Dashboard userId={session.user.id} profileData={profileData} />
      ) : (
        <ProfileForm
          userId={session.user.id}
          data={profileData}
          onSaved={setProfileData}
        />
      )}
    </div>
  );
}
