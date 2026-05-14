"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabase";

const WA_ENGINE_URL = "https://wa-engine-production-8ebe.up.railway.app";

export default function Home() {
  const [flows, setFlows] = useState([]);
  const [allTriggers, setAllTriggers] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [templateSelectedFlow, setTemplateSelectedFlow] = useState(null);

  const [newFlowName, setNewFlowName] = useState("");
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [editingFlowName, setEditingFlowName] = useState("");

  const [copyTargetFlow, setCopyTargetFlow] = useState({});
  const [copyingTriggerId, setCopyingTriggerId] = useState(null);

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

  const [activeMenu, setActiveMenu] = useState("perangkat");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [uploadingCount, setUploadingCount] = useState(0);
  const [editUploadingCount, setEditUploadingCount] = useState(0);

  const [waStatus, setWaStatus] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [showQr, setShowQr] = useState(false);

  const uploading = uploadingCount > 0;
  const editUploading = editUploadingCount > 0;

  const selectedFlowTriggers = useMemo(() => {
    if (!selectedFlow?.id) return [];
    return allTriggers.filter((item) => item.flow_id === selectedFlow.id);
  }, [allTriggers, selectedFlow]);

  const totalActiveTriggers = useMemo(
    () => allTriggers.filter((item) => item.active).length,
    [allTriggers]
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

  function getResponseParts(value) {
    return splitResponses(value);
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
      return [{ type: "image", url: item.image }];
    }

    return [];
  }

  function getMediaSummary(item) {
    const list = getMediaFromItem(item);
    const imageCount = list.filter((m) => m.type !== "video").length;
    const videoCount = list.filter((m) => m.type === "video").length;

    if (imageCount > 0 && videoCount > 0) return `${imageCount} foto · ${videoCount} video`;
    if (imageCount > 0) return `${imageCount} foto`;
    if (videoCount > 0) return `${videoCount} video`;
    return "Tanpa media";
  }

  async function getFlows() {
    const { data } = await supabase
      .from("flows")
      .select("*")
      .order("id", { ascending: false });

    const flowData = data || [];
    setFlows(flowData);

    if (!selectedFlow && flowData.length > 0) {
      setSelectedFlow(flowData[0]);
    }
  }

  async function getAllTriggers() {
    const { data } = await supabase
      .from("triggers")
      .select("*")
      .order("id", { ascending: false });

    setAllTriggers(data || []);
  }

  async function refreshAll() {
    await getFlows();
    await getAllTriggers();
  }

  async function addFlow() {
    if (!newFlowName) return alert("Isi nama alur");

    await supabase.from("flows").insert([{ name: newFlowName }]);

    setNewFlowName("");
    refreshAll();
  }

  async function updateFlowName(id) {
    if (!editingFlowName) return alert("Nama alur tidak boleh kosong");

    await supabase.from("flows").update({ name: editingFlowName }).eq("id", id);

    if (selectedFlow?.id === id) {
      setSelectedFlow({ ...selectedFlow, name: editingFlowName });
    }

    setEditingFlowId(null);
    setEditingFlowName("");
    refreshAll();
  }

  async function deleteFlow(id) {
    const ok = confirm("Yakin hapus alur? Semua trigger di alur ini ikut terhapus.");
    if (!ok) return;

    await supabase.from("triggers").delete().eq("flow_id", id);
    await supabase.from("flows").delete().eq("id", id);

    if (selectedFlow?.id === id) {
      setSelectedFlow(null);
    }

    if (templateSelectedFlow?.id === id) {
      setTemplateSelectedFlow(null);
    }

    refreshAll();
  }

  function selectFlow(flow) {
    setSelectedFlow(flow);
    setShowCreateForm(false);
    setEditingTriggerId(null);
    setCopyingTriggerId(null);
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
    setShowQr(true);
    setTimeout(getWaStatus, 2000);
  }

  async function logoutWa() {
    const ok = confirm("Nonaktifkan / logout WhatsApp?");
    if (!ok) return;

    await fetch(`${WA_ENGINE_URL}/logout?t=${Date.now()}`);
    setShowQr(false);
    setTimeout(getWaStatus, 2000);
  }

  useEffect(() => {
    refreshAll();
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
    setShowCreateForm(false);
    setUploadingCount(0);

    getAllTriggers();
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

    getAllTriggers();
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

      await getAllTriggers();

      if (data) {
        const targetFlowData = flows.find((flow) => flow.id === targetFlow);
        if (targetFlowData) setSelectedFlow(targetFlowData);
        startEditTrigger(data);
      }

      alert("Trigger berhasil disalin");
    } catch (err) {
      alert("Gagal duplicate: " + err.message);
    }
  }

  async function toggleStatus(id, current) {
    await supabase.from("triggers").update({ active: !current }).eq("id", id);
    getAllTriggers();
  }

  async function deleteTrigger(id) {
    const ok = confirm("Yakin hapus trigger ini?");
    if (!ok) return;

    await supabase.from("triggers").delete().eq("id", id);
    getAllTriggers();
  }

  const styles = {
    page: {
      minHeight: "100vh",
      color: "white",
      padding: 24,
    },
    shell: {
      display: "grid",
      gridTemplateColumns: "240px minmax(0, 1fr)",
      gap: 22,
      maxWidth: 1480,
      margin: "0 auto",
    },
    sidebar: {
      position: "sticky",
      top: 24,
      height: "calc(100vh - 48px)",
      padding: 18,
      overflow: "auto",
    },
    logo: {
      width: 46,
      height: 46,
      borderRadius: 17,
      display: "grid",
      placeItems: "center",
      background: "linear-gradient(135deg, #00ff9d, #00b871)",
      color: "#001b12",
      fontWeight: 950,
      boxShadow: "0 0 28px rgba(0,255,157,0.28)",
    },
    muted: {
      color: "#8c929c",
    },
    input: {
      width: "100%",
      background: "rgba(255,255,255,0.055)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "white",
      borderRadius: 15,
      padding: "13px 14px",
      outline: "none",
    },
    textarea: {
      width: "100%",
      minHeight: 90,
      resize: "vertical",
      background: "rgba(255,255,255,0.055)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "white",
      borderRadius: 15,
      padding: 14,
      outline: "none",
      lineHeight: 1.6,
    },
    button: {
      border: "none",
      borderRadius: 14,
      padding: "11px 14px",
      cursor: "pointer",
      fontWeight: 800,
    },
    ghostButton: {
      background: "rgba(255,255,255,0.065)",
      color: "white",
      border: "1px solid rgba(255,255,255,0.08)",
    },
    dangerButton: {
      background: "rgba(255,77,103,0.14)",
      color: "#ff7b90",
      border: "1px solid rgba(255,77,103,0.24)",
    },
    section: {
      padding: 24,
      marginBottom: 22,
    },
    label: {
      display: "block",
      fontSize: 13,
      color: "#8c929c",
      marginBottom: 8,
      fontWeight: 800,
    },
    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "7px 12px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 850,
    },
  };

  function SidebarButton({ id, label, icon }) {
    const active = activeMenu === id;

    return (
      <button
        onClick={() => {
          setActiveMenu(id);
          if (id === "template") {
            setTemplateSelectedFlow(null);
            setShowCreateForm(false);
            setEditingTriggerId(null);
          }
        }}
        className="sidebar-item"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "13px 14px",
          borderRadius: 16,
          marginBottom: 10,
          cursor: "pointer",
          color: active ? "#00ff9d" : "white",
          background: active
            ? "linear-gradient(135deg, rgba(0,255,157,0.16), rgba(255,255,255,0.045))"
            : "rgba(255,255,255,0.035)",
          border: active
            ? "1px solid rgba(0,255,157,0.26)"
            : "1px solid rgba(255,255,255,0.055)",
          textAlign: "left",
          fontWeight: 850,
        }}
      >
        <span style={{ width: 22, textAlign: "center" }}>{icon}</span>
        {label}
      </button>
    );
  }

  function Header({ title, description }) {
    return (
      <div
        className="glass-card"
        style={{
          ...styles.section,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 18,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(0,255,157,0.035))",
        }}
      >
        <div>
          <p
            style={{
              color: "#00ff9d",
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: 1.8,
              marginBottom: 9,
            }}
          >
            NEXIS
          </p>
          <h1
            style={{
              fontSize: 38,
              letterSpacing: -1.6,
              marginBottom: 8,
              lineHeight: 1,
            }}
          >
            {title}
          </h1>
          <p style={{ ...styles.muted, lineHeight: 1.7 }}>{description}</p>
        </div>

        <span
          style={{
            ...styles.pill,
            background: waStatus ? "rgba(0,255,157,0.12)" : "rgba(255,77,103,0.12)",
            color: waStatus ? "#00ff9d" : "#ff7b90",
            border: waStatus
              ? "1px solid rgba(0,255,157,0.2)"
              : "1px solid rgba(255,77,103,0.2)",
          }}
        >
          ● {waStatus ? "Terhubung" : "Tidak Terhubung"}
        </span>
      </div>
    );
  }

  function DevicePage() {
    return (
      <>
        <Header
          title="Perangkat"
          description="Kelola koneksi WhatsApp, aktifkan/nonaktifkan device, dan tampilkan QR untuk scan."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            gap: 22,
          }}
        >
          <div className="glass-card" style={styles.section}>
            <div
              style={{
                padding: 22,
                borderRadius: 26,
                background:
                  "linear-gradient(135deg, rgba(0,255,157,0.10), rgba(255,255,255,0.035))",
                border: "1px solid rgba(0,255,157,0.14)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 18,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <p style={styles.muted}>Card Perangkat</p>
                  <h2 style={{ marginTop: 8, fontSize: 30, letterSpacing: -0.8 }}>
                    WhatsApp Utama
                  </h2>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    <span
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: 999,
                        background: waStatus ? "#00ff9d" : "#ff4d67",
                        boxShadow: waStatus
                          ? "0 0 18px rgba(0,255,157,0.75)"
                          : "0 0 18px rgba(255,77,103,0.75)",
                      }}
                    />
                    <b>{waStatus ? "Terhubung" : "Tidak Terhubung"}</b>
                  </div>

                  <p style={{ ...styles.muted, marginTop: 12, lineHeight: 1.7 }}>
                    Perangkat ini digunakan untuk menerima pesan masuk dan mengirim
                    auto reply dari template yang sudah dibuat.
                  </p>
                </div>

                <div
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 26,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(0,255,157,0.10)",
                    border: "1px solid rgba(0,255,157,0.16)",
                    fontSize: 32,
                  }}
                >
                  ☎
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
                {!waStatus ? (
                  <button onClick={connectWa} className="green-btn" style={styles.button}>
                    Aktifkan
                  </button>
                ) : (
                  <button onClick={logoutWa} style={{ ...styles.button, ...styles.dangerButton }}>
                    Nonaktifkan
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowQr(!showQr);
                    getWaStatus();
                  }}
                  style={{ ...styles.button, ...styles.ghostButton }}
                >
                  {showQr ? "Tutup QR" : "Scan QR"}
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card" style={styles.section}>
            <p style={styles.muted}>QR Scan</p>
            <h3 style={{ marginTop: 8 }}>Barcode Perangkat</h3>

            {showQr && !waStatus && qrData ? (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 24,
                  background: "rgba(255,255,255,0.07)",
                }}
              >
                <img
                  src={qrData}
                  alt="QR"
                  style={{ width: "100%", borderRadius: 18, display: "block" }}
                />
              </div>
            ) : (
              <div
                style={{
                  marginTop: 18,
                  minHeight: 280,
                  borderRadius: 24,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  padding: 24,
                  background: "rgba(255,255,255,0.035)",
                  border: "1px dashed rgba(255,255,255,0.12)",
                }}
              >
                <div>
                  <p style={{ fontSize: 34, marginBottom: 12 }}>▦</p>
                  <p style={styles.muted}>
                    QR akan muncul setelah tombol Scan QR ditekan dan WhatsApp belum terhubung.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  function FlowCard({ flow }) {
    const flowTriggers = allTriggers.filter((item) => item.flow_id === flow.id);
    const isSelected = selectedFlow?.id === flow.id;

    return (
      <div
        style={{
          borderRadius: 28,
          background: isSelected
            ? "linear-gradient(135deg, rgba(0,255,157,0.13), rgba(255,255,255,0.04))"
            : "rgba(255,255,255,0.035)",
          border: isSelected
            ? "1px solid rgba(0,255,157,0.22)"
            : "1px solid rgba(255,255,255,0.07)",
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div>
            {editingFlowId === flow.id ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={editingFlowName}
                  onChange={(e) => setEditingFlowName(e.target.value)}
                  style={{ ...styles.input, minWidth: 240 }}
                />
                <button
                  onClick={() => updateFlowName(flow.id)}
                  className="green-btn"
                  style={styles.button}
                >
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setEditingFlowId(null);
                    setEditingFlowName("");
                  }}
                  style={{ ...styles.button, ...styles.ghostButton }}
                >
                  Batal
                </button>
              </div>
            ) : (
              <>
                <p style={styles.muted}>Template Alur</p>
                <h2 style={{ marginTop: 7, fontSize: 26, letterSpacing: -0.7 }}>
                  {flow.name}
                </h2>
                <p style={{ ...styles.muted, marginTop: 7 }}>
                  {flowTriggers.length} trigger tersimpan
                </p>
              </>
            )}
          </div>

          {editingFlowId !== flow.id && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  selectFlow(flow);
                  setShowCreateForm(!showCreateForm || selectedFlow?.id !== flow.id);
                }}
                className="green-btn"
                style={styles.button}
              >
                + Trigger
              </button>

              <button
                onClick={() => {
                  setEditingFlowId(flow.id);
                  setEditingFlowName(flow.name);
                }}
                style={{ ...styles.button, ...styles.ghostButton }}
              >
                Edit Alur
              </button>

              <button
                onClick={() => deleteFlow(flow.id)}
                style={{ ...styles.button, ...styles.dangerButton }}
              >
                Hapus
              </button>
            </div>
          )}
        </div>

        {showCreateForm && selectedFlow?.id === flow.id && (
          <div style={{ marginBottom: 18 }}>
            <CreateTriggerBox />
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          {flowTriggers.map((trigger) => (
            <TriggerCard key={trigger.id} item={trigger} />
          ))}

          {flowTriggers.length === 0 && (
            <div
              style={{
                padding: 22,
                borderRadius: 22,
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.1)",
                color: "#8c929c",
              }}
            >
              Belum ada trigger di alur ini.
            </div>
          )}
        </div>
      </div>
    );
  }

  function CreateTriggerBox() {
    return (
      <div
        style={{
          padding: 18,
          borderRadius: 24,
          background: "rgba(0,0,0,0.20)",
          border: "1px solid rgba(0,255,157,0.14)",
        }}
      >
        <h3>Tambah Trigger</h3>
        <p style={{ ...styles.muted, marginTop: 6, marginBottom: 16 }}>
          Trigger akan masuk ke alur: <b style={{ color: "white" }}>{selectedFlow?.name}</b>
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
          <div>
            <label style={styles.label}>Keyword</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Contoh: harga, cod, ongkir"
              style={{ ...styles.input, marginBottom: 14 }}
            />

            <label style={styles.label}>Jawaban</label>
            {responseList.map((item, index) => (
              <div key={index} style={{ marginBottom: 10 }}>
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
                      const updated = responseList.filter((_, i) => i !== index);
                      setResponseList(updated);
                      setResponse(joinResponses(updated));
                    }}
                    style={{
                      ...styles.button,
                      ...styles.dangerButton,
                      marginTop: 7,
                      padding: "8px 11px",
                    }}
                  >
                    Hapus Jawaban
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setResponseList([...responseList, ""])}
              style={{ ...styles.button, ...styles.ghostButton }}
            >
              + Tambah Jawaban
            </button>
          </div>

          <div>
            <label style={styles.label}>Jenis Trigger</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ ...styles.input, marginBottom: 14 }}
            >
              <option>Mengandung</option>
              <option>Sama Persis</option>
            </select>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: 14,
                borderRadius: 16,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 14,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={isFlowEntry}
                onChange={(e) => setIsFlowEntry(e.target.checked)}
              />
              <span>Masuk / pindah alur</span>
            </label>

            <label style={styles.label}>Foto / Video</label>
            <label
              style={{
                display: "block",
                padding: 16,
                borderRadius: 18,
                border: "1px dashed rgba(0,255,157,0.32)",
                background: "rgba(0,255,157,0.055)",
                textAlign: "center",
                cursor: "pointer",
                marginBottom: 12,
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
              <b>Upload Media</b>
              <p style={{ ...styles.muted, fontSize: 13, marginTop: 5 }}>
                Foto/video akan tampil di trigger card
              </p>
            </label>

            {uploading && (
              <p style={{ color: "#00ff9d", marginBottom: 10 }}>
                Upload media... {uploadingCount} file
              </p>
            )}

            {media.length > 0 && <MediaGrid items={media} onRemove={removeMedia} />}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={addTrigger}
            disabled={uploading}
            className={!uploading ? "green-btn" : ""}
            style={{
              ...styles.button,
              opacity: uploading ? 0.5 : 1,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            Simpan Trigger
          </button>

          <button
            onClick={() => setShowCreateForm(false)}
            style={{ ...styles.button, ...styles.ghostButton }}
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  function MediaGrid({ items, onRemove }) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              padding: 8,
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
                  marginBottom: 7,
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
                  marginBottom: 7,
                }}
              />
            )}

            {onRemove && (
              <button
                onClick={() => onRemove(index)}
                style={{
                  ...styles.button,
                  ...styles.dangerButton,
                  width: "100%",
                  padding: "8px 10px",
                }}
              >
                Hapus
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  function MediaPreview({ item }) {
    const itemMedia = getMediaFromItem(item);

    if (itemMedia.length === 0) {
      return null;
    }

    return (
      <div style={{ marginTop: 14 }}>
        <p style={{ ...styles.muted, fontSize: 13, marginBottom: 8 }}>
          Media: {getMediaSummary(item)}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: itemMedia.length === 1 ? "minmax(0, 220px)" : "repeat(2, minmax(0, 160px))",
            gap: 10,
          }}
        >
          {itemMedia.slice(0, 4).map((mediaItem, mediaIndex) => (
            <div
              key={mediaIndex}
              style={{
                position: "relative",
                height: itemMedia.length === 1 ? 145 : 105,
                borderRadius: 18,
                overflow: "hidden",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
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
                      fontWeight: 850,
                      background: "rgba(0,0,0,0.62)",
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

              {mediaIndex === 3 && itemMedia.length > 4 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(0,0,0,0.58)",
                    fontWeight: 950,
                  }}
                >
                  +{itemMedia.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function TriggerCard({ item }) {
    const answers = getResponseParts(item.response);

    if (editingTriggerId === item.id) {
      return <EditTriggerCard item={item} />;
    }

    return (
      <div
        style={{
          padding: 18,
          borderRadius: 24,
          background: "rgba(255,255,255,0.045)",
          border: "1px solid rgba(255,255,255,0.075)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            alignItems: "flex-start",
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 9 }}>
              <span
                style={{
                  ...styles.pill,
                  background: item.active
                    ? "rgba(0,255,157,0.12)"
                    : "rgba(255,77,103,0.12)",
                  color: item.active ? "#00ff9d" : "#ff7b90",
                }}
              >
                ● {item.active ? "Aktif" : "Nonaktif"}
              </span>

              <span
                style={{
                  ...styles.pill,
                  background: "rgba(255,255,255,0.06)",
                  color: "#d1d5db",
                }}
              >
                {item.is_flow_entry ? "Masuk/Pindah Alur" : item.type}
              </span>

              <span
                style={{
                  ...styles.pill,
                  background: "rgba(255,255,255,0.06)",
                  color: "#d1d5db",
                }}
              >
                {answers.length} Jawaban
              </span>
            </div>

            <h3 style={{ fontSize: 22, letterSpacing: -0.5 }}>{item.keyword}</h3>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {answers.length > 0 ? (
            answers.map((answer, index) => (
              <div
                key={index}
                style={{
                  padding: 14,
                  borderRadius: 18,
                  background: "rgba(0,0,0,0.20)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p
                  style={{
                    color: "#00ff9d",
                    fontSize: 12,
                    fontWeight: 850,
                    marginBottom: 6,
                  }}
                >
                  Jawaban {index + 1}:
                </p>
                <p style={{ color: "#e5e7eb", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {answer}
                </p>
              </div>
            ))
          ) : (
            <p style={styles.muted}>Tidak ada teks jawaban.</p>
          )}
        </div>

        <MediaPreview item={item} />

        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 16 }}>
          <button
            onClick={() => startEditTrigger(item)}
            style={{ ...styles.button, ...styles.ghostButton, padding: "9px 12px" }}
          >
            Edit
          </button>

          <button
            onClick={() => duplicateTrigger(item)}
            style={{
              ...styles.button,
              background: "rgba(0,255,157,0.12)",
              color: "#00ff9d",
              border: "1px solid rgba(0,255,157,0.18)",
              padding: "9px 12px",
            }}
          >
            Salin
          </button>

          <button
            onClick={() =>
              setCopyingTriggerId(copyingTriggerId === item.id ? null : item.id)
            }
            style={{ ...styles.button, ...styles.ghostButton, padding: "9px 12px" }}
          >
            Salin ke Alur
          </button>

          <button
            onClick={() => toggleStatus(item.id, item.active)}
            style={{ ...styles.button, ...styles.ghostButton, padding: "9px 12px" }}
          >
            {item.active ? "Nonaktifkan" : "Aktifkan"}
          </button>

          <button
            onClick={() => deleteTrigger(item.id)}
            style={{ ...styles.button, ...styles.dangerButton, padding: "9px 12px" }}
          >
            Hapus
          </button>

          {copyingTriggerId === item.id && (
            <div
              style={{
                width: "100%",
                marginTop: 8,
                padding: 13,
                borderRadius: 18,
                background: "rgba(255,255,255,0.055)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <label style={styles.label}>Salin ke alur</label>
              <select
                value={copyTargetFlow[item.id] || ""}
                onChange={(e) =>
                  setCopyTargetFlow({
                    ...copyTargetFlow,
                    [item.id]: e.target.value,
                  })
                }
                style={{ ...styles.input, marginBottom: 10 }}
              >
                <option value="">Pilih alur tujuan</option>
                {flows.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  const target = copyTargetFlow[item.id];
                  if (!target) return alert("Pilih alur tujuan dulu");
                  duplicateTrigger(item, Number(target));
                }}
                className="green-btn"
                style={{ ...styles.button, width: "100%" }}
              >
                Salin Trigger
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function EditTriggerCard({ item }) {
    return (
      <div
        style={{
          padding: 18,
          borderRadius: 24,
          background: "rgba(0,255,157,0.06)",
          border: "1px solid rgba(0,255,157,0.16)",
        }}
      >
        <h3 style={{ marginBottom: 14 }}>Edit Trigger</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16 }}>
          <div>
            <label style={styles.label}>Keyword</label>
            <input
              value={editKeyword}
              onChange={(e) => setEditKeyword(e.target.value)}
              style={{ ...styles.input, marginBottom: 14 }}
            />

            <label style={styles.label}>Jawaban</label>
            {editResponseList.map((answer, index) => (
              <div key={index} style={{ marginBottom: 10 }}>
                <textarea
                  value={answer}
                  onChange={(e) => {
                    const updated = [...editResponseList];
                    updated[index] = e.target.value;
                    setEditResponseList(updated);
                    setEditResponse(joinResponses(updated));
                  }}
                  placeholder={`Jawaban ${index + 1}`}
                  style={styles.textarea}
                />

                {editResponseList.length > 1 && (
                  <button
                    onClick={() => {
                      const updated = editResponseList.filter((_, i) => i !== index);
                      setEditResponseList(updated);
                      setEditResponse(joinResponses(updated));
                    }}
                    style={{
                      ...styles.button,
                      ...styles.dangerButton,
                      marginTop: 7,
                      padding: "8px 11px",
                    }}
                  >
                    Hapus Jawaban
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setEditResponseList([...editResponseList, ""])}
              style={{ ...styles.button, ...styles.ghostButton }}
            >
              + Tambah Jawaban
            </button>
          </div>

          <div>
            <label style={styles.label}>Jenis Trigger</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              style={{ ...styles.input, marginBottom: 14 }}
            >
              <option>Mengandung</option>
              <option>Sama Persis</option>
            </select>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: 14,
                borderRadius: 16,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 14,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={editIsFlowEntry}
                onChange={(e) => setEditIsFlowEntry(e.target.checked)}
              />
              <span>Masuk / pindah alur</span>
            </label>

            <label style={styles.label}>Foto / Video</label>
            <label
              style={{
                display: "block",
                padding: 16,
                borderRadius: 18,
                border: "1px dashed rgba(0,255,157,0.32)",
                background: "rgba(0,255,157,0.055)",
                textAlign: "center",
                cursor: "pointer",
                marginBottom: 12,
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
              <b>Upload Media</b>
            </label>

            {editUploading && (
              <p style={{ color: "#00ff9d", marginBottom: 10 }}>
                Upload... {editUploadingCount} file
              </p>
            )}

            {editMedia.length > 0 && <MediaGrid items={editMedia} onRemove={removeEditMedia} />}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={() => saveEditTrigger(item.id)}
            disabled={editUploading}
            className={!editUploading ? "green-btn" : ""}
            style={{
              ...styles.button,
              opacity: editUploading ? 0.5 : 1,
              cursor: editUploading ? "not-allowed" : "pointer",
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
            style={{ ...styles.button, ...styles.ghostButton }}
          >
            Batal
          </button>
        </div>
      </div>
    );
  }


  function TemplatePage() {
    if (templateSelectedFlow) {
      const flowTriggers = allTriggers.filter(
        (item) => item.flow_id === templateSelectedFlow.id
      );

      return (
        <>
          <Header
            title={templateSelectedFlow.name}
            description="Detail alur yang berisi semua trigger, jawaban, dan media yang sudah dibuat."
          />

          <div className="glass-card" style={styles.section}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <button
                  onClick={() => {
                    setTemplateSelectedFlow(null);
                    setShowCreateForm(false);
                    setEditingTriggerId(null);
                  }}
                  style={{
                    ...styles.button,
                    ...styles.ghostButton,
                    marginBottom: 14,
                    padding: "9px 13px",
                  }}
                >
                  ← Kembali ke Daftar Alur
                </button>

                <p style={styles.muted}>Detail Alur</p>
                <h2 style={{ marginTop: 7, fontSize: 30, letterSpacing: -0.8 }}>
                  {templateSelectedFlow.name}
                </h2>
                <p style={{ ...styles.muted, marginTop: 8 }}>
                  {flowTriggers.length} trigger tersimpan di alur ini.
                </p>
              </div>

              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setSelectedFlow(templateSelectedFlow);
                    setShowCreateForm(!showCreateForm);
                  }}
                  className="green-btn"
                  style={styles.button}
                >
                  + Tambah Trigger
                </button>

                <button
                  onClick={() => {
                    setEditingFlowId(templateSelectedFlow.id);
                    setEditingFlowName(templateSelectedFlow.name);
                  }}
                  style={{ ...styles.button, ...styles.ghostButton }}
                >
                  Edit Alur
                </button>

                <button
                  onClick={() => deleteFlow(templateSelectedFlow.id)}
                  style={{ ...styles.button, ...styles.dangerButton }}
                >
                  Hapus Alur
                </button>
              </div>
            </div>

            {editingFlowId === templateSelectedFlow.id && (
              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <label style={styles.label}>Nama Alur</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    value={editingFlowName}
                    onChange={(e) => setEditingFlowName(e.target.value)}
                    style={{ ...styles.input, flex: 1, minWidth: 240 }}
                  />
                  <button
                    onClick={() => updateFlowName(templateSelectedFlow.id)}
                    className="green-btn"
                    style={styles.button}
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => {
                      setEditingFlowId(null);
                      setEditingFlowName("");
                    }}
                    style={{ ...styles.button, ...styles.ghostButton }}
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          {showCreateForm && selectedFlow?.id === templateSelectedFlow.id && (
            <div className="glass-card" style={styles.section}>
              <CreateTriggerBox />
            </div>
          )}

          <div style={{ display: "grid", gap: 14 }}>
            {flowTriggers.map((trigger) => (
              <TriggerCard key={trigger.id} item={trigger} />
            ))}

            {flowTriggers.length === 0 && (
              <div className="glass-card" style={styles.section}>
                <p style={styles.muted}>
                  Belum ada trigger di alur ini. Klik tombol + Tambah Trigger untuk membuat.
                </p>
              </div>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        <Header
          title="Template"
          description="Pilih salah satu alur terlebih dahulu untuk melihat trigger di dalamnya."
        />

        <div className="glass-card" style={styles.section}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 14,
              alignItems: "end",
              marginBottom: 22,
            }}
          >
            <div>
              <label style={styles.label}>Tambah Alur</label>
              <input
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
                placeholder="Contoh: Produk Tas, Produk Lampu, Promo"
                style={styles.input}
              />
            </div>

            <button onClick={addFlow} className="green-btn" style={styles.button}>
              + Tambah Alur
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <MiniStat label="Total Alur" value={flows.length} />
            <MiniStat label="Total Trigger" value={allTriggers.length} />
            <MiniStat label="Aktif" value={totalActiveTriggers} />
            <MiniStat label="Status" value="Siap Digunakan" />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {flows.map((flow) => {
            const flowTriggers = allTriggers.filter((item) => item.flow_id === flow.id);
            const activeCount = flowTriggers.filter((item) => item.active).length;
            const mediaCount = flowTriggers.filter(
              (item) => getMediaFromItem(item).length > 0
            ).length;

            return (
              <button
                key={flow.id}
                onClick={() => {
                  setTemplateSelectedFlow(flow);
                  setSelectedFlow(flow);
                  setShowCreateForm(false);
                  setEditingTriggerId(null);
                }}
                className="glass-card sidebar-item"
                style={{
                  textAlign: "left",
                  padding: 22,
                  cursor: "pointer",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.075)",
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))",
                }}
              >
                <p style={styles.muted}>Alur Template</p>
                <h2
                  style={{
                    marginTop: 9,
                    fontSize: 25,
                    letterSpacing: -0.7,
                    lineHeight: 1.15,
                  }}
                >
                  {flow.name}
                </h2>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 16,
                  }}
                >
                  <span
                    style={{
                      ...styles.pill,
                      background: "rgba(0,255,157,0.11)",
                      color: "#00ff9d",
                    }}
                  >
                    {flowTriggers.length} Trigger
                  </span>

                  <span
                    style={{
                      ...styles.pill,
                      background: "rgba(255,255,255,0.06)",
                      color: "#d1d5db",
                    }}
                  >
                    {activeCount} Aktif
                  </span>

                  <span
                    style={{
                      ...styles.pill,
                      background: "rgba(255,255,255,0.06)",
                      color: "#d1d5db",
                    }}
                  >
                    {mediaCount} Media
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    paddingTop: 16,
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    color: "#9ca3af",
                    fontWeight: 800,
                  }}
                >
                  Buka Alur →
                </div>
              </button>
            );
          })}

          {flows.length === 0 && (
            <div className="glass-card" style={styles.section}>
              <p style={styles.muted}>Belum ada alur. Tambahkan alur terlebih dahulu.</p>
            </div>
          )}
        </div>
      </>
    );
  }

  function MiniStat({ label, value }) {
    return (
      <div
        style={{
          padding: 16,
          borderRadius: 20,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <p style={{ ...styles.muted, fontSize: 13 }}>{label}</p>
        <h3 style={{ marginTop: 7, overflow: "hidden", textOverflow: "ellipsis" }}>
          {value}
        </h3>
      </div>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <aside className="glass-card" style={styles.sidebar}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              paddingBottom: 18,
              borderBottom: "1px solid rgba(255,255,255,0.065)",
              marginBottom: 18,
            }}
          >
            <div style={styles.logo}>N</div>
            <div>
              <h2 style={{ fontSize: 22, letterSpacing: -0.7 }}>NEXIS</h2>
              <p style={{ ...styles.muted, fontSize: 12, marginTop: 4 }}>
                Automation Suite
              </p>
            </div>
          </div>

          <SidebarButton id="perangkat" label="Perangkat" icon="●" />
          <SidebarButton id="template" label="Template" icon="▦" />

          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 20,
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p style={{ ...styles.muted, fontSize: 12, marginBottom: 7 }}>
              Status
            </p>
            <b style={{ color: waStatus ? "#00ff9d" : "#ff7b90" }}>
              {waStatus ? "WhatsApp Terhubung" : "WhatsApp Tidak Terhubung"}
            </b>
          </div>
        </aside>

        <section>
          {activeMenu === "perangkat" ? <DevicePage /> : <TemplatePage />}
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

          section > div,
          section div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 720px) {
          main {
            padding: 14px !important;
          }
        }
      `}</style>
    </main>
  );
}
