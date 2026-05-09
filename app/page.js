"use client";

import { useEffect, useState } from "react";
import supabase from "../lib/supabase";

const WA_ENGINE_URL = "https://wa-engine-production-8ebe.up.railway.app";

export default function Home() {
  const [triggers, setTriggers] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [response, setResponse] = useState("");
  const [type, setType] = useState("Mengandung");
  const [image, setImage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [waStatus, setWaStatus] = useState(null);
  const [qrData, setQrData] = useState(null);

  async function getTriggers() {
    const { data, error } = await supabase
      .from("triggers")
      .select("*")
      .order("id", { ascending: false });

    if (!error) {
      setTriggers(data);
    }
  }

  async function getWaStatus() {
    try {
      const res = await fetch(`${WA_ENGINE_URL}/qr-json?t=${Date.now()}`);
      const data = await res.json();

      setWaStatus(data.connected);
      setQrData(data.qr);
    } catch (err) {
      setWaStatus(false);
      setQrData(null);
    }
  }

  useEffect(() => {
    getTriggers();
    getWaStatus();

    const interval = setInterval(getWaStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  async function uploadImage(file) {
    setUploading(true);

    const reader = new FileReader();

    reader.onloadend = async () => {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: reader.result,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setImage(data.image);
        alert("Gambar berhasil diupload");
      } else {
        alert("Upload gambar gagal");
      }

      setUploading(false);
    };

    reader.readAsDataURL(file);
  }

  async function addTrigger() {
    if (!keyword || (!response && !image)) {
      alert("Isi kata kunci dan minimal respon atau gambar");
      return;
    }

    const { error } = await supabase.from("triggers").insert([
      {
        keyword,
        response,
        type,
        image,
        active: true,
      },
    ]);

    if (!error) {
      setKeyword("");
      setResponse("");
      setType("Mengandung");
      setImage("");
      setShowForm(false);

      getTriggers();
    }
  }

  async function toggleStatus(id, current) {
    await supabase
      .from("triggers")
      .update({
        active: !current,
      })
      .eq("id", id);

    getTriggers();
  }

  async function deleteTrigger(id) {
    await supabase.from("triggers").delete().eq("id", id);

    getTriggers();
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

      <div
        style={{
          marginTop: 15,
          background: "white",
          padding: 20,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <h3>Status WhatsApp</h3>

        <p>
          Status:{" "}
          <b style={{ color: waStatus ? "green" : "red" }}>
            {waStatus ? "Terhubung" : "Belum Terhubung"}
          </b>
        </p>

        {!waStatus && qrData && (
          <div>
            <p>Scan QR ini dari WhatsApp:</p>
            <img
              src={qrData}
              alt="QR WhatsApp"
              style={{
                width: 250,
                borderRadius: 10,
              }}
            />
          </div>
        )}
      </div>

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
            style={{
              padding: 12,
              marginRight: 10,
              marginBottom: 10,
            }}
          />

          <input
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Respon otomatis / caption"
            style={{
              padding: 12,
              marginRight: 10,
              marginBottom: 10,
            }}
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              padding: 12,
              marginRight: 10,
              marginBottom: 10,
            }}
          >
            <option>Mengandung</option>
            <option>Sama Persis</option>
          </select>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) uploadImage(file);
            }}
            style={{
              padding: 12,
              marginRight: 10,
              marginBottom: 10,
            }}
          />

          {uploading && <p>Sedang upload gambar...</p>}

          {image && (
            <div style={{ marginBottom: 10 }}>
              <img
                src={image}
                alt="Preview"
                style={{
                  width: 120,
                  borderRadius: 8,
                  display: "block",
                  marginBottom: 8,
                }}
              />
              <small>Gambar siap dikirim</small>
            </div>
          )}

          <button
            onClick={addTrigger}
            disabled={uploading}
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
              <th align="left">Gambar</th>
              <th align="left">Trigger</th>
              <th align="left">Status</th>
              <th align="left">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {triggers.map((item) => (
              <tr key={item.id}>
                <td>{item.keyword}</td>
                <td>{item.response}</td>

                <td>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt="Trigger"
                      style={{
                        width: 70,
                        borderRadius: 6,
                      }}
                    />
                  ) : (
                    "-"
                  )}
                </td>

                <td>{item.type}</td>

                <td>{item.active ? "Aktif" : "Nonaktif"}</td>

                <td>
                  <button
                    onClick={() => toggleStatus(item.id, item.active)}
                    style={{
                      marginRight: 10,
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                  >
                    {item.active ? "Matikan" : "Aktifkan"}
                  </button>

                  <button
                    onClick={() => deleteTrigger(item.id)}
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
