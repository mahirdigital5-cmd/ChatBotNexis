"use client";

import { useState } from "react";

export default function Home() {
  const [triggers, setTriggers] = useState([
    {
      keyword: "mau cod",
      response: "Baik kak, kirimannya kemana?",
      type: "Mengandung",
      active: true,
    },
    {
      keyword: "cek harga lampu",
      response: "Harga lampu 13 ribu",
      type: "Sama Persis",
      active: true,
    },
  ]);

  const [keyword, setKeyword] = useState("");
  const [response, setResponse] = useState("");
  const [type, setType] = useState("Mengandung");
  const [showForm, setShowForm] = useState(false);

  function addTrigger() {
    if (!keyword || !response) {
      alert("Kata kunci dan respon wajib diisi");
      return;
    }

    setTriggers([
      ...triggers,
      {
        keyword,
        response,
        type,
        active: true,
      },
    ]);

    setKeyword("");
    setResponse("");
    setType("Mengandung");
    setShowForm(false);
  }

  function toggleStatus(index) {
    const updated = [...triggers];
    updated[index].active = !updated[index].active;
    setTriggers(updated);
  }

  function deleteTrigger(index) {
    const updated = triggers.filter((_, i) => i !== index);
    setTriggers(updated);
  }

  return (
    <main
      style={{
        padding: 40,
        fontFamily: "Arial",
        background: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <h1>WA Auto Reply Trigger</h1>

      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          background: "#00a884",
          color: "white",
          border: "none",
          padding: "12px 18px",
          borderRadius: 8,
          fontWeight: "bold",
          marginTop: 10,
          cursor: "pointer",
        }}
      >
        + Tambah Trigger
      </button>

      {showForm && (
        <div
          style={{
            marginTop: 20,
            background: "white",
            padding: 20,
            borderRadius: 10,
          }}
        >
          <h3>Tambah Trigger Baru</h3>

          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Kata kunci"
            style={{ padding: 12, marginRight: 10, marginBottom: 10 }}
          />

          <input
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Respon otomatis"
            style={{ padding: 12, marginRight: 10, marginBottom: 10 }}
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ padding: 12, marginRight: 10, marginBottom: 10 }}
          >
            <option>Mengandung</option>
            <option>Sama Persis</option>
          </select>

          <button
            onClick={addTrigger}
            style={{
              background: "#00a884",
              color: "white",
              border: "none",
              padding: "12px 18px",
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Simpan
          </button>
        </div>
      )}

      <div
        style={{
          marginTop: 30,
          background: "white",
          borderRadius: 10,
          padding: 20,
        }}
      >
        <table width="100%" cellPadding="15">
          <thead>
            <tr>
              <th align="left">Kata Kunci</th>
              <th align="left">Respon</th>
              <th align="left">Trigger</th>
              <th align="left">Status</th>
              <th align="left">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {triggers.map((item, index) => (
              <tr key={index}>
                <td>{item.keyword}</td>
                <td>{item.response}</td>
                <td>{item.type}</td>
                <td>{item.active ? "🟢 Aktif" : "🔴 Nonaktif"}</td>
                <td>
                  <button
                    onClick={() => toggleStatus(index)}
                    style={{ marginRight: 8, cursor: "pointer" }}
                  >
                    {item.active ? "Matikan" : "Aktifkan"}
                  </button>

                  <button
                    onClick={() => deleteTrigger(index)}
                    style={{
                      background: "red",
                      color: "white",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 5,
                      cursor: "pointer",
                    }}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
