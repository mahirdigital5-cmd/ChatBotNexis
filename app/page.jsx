"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    setLoading(true);
    setReply("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    setReply(data.reply);
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 600, margin: "40px auto", fontFamily: "Arial" }}>
      <h1>ChatBotNexis 🤖</h1>
      <p>Bot AI dropship multi-produk.</p>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Contoh: kak produk 1 ada?"
        style={{ width: "100%", height: 120, padding: 12 }}
      />

      <br />

      <button
        onClick={sendMessage}
        disabled={loading}
        style={{ marginTop: 12, padding: "10px 18px" }}
      >
        {loading ? "Membalas..." : "Kirim"}
      </button>

      <div style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>
        {reply}
      </div>
    </main>
  );
}
