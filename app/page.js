"use client";

import { useEffect, useState } from "react";
import supabase from "../lib/supabase";

const WA_ENGINE_URL = "https://wa-engine-production-8ebe.up.railway.app";

export default function Home() {
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [newFlowName, setNewFlowName] = useState("");

  const [triggers, setTriggers] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [response, setResponse] = useState("");
  const [type, setType] = useState("Mengandung");
  const [image, setImage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [waStatus, setWaStatus] = useState(null);
  const [qrData, setQrData] = useState(null);

  async function getFlows() {
    const { data, error } = await supabase
      .from("flows")
      .select("*")
      .order("id", { ascending: false });

    if (!error) {
      setFlows(data || []);

      if (!selectedFlow && data && data.length > 0) {
        setSelectedFlow(data[0]);
        getTriggers(data[0].id);
      }
    }
  }

  async function addFlow() {
    if (!newFlowName) {
      alert("Isi nama alur dulu");
      return;
    }

    const { error } = await supabase.from("flows").insert([
      {
        name: newFlowName,
      },
    ]);

    if (!error) {
      setNewFlowName("");
      getFlows();
    }
  }

  async function selectFlow(flow) {
    setSelectedFlow(flow);
    setShowForm(false);
    getTriggers(flow.id);
  }

  async function getTriggers(flowId = selectedFlow?.id) {
    if (!flowId) return;

    const { data, error } = await supabase
      .from("triggers")
      .select("*")
      .eq("flow_id", flowId)
      .order("id", { ascending: false });

    if (!error) {
      setTriggers(data || []);
    }
  }

  async function getWaStatus() {
    try {
      const res = await fetch(`${WA_ENGINE_URL}/qr-json?t=${Date.now()}`);
      const data = await res.json();

      setWaStatus(data.connected);

      if (data.connected) {
        setQrData(null);
      } else {
        setQrData(data.qr);
      }
    } catch (err) {
      setWaStatus(false);
      setQrData(null);
    }
  }

  async function connectWa() {
    await fetch(`${WA_ENGINE_URL}/connect?t=${Date.now()}`);
    setTimeout(getWaStatus, 2000);
  }

  async function logoutWa() {
    const confirmLogout = confirm("Yakin mau logout WhatsApp?");
    if (!confirmLogout) return;

    await fetch(`${WA_ENGINE_URL}/logout?t=${Date.now()}`);
    setTimeout(getWaStatus, 2000);
  }

  useEffect(() => {
    getFlows();
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
    if (!selectedFlow) {
      alert("Pilih alur dulu");
      return;
    }

    if (!keyword || (!response && !image)) {
      alert("Isi kata kunci dan minimal respon atau gambar");
      return;
    }

    const { error } = await supabase.from("triggers").insert([
      {
        flow_id: selectedFlow.id,
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

      getTriggers(selectedFlow.id);
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

        <div style={{ marginTop: 15 }}>
          {!waStatus && (
            <button
              onClick={connectWa}
              style={{
                background: "#00a884",
                color: "white",
                border: "none",
                padding: "10px 15px",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer",
                marginRight: 10,
              }}
            >
              Hubungkan WA
            </button>
          )}

          {waStatus && (
            <button
              onClick={logoutWa}
              style={{
                background: "red",
                color: "white",
                border: "none",
                padding: "10px 15px",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Logout WA
            </button>
          )}
        </div>

        {!waStatus && qrData && (
          <div style={{ marginTop: 20 }}>
            <p>Scan QR ini dari WhatsApp:</p>

            <img
              src={qrData}
              alt="QR WhatsApp"
              style={{
                width: 250,
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 10,
            padding: 20,
          }}
        >
          <h3>Daftar Alur</h3>

          <div style={{ marginBottom: 15 }}>
            <input
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
              placeholder="Nama alur baru"
              style={{
                padding: 10,
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 10,
              }}
            />

            <button
              onClick={addFlow}
              style={{
                background: "#00a884",
                color: "white",
                border: "none",
                padding: "10px 12px",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer",
                width: "100%",
              }}
            >
              + Tambah Alur
            </button>
          </div>

          {flows.length === 0 && <p>Belum ada alur.</p>}

          {flows.map((flow) => (
            <div
              key={flow.id}
              onClick={() => selectFlow(flow)}
              style={{
                padding: 12,
                borderRadius: 8,
                marginBottom: 8,
                cursor: "pointer",
                background:
                  selectedFlow?.id === flow.id ? "#00a884" : "#f2f2f2",
                color: selectedFlow?.id === flow.id ? "white" : "black",
                fontWeight: selectedFlow?.id === flow.id ? "bold" : "normal",
              }}
            >
              {flow.name}
            </div>
          ))}
        </div>

        <div>
          <div
            style={{
              background: "white",
              borderRadius: 10,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <h3>
              Trigger Alur:{" "}
              <span style={{ color: "#00a884" }}>
                {selectedFlow ? selectedFlow.name : "Belum pilih alur"}
              </span>
            </h3>

            <button
              onClick={() => setShowForm(!showForm)}
              disabled={!selectedFlow}
              style={{
                background: selectedFlow ? "#00a884" : "#999",
                color: "white",
                border: "none",
                padding: "12px 18px",
                borderRadius: 8,
                fontWeight: "bold",
                marginTop: 10,
                cursor: selectedFlow ? "pointer" : "not-allowed",
              }}
            >
              + Tambah Trigger
            </button>
          </div>

          {showForm && selectedFlow && (
            <div
              style={{
                marginBottom: 20,
                background: "white",
                padding: 20,
                borderRadius: 10,
              }}
            >
              <h3>Tambah Trigger Baru</h3>

              <p>
                Alur: <b>{selectedFlow.name}</b>
              </p>

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
              background: "white",
              borderRadius: 10,
              padding: 20,
              overflowX: "auto",
            }}
          >
            {!selectedFlow && <p>Pilih alur dulu untuk melihat trigger.</p>}

            {selectedFlow && (
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

                  {triggers.length === 0 && (
                    <tr>
                      <td colSpan="6">Belum ada trigger di alur ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
