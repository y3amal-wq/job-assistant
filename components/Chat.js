"use client";

import { useEffect, useRef, useState } from "react";
import { MODES } from "../lib/prompts";
import { supabase } from "../lib/supabase";

export default function Chat({ session, profileSummary }) {
  const userId = session.user.id;
  const [mode, setMode] = useState("diagnostic");
  const [chats, setChats] = useState({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    supabase
      .from("chats")
      .select("mode, messages")
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((r) => (map[r.mode] = r.messages));
        setChats(map);
      });
  }, []);

  const messages = chats[mode] || [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading, mode]);

  async function persist(m, msgs) {
    await supabase.from("chats").upsert({
      user_id: userId,
      mode: m,
      messages: msgs,
      updated_at: new Date().toISOString(),
    });
  }

  async function send(text) {
    const content = text.trim();
    if (!content || loading) return;
    setError("");
    const next = [...messages, { role: "user", content }];
    setChats((c) => ({ ...c, [mode]: next }));
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ mode, messages: next, profile: profileSummary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "حدث خطأ.");
      const done = [...next, { role: "assistant", content: data.reply }];
      setChats((c) => ({ ...c, [mode]: done }));
      persist(mode, done);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    if (confirm("هل تريد مسح هذه المحادثة؟")) {
      setChats((c) => ({ ...c, [mode]: [] }));
      persist(mode, []);
      setError("");
    }
  }

  const current = MODES[mode];

  return (
    <>
      <nav className="tabs sub">
        {Object.entries(MODES).map(([key, m]) => (
          <button
            key={key}
            className={key === mode ? "tab active" : "tab"}
            onClick={() => {
              setMode(key);
              setError("");
            }}
          >
            <span>{m.icon}</span> {m.label}
          </button>
        ))}
      </nav>

      <main className="chat">
        {messages.length === 0 && (
          <div className="empty">
            <div className="big">{current.icon}</div>
            <h2>{current.label}</h2>
            <p>{current.hint}</p>
            <button className="primary" onClick={() => send(current.start)}>
              ابدأ الآن
            </button>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "msg user" : "msg bot"}>
            {m.content}
          </div>
        ))}
        {loading && <div className="msg bot typing">يكتب…</div>}
        {error && <div className="error">⚠️ {error}</div>}
        <div ref={endRef} />
      </main>

      <footer className="composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="اكتب رسالتك…"
          rows={2}
        />
        <div className="actions">
          <button
            className="primary"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
          >
            إرسال
          </button>
          {messages.length > 0 && (
            <button className="ghost" onClick={resetChat}>
              مسح
            </button>
          )}
        </div>
      </footer>
    </>
  );
}
