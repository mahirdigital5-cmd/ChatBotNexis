"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabase";

const WA_ENGINE_URL = "https://wa-engine-production-8ebe.up.railway.app";

export default function Home() {
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [newFlowName, setNewFlowName] = useState("");

  const [editingFlowId, setEditingFlowId] = useState(null);
  const [editingFlowName, setEditingFlowName] = useState("");

  const [copyTargetFlow, setCopyTargetFlow] = useState({});
  const [copyingTriggerId, setCopyingTriggerId] = useState(null);

  const [triggers, setTriggers] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [response, setResponse] = useState("");
  const [responseList, setResponseList] = useState([""]);
  const [type, setType] = useState("Mengandung");
  const [image, setImage] = useState("");
  const [media, setMedia] = useState([]);
  const [isFlowEntry, setIsFlowEntry] = useState(false);

  const [editingTriggerId, setEditingTriggerId] = useState(null);
  const [editKeyword, setEditKeyword] = useState("");
  const [editResponse, setEditResponse] = useState("");
  const [editResponseList, setEditResponseList] = useState([""]);
  const [editType, setEditType] = useState("Mengandung");
  const [editIsFlowEntry, setEditIsFlowEntry] = useState(false);
  const [editImage, setEditImage] = useState("");
  const [editMedia, setEditMedia] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [editUploadingCount, setEditUploadingCount] = useState(0);

  const uploading = uploadingCount > 0;
  const editUploading = editUploadingCount > 0;

  const [waStatus, setWaStatus] = useState(null);
  const [qrData, setQrData] = useState(null);

  const activeTriggers = useMemo(
    () => triggers.filter((item) => item.active).length,
    [triggers]
  );

  const flowEntryCount = useMemo(
    () => triggers.filter((item) => item.is_flow_entry).length,
    [triggers]
  );

  function joinResponses(list) {
    return list.map((item) => item.trim()).filter(Boolean).join("\n");
  }

  function splitResponses(value) {
    const result = String(value || "")
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);

    return result.length > 0 ? result : [""];
  }

  function getMediaFromItem(item) {
    if (Array.isArray(item?.media)) {
      return item.media.filter((m) => m?.url);
    }

    if (typeof item?.media === "string") {
      try {
        const parsed = JSON.parse(item.media);
        if (Array.isArray(parsed)) {
          return parsed.filter((m) => m?.url);
        }
      } catch {}
    }

    if (item?.image) {
      return [
        {
          type: "image",
          url: item.image,
        },
      ];
    }

    return [];
  }

  function getMediaSummary(item) {
    const list = getMediaFromItem(item);
    const imageCount = list.filter((m) => m.type !== "video").length;
    const videoCount = list.filter((m) => m.type === "video").length;

    if (imageCount > 0 && videoCount > 0) {
      return `${imageCount} foto · ${videoCount} video`;
    }

    if (imageCount > 0) {
      return `${imageCount} foto`;
    }

    if (videoCount > 0) {
      return `${videoCount} video`;
    }

    return "Tanpa media";
  }

  async function getFlows() {
    const { data } = await supabase
      .from("flows")
      .select("*")
      .order("id", { ascending: false });

    setFlows(data || []);

    if (!selectedFlow && data?.length > 0) {
      setSelectedFlow(data[0]);
      getTriggers(data[0].id);
    }
  }

  async function addFlow() {
    if (!newFlowName) return alert("Isi nama alur");

    await supabase.from("flows").insert([{ name: newFlowName }]);

    setNewFlowName("");
    getFlows();
  }

  async function updateFlowName(id) {
    if (!editingFlowName) return alert("Nama alur tidak boleh kosong");

    await supabase.from("flows").update({ name: editingFlowName }).eq("id", id);

    if (selectedFlow?.id === id) {
      setSelectedFlow({ ...selectedFlow, name: editingFlowName });
    }

    setEditingFlowId(null);
    setEditingFlowName("");
    getFlows();
  }

  async function deleteFlow(id) {
    const ok = confirm(
      "Yakin hapus alur? Semua trigger di alur ini ikut terhapus."
    );

    if (!ok) return;

    await supabase.from("triggers").delete().eq("flow_id", id);
    await supabase.from("flows").delete().eq("id", id);

    if (selectedFlow?.id === id) {
      setSelectedFlow(null);
      setTriggers([]);
    }

    getFlows();
  }

  async function selectFlow(flow) {
    setSelectedFlow(flow);
    setShowForm(false);
    setEditingTriggerId(null);
    getTriggers(flow.id);
  }

  async function getTriggers(flowId = selectedFlow?.id) {
    if (!flowId) return;

    const { data } = await supabase
      .from("triggers")
      .select("*")
      .eq("flow_id", flowId)
      .order("id", { ascending: false });

    setTriggers(data || []);
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
    } catch {
      setWaStatus(false);
      setQrData(null);
    }
  }

  async function connectWa() {
    await fetch(`${WA_ENGINE_URL}/connect?t=${Date.now()}`);
    setTimeout(getWaStatus, 2000);
  }

  async function logoutWa() {
    const ok = confirm("Logout WhatsApp?");
    if (!ok) return;

    await fetch(`${WA_ENGINE_URL}/logout?t=${Date.now()}`);
    setTimeout(getWaStatus, 2000);
  }

  useEffect(() => {
    getFlows();
    getWaStatus();

    const interval = setInterval(getWaStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  async function uploadMedia(file) {
    setUploadingCount((prev) => prev + 1);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || "Server tidak mengembalikan JSON");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Upload gagal");
      }

      const url = data.url || data.image;

      setMedia((prev) => [
        ...prev,
        {
          type: data.type || (file.type.startsWith("video/") ? "video" : "image"),
          url,
        },
      ]);

      if (data.type === "image" && !image) {
        setImage(url);
      }
    } catch (err) {
      alert("Upload gagal: " + err.message);
    } finally {
      setUploadingCount((prev) => Math.max(prev - 1, 0));
    }
  }

  async function uploadEditMedia(file) {
    setEditUploadingCount((prev) => prev + 1);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || "Server tidak mengembalikan JSON");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Upload gagal");
      }

      const url = data.url || data.image;

      setEditMedia((prev) => [
        ...prev,
        {
          type: data.type || (file.type.startsWith("video/") ? "video" : "image"),
          url,
        },
      ]);

      if (data.type === "image" && !editImage) {
        setEditImage(url);
      }
    } catch (err) {
      alert("Upload gagal: " + err.message);
    } finally {
      setEditUploadingCount((prev) => Math.max(prev - 1, 0));
    }
  }

  function removeMedia(index) {
    const updated = media.filter((_, i) => i !== index);
    setMedia(updated);

    const firstImage = updated.find((m) => m.type === "image");
    setImage(firstImage?.url || "");
  }

  function removeEditMedia(index) {
    const updated = editMedia.filter((_, i) => i !== index);
    setEditMedia(updated);

    const firstImage = updated.find((m) => m.type === "image");
    setEditImage(firstImage?.url || "");
  }

  async function addTrigger() {
    if (!selectedFlow) return alert("Pilih alur dulu");

    if (uploading) {
      return alert("Tunggu upload selesai dulu");
    }

    const finalResponse = joinResponses(responseList);

    if (!keyword || (!finalResponse && media.length === 0)) {
      return alert("Isi keyword dan respon/foto/video");
    }

    const firstImage = media.find((m) => m.type === "image");

    await supabase.from("triggers").insert([
      {
        flow_id: selectedFlow.id,
        keyword,
        response: finalResponse,
        type,
        image: firstImage?.url || "",
        media,
        active: true,
        is_flow_entry: isFlowEntry,
      },
    ]);

    setKeyword("");
    setResponse("");
    setResponseList([""]);
    setType("Mengandung");
    setImage("");
    setMedia([]);
    setIsFlowEntry(false);
    setShowForm(false);
    setUploadingCount(0);

    getTriggers(selectedFlow.id);
  }

  function startEditTrigger(item) {
    const itemMedia = getMediaFromItem(item);
    const firstImage = itemMedia.find((m) => m.type === "image");

    setEditingTriggerId(item.id);
    setEditKeyword(item.keyword || "");
    setEditResponse(item.response || "");
    setEditResponseList(splitResponses(item.response));
    setEditType(item.type || "Mengandung");
    setEditIsFlowEntry(item.is_flow_entry === true);
    setEditMedia(itemMedia);
    setEditImage(firstImage?.url || item.image || "");
  }

  async function saveEditTrigger(id) {
    if (editUploading) {
      return alert("Tunggu upload selesai dulu");
    }

    const finalEditResponse = joinResponses(editResponseList);

    if (!editKeyword || (!finalEditResponse && editMedia.length === 0)) {
      return alert("Keyword dan respon/foto/video tidak boleh kosong");
    }

    const firstImage = editMedia.find((m) => m.type === "image");

    await supabase
      .from("triggers")
      .update({
        keyword: editKeyword,
        response: finalEditResponse,
        type: editType,
        image: firstImage?.url || "",
        media: editMedia,
        is_flow_entry: editIsFlowEntry,
      })
      .eq("id", id);

    setEditingTriggerId(null);
    setEditKeyword("");
    setEditResponse("");
    setEditResponseList([""]);
    setEditType("Mengandung");
    setEditIsFlowEntry(false);
    setEditImage("");
    setEditMedia([]);
    setEditUploadingCount(0);

    getTriggers();
  }


  async function duplicateTrigger(item, targetFlowId = null) {
    try {
      const targetFlow = targetFlowId || item.flow_id;

      const payload = {
        flow_id: targetFlow,
        keyword: `${item.keyword} copy`,
        response: item.response || "",
        type: item.type || "Mengandung",
        image: item.image || "",
        media: item.media || [],
        active: true,
        is_flow_entry: item.is_flow_entry === true,
      };

      const { data, error } = await supabase
        .from("triggers")
        .insert([payload])
        .select()
        .single();

      if (error) {
        alert(error.message || "Gagal copy trigger");
        return;
      }

      if (targetFlow === selectedFlow?.id) {
        await getTriggers();
      }

      if (data) {
        startEditTrigger(data);
        setShowForm(false);
      }

      alert("Trigger berhasil disalin");
    } catch (err) {
      alert("Gagal duplicate: " + err.message);
    }
  }

  async function toggleStatus(id, current) {
    await supabase.from("triggers").update({ active: !current }).eq("id", id);

    getTriggers();
  }

  async function deleteTrigger(id) {
    const ok = confirm("Yakin hapus trigger ini?");
    if (!ok) return;

    await supabase.from("triggers").delete().eq("id", id);

    getTriggers();
  }

  const styles = {
    page: {
      minHeight: "100vh",
      padding: 28,
      color: "white",
    },
    shell: {
      display: "grid",
      gridTemplateColumns: "320px minmax(0, 1fr)",
      gap: 24,
      maxWidth: 1480,
      margin: "0 auto",
    },
    sidebar: {
      position: "sticky",
      top: 28,
      height: "calc(100vh - 56px)",
      padding: 22,
      overflow: "auto",
    },
    brand: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 28,
    },
    logo: {
      width: 46,
      height: 46,
      borderRadius: 16,
      display: "grid",
      placeItems: "center",
      background:
        "linear-gradient(135deg, rgba(0,255,157,1), rgba(0,199,123,0.85))",
      color: "#001b12",
      fontWeight: 900,
      boxShadow: "0 0 32px rgba(0,255,157,0.35)",
    },
    muted: {
      color: "#9ca3af",
    },
    input: {
      width: "100%",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "white",
      borderRadius: 16,
      padding: "14px 15px",
      outline: "none",
    },
    button: {
      border: "none",
      borderRadius: 14,
      padding: "12px 15px",
      cursor: "pointer",
      fontWeight: 800,
    },
    ghostButton: {
      background: "rgba(255,255,255,0.07)",
      color: "white",
      border: "1px solid rgba(255,255,255,0.08)",
    },
    dangerButton: {
      background: "rgba(255,77,103,0.15)",
      color: "#ff7b90",
      border: "1px solid rgba(255,77,103,0.25)",
    },
    main: {
      minWidth: 0,
    },
    topbar: {
      padding: 26,
      marginBottom: 22,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 18,
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(0,255,157,0.045))",
    },
    title: {
      fontSize: 22,
      letterSpacing: -0.4,
      marginBottom: 6,
      color: "#d1d5db",
      fontWeight: 700,
    },
    heroBrand: {
      fontSize: 58,
      lineHeight: 0.95,
      letterSpacing: -3,
      fontWeight: 950,
      marginBottom: 10,
      background:
        "linear-gradient(135deg, #ffffff 10%, #00ff9d 52%, #6fffd0 92%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      textShadow: "0 0 34px rgba(0,255,157,0.18)",
    },
    cardGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 16,
      marginBottom: 22,
    },
    statCard: {
      padding: 20,
      minHeight: 128,
      position: "relative",
      overflow: "hidden",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "1.2fr 0.8fr",
      gap: 18,
    },
    section: {
      padding: 22,
      marginBottom: 22,
    },
    label: {
      display: "block",
      fontSize: 13,
      color: "#9ca3af",
      marginBottom: 8,
      fontWeight: 700,
    },
    textarea: {
      width: "100%",
      minHeight: 96,
      resize: "vertical",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "white",
      borderRadius: 16,
      padding: 14,
      outline: "none",
    },
    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "7px 12px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
    },
    tableWrap: {
      padding: 0,
      overflow: "hidden",
    },
  };

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <aside className="glass-card" style={styles.sidebar}>
          <div style={styles.brand}>
            <div style={styles.logo}>N</div>
            <div>
              <h2 style={{ fontSize: 22, lineHeight: 1, letterSpacing: -0.6 }}>
                NEXIS
              </h2>
              <p style={{ ...styles.muted, fontSize: 12, marginTop: 6 }}>
                WhatsApp Automation Suite
              </p>
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 20,
              background:
                "linear-gradient(135deg, rgba(0,255,157,0.14), rgba(255,255,255,0.04))",
              border: "1px solid rgba(0,255,157,0.15)",
              marginBottom: 20,
            }}
          >
            <p style={{ ...styles.muted, fontSize: 13, marginBottom: 8 }}>
              WhatsApp Status
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: waStatus ? "#00ff9d" : "#ff4d67",
                  boxShadow: waStatus
                    ? "0 0 18px rgba(0,255,157,0.8)"
                    : "0 0 18px rgba(255,77,103,0.8)",
                }}
              />
              <b>{waStatus ? "Terhubung" : "Belum Terhubung"}</b>
            </div>

            <button
              onClick={waStatus ? logoutWa : connectWa}
              className={waStatus ? "" : "green-btn"}
              style={{
                ...styles.button,
                ...(waStatus ? styles.dangerButton : {}),
                width: "100%",
                marginTop: 15,
              }}
            >
              {waStatus ? "Logout WhatsApp" : "Hubungkan WhatsApp"}
            </button>

            {!waStatus && qrData && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.08)",
                }}
              >
                <img
                  src={qrData}
                  alt="QR"
                  style={{ width: "100%", borderRadius: 14, display: "block" }}
                />
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={styles.label}>Buat Alur Baru</label>
            <input
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
              placeholder="Contoh: Closing, CS, Promo"
              style={styles.input}
            />
            <button
              onClick={addFlow}
              className="green-btn"
              style={{ ...styles.button, width: "100%", marginTop: 10 }}
            >
              + Tambah Alur
            </button>
          </div>

          <div style={{ marginTop: 22 }}>
            <p
              style={{
                ...styles.muted,
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              DAFTAR ALUR
            </p>

            <div style={{ display: "grid", gap: 10 }}>
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className="sidebar-item"
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    background:
                      selectedFlow?.id === flow.id
                        ? "linear-gradient(135deg, rgba(0,255,157,0.22), rgba(255,255,255,0.06))"
                        : "rgba(255,255,255,0.045)",
                    border:
                      selectedFlow?.id === flow.id
                        ? "1px solid rgba(0,255,157,0.35)"
                        : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {editingFlowId === flow.id ? (
                    <>
                      <input
                        value={editingFlowName}
                        onChange={(e) => setEditingFlowName(e.target.value)}
                        style={styles.input}
                      />

                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button
                          onClick={() => updateFlowName(flow.id)}
                          className="green-btn"
                          style={{ ...styles.button, flex: 1, padding: 10 }}
                        >
                          Simpan
                        </button>

                        <button
                          onClick={() => {
                            setEditingFlowId(null);
                            setEditingFlowName("");
                          }}
                          style={{
                            ...styles.button,
                            ...styles.ghostButton,
                            flex: 1,
                            padding: 10,
                          }}
                        >
                          Batal
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        onClick={() => selectFlow(flow)}
                        style={{
                          cursor: "pointer",
                          fontWeight: 800,
                          marginBottom: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <span>{flow.name}</span>
                        {selectedFlow?.id === flow.id && (
                          <span style={{ color: "#00ff9d" }}>●</span>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => {
                            setEditingFlowId(flow.id);
                            setEditingFlowName(flow.name);
                          }}
                          style={{
                            ...styles.button,
                            ...styles.ghostButton,
                            padding: "8px 10px",
                            flex: 1,
                          }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteFlow(flow.id)}
                          style={{
                            ...styles.button,
                            ...styles.dangerButton,
                            padding: "8px 10px",
                            flex: 1,
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {flows.length === 0 && (
                <p style={{ ...styles.muted, fontSize: 14 }}>
                  Belum ada alur. Buat alur pertama kamu.
                </p>
              )}
            </div>
          </div>
        </aside>

        <section style={styles.main}>
          <div className="glass-card" style={styles.topbar}>
            <div>
              <p
                style={{
                  color: "#00ff9d",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 1.8,
                  marginBottom: 10,
                }}
              >
                DARK LUXURY AUTOMATION
              </p>
              <div style={styles.heroBrand}>NEXIS</div>
              <h1 style={styles.title}>WA Automation Command Center</h1>
              <p style={{ ...styles.muted, maxWidth: 620, lineHeight: 1.7 }}>
                Dashboard premium untuk flow, trigger, multi-reply, dan media
                WhatsApp automation.
              </p>
            </div>

            <button
              onClick={() => setShowForm(!showForm)}
              disabled={!selectedFlow}
              className={selectedFlow ? "green-btn" : ""}
              style={{
                ...styles.button,
                opacity: selectedFlow ? 1 : 0.45,
                cursor: selectedFlow ? "pointer" : "not-allowed",
                minWidth: 170,
              }}
            >
              {showForm ? "Tutup Form" : "+ Tambah Trigger"}
            </button>
          </div>

          <div style={styles.cardGrid}>
            <div className="glass-card" style={styles.statCard}>
              <p style={styles.muted}>Alur Aktif</p>
              <h2 style={{ fontSize: 34, marginTop: 12 }}>{flows.length}</h2>
              <p style={{ ...styles.muted, marginTop: 10, fontSize: 13 }}>
                Total flow automation
              </p>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <p style={styles.muted}>Trigger</p>
              <h2 style={{ fontSize: 34, marginTop: 12 }}>{triggers.length}</h2>
              <p style={{ ...styles.muted, marginTop: 10, fontSize: 13 }}>
                Dalam alur terpilih
              </p>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <p style={styles.muted}>Aktif</p>
              <h2 style={{ fontSize: 34, marginTop: 12 }}>{activeTriggers}</h2>
              <p style={{ ...styles.muted, marginTop: 10, fontSize: 13 }}>
                Siap membalas pelanggan
              </p>
            </div>

            <div className="glass-card" style={styles.statCard}>
              <p style={styles.muted}>Flow Entry</p>
              <h2 style={{ fontSize: 34, marginTop: 12 }}>{flowEntryCount}</h2>
              <p style={{ ...styles.muted, marginTop: 10, fontSize: 13 }}>
                Trigger pindah alur
              </p>
            </div>
          </div>

          <div
            className="glass-card"
            style={{
              ...styles.section,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div>
                <p style={styles.muted}>Selected Flow</p>
                <h2 style={{ marginTop: 6, letterSpacing: -0.4 }}>
                  {selectedFlow?.name || "Pilih alur terlebih dahulu"}
                </h2>
                <p style={{ ...styles.muted, marginTop: 8, fontSize: 14 }}>
                  Minimal, rapi, dan fokus ke automation yang benar-benar aktif.
                </p>
              </div>

              <span
                style={{
                  ...styles.pill,
                  background: "rgba(0,255,157,0.12)",
                  color: "#00ff9d",
                  border: "1px solid rgba(0,255,157,0.2)",
                }}
              >
                ● {selectedFlow ? "LIVE FLOW" : "NO FLOW"}
              </span>
            </div>
          </div>

          {showForm && (
            <div className="glass-card glow" style={styles.section}>
              <div style={{ marginBottom: 22 }}>
                <p
                  style={{
                    color: "#00ff9d",
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: 1.4,
                    marginBottom: 8,
                  }}
                >
                  CREATE AUTOMATION
                </p>
                <h2>Tambah Trigger Baru</h2>
                <p style={{ ...styles.muted, marginTop: 8 }}>
                  Buat keyword, multi balasan, dan lampirkan media jika
                  diperlukan.
                </p>
              </div>

              <div style={styles.formGrid}>
                <div>
                  <label style={styles.label}>Keyword</label>
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Contoh: halo, harga, ongkir"
                    style={{ ...styles.input, marginBottom: 16 }}
                  />

                  <label style={styles.label}>Multi Jawaban</label>
                  {responseList.map((item, index) => (
                    <div key={index} style={{ marginBottom: 12 }}>
                      <textarea
                        value={item}
                        onChange={(e) => {
                          const updated = [...responseList];
                          updated[index] = e.target.value;
                          setResponseList(updated);
                          setResponse(joinResponses(updated));
                        }}
                        placeholder={`Jawaban ${index + 1}`}
                        style={styles.textarea}
                      />

                      {responseList.length > 1 && (
                        <button
                          onClick={() => {
                            const updated = responseList.filter(
                              (_, i) => i !== index
                            );
                            setResponseList(updated);
                            setResponse(joinResponses(updated));
                          }}
                          style={{
                            ...styles.button,
                            ...styles.dangerButton,
                            marginTop: 8,
                            padding: "9px 12px",
                          }}
                        >
                          Hapus Jawaban
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => setResponseList([...responseList, ""])}
                    style={{
                      ...styles.button,
                      ...styles.ghostButton,
                      marginBottom: 16,
                    }}
                  >
                    + Tambah Jawaban
                  </button>
                </div>

                <div>
                  <label style={styles.label}>Tipe Trigger</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{ ...styles.input, marginBottom: 16 }}
                  >
                    <option>Mengandung</option>
                    <option>Sama Persis</option>
                  </select>

                  <label
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: 15,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      marginBottom: 16,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isFlowEntry}
                      onChange={(e) => setIsFlowEntry(e.target.checked)}
                    />
                    <span>Jadikan trigger masuk/pindah alur</span>
                  </label>

                  <label style={styles.label}>Media</label>
                  <label
                    style={{
                      display: "block",
                      padding: 18,
                      borderRadius: 20,
                      border: "1px dashed rgba(0,255,157,0.35)",
                      background: "rgba(0,255,157,0.06)",
                      cursor: "pointer",
                      textAlign: "center",
                      marginBottom: 14,
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach((file) => uploadMedia(file));
                        e.target.value = "";
                      }}
                    />
                    <b>Upload Foto / Video</b>
                    <p style={{ ...styles.muted, fontSize: 13, marginTop: 6 }}>
                      Klik untuk pilih file media
                    </p>
                  </label>

                  {uploading && (
                    <p style={{ color: "#00ff9d", marginBottom: 12 }}>
                      Upload media... {uploadingCount} file sedang diproses
                    </p>
                  )}

                  {media.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 10,
                      }}
                    >
                      {media.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            padding: 10,
                            borderRadius: 16,
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {item.type === "video" ? (
                            <video
                              src={item.url}
                              controls
                              style={{
                                width: "100%",
                                borderRadius: 12,
                                display: "block",
                                marginBottom: 8,
                              }}
                            />
                          ) : (
                            <img
                              src={item.url}
                              alt="Preview"
                              style={{
                                width: "100%",
                                borderRadius: 12,
                                display: "block",
                                marginBottom: 8,
                              }}
                            />
                          )}

                          <button
                            onClick={() => removeMedia(index)}
                            style={{
                              ...styles.button,
                              ...styles.dangerButton,
                              width: "100%",
                              padding: "8px 10px",
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={addTrigger}
                disabled={uploading}
                className={!uploading ? "green-btn" : ""}
                style={{
                  ...styles.button,
                  marginTop: 22,
                  opacity: uploading ? 0.5 : 1,
                  cursor: uploading ? "not-allowed" : "pointer",
                  minWidth: 180,
                }}
              >
                Simpan Trigger
              </button>
            </div>
          )}

          <div className="glass-card" style={styles.tableWrap}>
            <div
              style={{
                padding: "22px 22px 0",
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ letterSpacing: -0.5 }}>Trigger Library</h2>
                <p style={{ ...styles.muted, marginTop: 6 }}>
                  Preview balasan, media, dan duplicate trigger super cepat.
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto", padding: 22 }}>
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Keyword</th>
                    <th>Respon</th>
                    <th>Media</th>
                    <th>Trigger</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {triggers.map((item) => (
                    <tr key={item.id}>
                      {editingTriggerId === item.id ? (
                        <>
                          <td style={{ minWidth: 190 }}>
                            <input
                              value={editKeyword}
                              onChange={(e) => setEditKeyword(e.target.value)}
                              style={styles.input}
                            />
                          </td>

                          <td style={{ minWidth: 290 }}>
                            {editResponseList.map((item, index) => (
                              <div key={index} style={{ marginBottom: 8 }}>
                                <textarea
                                  value={item}
                                  onChange={(e) => {
                                    const updated = [...editResponseList];
                                    updated[index] = e.target.value;
                                    setEditResponseList(updated);
                                    setEditResponse(joinResponses(updated));
                                  }}
                                  placeholder={`Jawaban ${index + 1}`}
                                  style={{ ...styles.textarea, minHeight: 74 }}
                                />

                                {editResponseList.length > 1 && (
                                  <button
                                    onClick={() => {
                                      const updated = editResponseList.filter(
                                        (_, i) => i !== index
                                      );
                                      setEditResponseList(updated);
                                      setEditResponse(joinResponses(updated));
                                    }}
                                    style={{
                                      ...styles.button,
                                      ...styles.dangerButton,
                                      marginTop: 6,
                                      padding: "7px 10px",
                                    }}
                                  >
                                    Hapus
                                  </button>
                                )}
                              </div>
                            ))}

                            <button
                              onClick={() =>
                                setEditResponseList([...editResponseList, ""])
                              }
                              style={{
                                ...styles.button,
                                ...styles.ghostButton,
                                padding: "8px 10px",
                              }}
                            >
                              + Tambah Jawaban
                            </button>
                          </td>

                          <td style={{ minWidth: 210 }}>
                            <div
                              style={{
                                display: "grid",
                                gap: 10,
                                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                              }}
                            >
                              {editMedia.length > 0 ? (
                                editMedia.slice(0, 4).map((mediaItem, mediaIndex) => (
                                  <div
                                    key={mediaIndex}
                                    style={{
                                      borderRadius: 16,
                                      overflow: "hidden",
                                      background: "rgba(255,255,255,0.06)",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                      minHeight: 86,
                                    }}
                                  >
                                    {mediaItem.type === "video" ? (
                                      <video
                                        src={mediaItem.url}
                                        controls
                                        style={{
                                          width: "100%",
                                          height: 86,
                                          objectFit: "cover",
                                          display: "block",
                                        }}
                                      />
                                    ) : (
                                      <img
                                        src={mediaItem.url}
                                        alt="Media Preview"
                                        style={{
                                          width: "100%",
                                          height: 86,
                                          objectFit: "cover",
                                          display: "block",
                                        }}
                                      />
                                    )}
                                  </div>
                                ))
                              ) : (
                                <span style={styles.muted}>Belum ada media</span>
                              )}
                            </div>
                          </td>

                          <td style={{ minWidth: 230 }}>
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value)}
                              style={{ ...styles.input, marginBottom: 10 }}
                            >
                              <option>Mengandung</option>
                              <option>Sama Persis</option>
                            </select>

                            <label
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                                fontSize: 13,
                                color: "#d1d5db",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={editIsFlowEntry}
                                onChange={(e) =>
                                  setEditIsFlowEntry(e.target.checked)
                                }
                              />
                              Masuk/Pindah Alur
                            </label>

                            <label
                              style={{
                                display: "block",
                                padding: 12,
                                borderRadius: 14,
                                border: "1px dashed rgba(0,255,157,0.25)",
                                background: "rgba(0,255,157,0.05)",
                                cursor: "pointer",
                                textAlign: "center",
                                marginTop: 12,
                                fontSize: 13,
                              }}
                            >
                              <input
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  files.forEach((file) => uploadEditMedia(file));
                                  e.target.value = "";
                                }}
                              />
                              Upload Media
                            </label>

                            {editUploading && (
                              <p style={{ color: "#00ff9d", marginTop: 8 }}>
                                Upload... {editUploadingCount} file
                              </p>
                            )}

                            {editMedia.length > 0 && (
                              <div
                                style={{
                                  marginTop: 10,
                                  display: "grid",
                                  gap: 10,
                                }}
                              >
                                {editMedia.map((item, index) => (
                                  <div
                                    key={index}
                                    style={{
                                      padding: 8,
                                      borderRadius: 14,
                                      background: "rgba(255,255,255,0.06)",
                                    }}
                                  >
                                    {item.type === "video" ? (
                                      <video
                                        src={item.url}
                                        controls
                                        style={{
                                          width: "100%",
                                          borderRadius: 10,
                                          display: "block",
                                          marginBottom: 6,
                                        }}
                                      />
                                    ) : (
                                      <img
                                        src={item.url}
                                        alt="Edit Preview"
                                        style={{
                                          width: "100%",
                                          borderRadius: 10,
                                          display: "block",
                                          marginBottom: 6,
                                        }}
                                      />
                                    )}

                                    <button
                                      onClick={() => removeEditMedia(index)}
                                      style={{
                                        ...styles.button,
                                        ...styles.dangerButton,
                                        width: "100%",
                                        padding: "7px 10px",
                                      }}
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          <td>
                            <span
                              style={{
                                ...styles.pill,
                                background: item.active
                                  ? "rgba(0,255,157,0.12)"
                                  : "rgba(255,77,103,0.12)",
                                color: item.active ? "#00ff9d" : "#ff7b90",
                              }}
                            >
                              {item.active ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>

                          <td style={{ minWidth: 170 }}>
                            <div style={{ display: "grid", gap: 8 }}>
                              <button
                                onClick={() => saveEditTrigger(item.id)}
                                disabled={editUploading}
                                className={!editUploading ? "green-btn" : ""}
                                style={{
                                  ...styles.button,
                                  padding: "9px 12px",
                                  opacity: editUploading ? 0.5 : 1,
                                }}
                              >
                                Simpan
                              </button>

                              <button
                                onClick={() => {
                                  setEditingTriggerId(null);
                                  setEditMedia([]);
                                  setEditImage("");
                                  setEditUploadingCount(0);
                                }}
                                style={{
                                  ...styles.button,
                                  ...styles.ghostButton,
                                  padding: "9px 12px",
                                }}
                              >
                                Batal
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <b>{item.keyword}</b>
                          </td>

                          <td style={{ maxWidth: 360 }}>
                            <div
                              style={{
                                whiteSpace: "pre-wrap",
                                color: "#d1d5db",
                                lineHeight: 1.55,
                              }}
                            >
                              {item.response || (
                                <span style={styles.muted}>Media only</span>
                              )}
                            </div>
                          </td>

                          <td style={{ minWidth: 210 }}>
                            {getMediaFromItem(item).length > 0 ? (
                              <div>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      getMediaFromItem(item).length === 1
                                        ? "1fr"
                                        : "repeat(2, minmax(0, 1fr))",
                                    gap: 8,
                                    maxWidth: 220,
                                  }}
                                >
                                  {getMediaFromItem(item)
                                    .slice(0, 4)
                                    .map((mediaItem, mediaIndex) => (
                                      <div
                                        key={mediaIndex}
                                        style={{
                                          position: "relative",
                                          borderRadius: 16,
                                          overflow: "hidden",
                                          background: "rgba(255,255,255,0.06)",
                                          border:
                                            "1px solid rgba(255,255,255,0.08)",
                                          height:
                                            getMediaFromItem(item).length === 1
                                              ? 126
                                              : 82,
                                        }}
                                      >
                                        {mediaItem.type === "video" ? (
                                          <>
                                            <video
                                              src={mediaItem.url}
                                              muted
                                              style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                display: "block",
                                              }}
                                            />
                                            <span
                                              style={{
                                                position: "absolute",
                                                left: 8,
                                                bottom: 8,
                                                padding: "4px 8px",
                                                borderRadius: 999,
                                                fontSize: 11,
                                                fontWeight: 800,
                                                background:
                                                  "rgba(0,0,0,0.58)",
                                                color: "white",
                                              }}
                                            >
                                              VIDEO
                                            </span>
                                          </>
                                        ) : (
                                          <img
                                            src={mediaItem.url}
                                            alt="Media Preview"
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                              display: "block",
                                            }}
                                          />
                                        )}

                                        {mediaIndex === 3 &&
                                          getMediaFromItem(item).length > 4 && (
                                            <div
                                              style={{
                                                position: "absolute",
                                                inset: 0,
                                                display: "grid",
                                                placeItems: "center",
                                                background:
                                                  "rgba(0,0,0,0.55)",
                                                fontWeight: 900,
                                              }}
                                            >
                                              +{getMediaFromItem(item).length - 4}
                                            </div>
                                          )}
                                      </div>
                                    ))}
                                </div>
                                <p
                                  style={{
                                    ...styles.muted,
                                    marginTop: 8,
                                    fontSize: 12,
                                  }}
                                >
                                  {getMediaSummary(item)}
                                </p>
                              </div>
                            ) : (
                              <span
                                style={{
                                  ...styles.pill,
                                  background: "rgba(255,255,255,0.055)",
                                  color: "#9ca3af",
                                }}
                              >
                                Tanpa media
                              </span>
                            )}
                          </td>

                          <td>
                            <span
                              style={{
                                ...styles.pill,
                                background: item.is_flow_entry
                                  ? "rgba(0,255,157,0.12)"
                                  : "rgba(255,255,255,0.07)",
                                color: item.is_flow_entry ? "#00ff9d" : "white",
                              }}
                            >
                              {item.is_flow_entry
                                ? "Masuk/Pindah Alur"
                                : item.type}
                            </span>
                          </td>

                          <td>
                            <span
                              style={{
                                ...styles.pill,
                                background: item.active
                                  ? "rgba(0,255,157,0.12)"
                                  : "rgba(255,77,103,0.12)",
                                color: item.active ? "#00ff9d" : "#ff7b90",
                              }}
                            >
                              {item.active ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>

                          <td>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                              }}
                            >
                              <button
                                onClick={() => startEditTrigger(item)}
                                style={{
                                  ...styles.button,
                                  ...styles.ghostButton,
                                  padding: "9px 12px",
                                }}
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => {
                                  duplicateTrigger(item);
                                }}
                                style={{
                                  ...styles.button,
                                  background: "rgba(0,255,157,0.12)",
                                  color: "#00ff9d",
                                  border: "1px solid rgba(0,255,157,0.18)",
                                  padding: "9px 12px",
                                }}
                              >
                                Duplicate
                              </button>

                              <button
                                onClick={() =>
                                  setCopyingTriggerId(
                                    copyingTriggerId === item.id ? null : item.id
                                  )
                                }
                                style={{
                                  ...styles.button,
                                  ...styles.ghostButton,
                                  padding: "9px 12px",
                                }}
                              >
                                Copy Flow
                              </button>

                              <button
                                onClick={() => toggleStatus(item.id, item.active)}
                                style={{
                                  ...styles.button,
                                  ...styles.ghostButton,
                                  padding: "9px 12px",
                                }}
                              >
                                {item.active ? "Matikan" : "Aktifkan"}
                              </button>

                              <button
                                onClick={() => deleteTrigger(item.id)}
                                style={{
                                  ...styles.button,
                                  ...styles.dangerButton,
                                  padding: "9px 12px",
                                }}
                              >
                                Hapus
                              </button>

                              {copyingTriggerId === item.id && (
                                <div
                                  style={{
                                    width: "100%",
                                    marginTop: 10,
                                    padding: 12,
                                    borderRadius: 16,
                                    background: "rgba(255,255,255,0.06)",
                                    border:
                                      "1px solid rgba(255,255,255,0.08)",
                                  }}
                                >
                                  <p
                                    style={{
                                      fontSize: 12,
                                      color: "#9ca3af",
                                      marginBottom: 8,
                                      fontWeight: 700,
                                    }}
                                  >
                                    COPY KE ALUR
                                  </p>

                                  <select
                                    value={copyTargetFlow[item.id] || ""}
                                    onChange={(e) =>
                                      setCopyTargetFlow({
                                        ...copyTargetFlow,
                                        [item.id]: e.target.value,
                                      })
                                    }
                                    style={{
                                      ...styles.input,
                                      marginBottom: 10,
                                      padding: "10px 12px",
                                    }}
                                  >
                                    <option value="">
                                      Pilih alur tujuan
                                    </option>

                                    {flows.map((flow) => (
                                      <option
                                        key={flow.id}
                                        value={flow.id}
                                      >
                                        {flow.name}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    onClick={() => {
                                      const target =
                                        copyTargetFlow[item.id];

                                      if (!target) {
                                        return alert(
                                          "Pilih alur tujuan dulu"
                                        );
                                      }

                                      duplicateTrigger(
                                        item,
                                        Number(target)
                                      );
                                    }}
                                    className="green-btn"
                                    style={{
                                      ...styles.button,
                                      width: "100%",
                                      padding: "10px 12px",
                                    }}
                                  >
                                    Salin Trigger
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  {triggers.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ color: "#9ca3af" }}>
                        Belum ada trigger di alur ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          main > div {
            grid-template-columns: 1fr !important;
          }

          aside {
            position: relative !important;
            top: auto !important;
            height: auto !important;
          }
        }

        @media (max-width: 760px) {
          main {
            padding: 16px !important;
          }

          section > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
