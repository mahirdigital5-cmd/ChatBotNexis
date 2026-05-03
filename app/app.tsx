"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  async function sendMessage() {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    setReply(data.reply);
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>ChatBotNexis 🤖</h1>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="tanya produk..."
        style={{ width: "100%", height: 100 }}
      />

      <br />

      <button onClick={sendMessage}>Kirim</button>

      <p>{reply}</p>
    </main>
  );
}
