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

  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [editUploadingCount, setEditUploadingCount] = useState(0);
  const [waStatus, setWaStatus] = useState(null);
  const [qrData, setQrData] = useState(null);

  const uploading = uploadingCount > 0;
  const editUploading = editUploadingCount > 0;

  const activeTriggers = useMemo(() => triggers.filter((x) => x.active).length, [triggers]);
  const flowEntryCount = useMemo(() => triggers.filter((x) => x.is_flow_entry).length, [triggers]);
  const mediaTriggerCount = useMemo(() => triggers.filter((x) => getMediaFromItem(x).length > 0).length, [triggers]);

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
    if (Array.isArray(item?.media)) return item.media.filter((m) => m?.url);

    if (typeof item?.media === "string") {
      try {
        const parsed = JSON.parse(item.media);
        if (Array.isArray(parsed)) return parsed.filter((m) => m?.url);
      } catch {}
    }

    if (item?.image) return [{ type: "image", url: item.image }];
    return [];
  }

  function getMediaSummary(item) {
    const list = getMediaFromItem(item);
    const images = list.filter((m) => m.type !== "video").length;
    const videos = list.filter((m) => m.type === "video").length;
    if (images && videos) return `${images} foto · ${videos} video`;
    if (images) return `${images} foto`;
    if (videos) return `${videos} video`;
    return "Tanpa media";
  }

  async function getFlows() {
    const { data } = await supabase.from("flows").select("*").order("id", { ascending: false });
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
    if (selectedFlow?.id === id) setSelectedFlow({ ...selectedFlow, name: editingFlowName });
    setEditingFlowId(null);
    setEditingFlowName("");
    getFlows();
  }

  async function deleteFlow(id) {
    const ok = confirm("Yakin hapus alur? Semua trigger di alur ini ikut terhapus.");
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
    setCopyingTriggerId(null);
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
      setQrData(data.connected ? null : data.qr);
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
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || "Server tidak mengembalikan JSON");
      }
      if (!res.ok || !data.success) throw new Error(data.message || "Upload gagal");
      const url = data.url || data.image;
      setMedia((prev) => [...prev, { type: data.type || (file.type.startsWith("video/") ? "video" : "image"), url }]);
      if (data.type === "image" && !image) setImage(url);
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
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || "Server tidak mengembalikan JSON");
      }
      if (!res.ok || !data.success) throw new Error(data.message || "Upload gagal");
      const url = data.url || data.image;
      setEditMedia((prev) => [...prev, { type: data.type || (file.type.startsWith("video/") ? "video" : "image"), url }]);
      if (data.type === "image" && !editImage) setEditImage(url);
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
    if (uploading) return alert("Tunggu upload selesai dulu");
    const finalResponse = joinResponses(responseList);
    if (!keyword || (!finalResponse && media.length === 0)) return alert("Isi keyword dan respon/foto/video");
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
    setActiveMenu("triggers");
    getTriggers(selectedFlow.id);
  }

  function startEditTrigger(item) {
    const itemMedia = getMediaFromItem(item);
    const firstImage = itemMedia.find((m) => m.type === "image");
    setActiveMenu("triggers");
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
    if (editUploading) return alert("Tunggu upload selesai dulu");
    const finalEditResponse = joinResponses(editResponseList);
    if (!editKeyword || (!finalEditResponse && editMedia.length === 0)) return alert("Keyword dan respon/foto/video tidak boleh kosong");
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
      const { data, error } = await supabase.from("triggers").insert([payload]).select().single();
      if (error) return alert(error.message || "Gagal copy trigger");
      if (targetFlow === selectedFlow?.id) await getTriggers();
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
    page: { minHeight: "100vh", padding: 22, color: "white" },
    shell: { display: "grid", gridTemplateColumns: "310px minmax(0, 1fr)", gap: 22, maxWidth: 1540, margin: "0 auto" },
    sidebar: { position: "sticky", top: 22, height: "calc(100vh - 44px)", padding: 18, overflow: "auto" },
    brand: { display: "flex", alignItems: "center", gap: 12, padding: "8px 6px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 },
    logo: { width: 46, height: 46, borderRadius: 16, display: "grid", placeItems: "center", background: "linear-gradient(135deg, rgba(0,255,157,1), rgba(0,199,123,0.85))", color: "#001b12", fontWeight: 950, boxShadow: "0 0 32px rgba(0,255,157,0.32)" },
    muted: { color: "#9ca3af" },
    input: { width: "100%", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: 15, padding: "13px 14px", outline: "none" },
    button: { border: "none", borderRadius: 14, padding: "11px 14px", cursor: "pointer", fontWeight: 800 },
    ghostButton: { background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.08)" },
    dangerButton: { background: "rgba(255,77,103,0.14)", color: "#ff7b90", border: "1px solid rgba(255,77,103,0.24)" },
    navTitle: { fontSize: 11, color: "#6b7280", letterSpacing: 1.2, fontWeight: 900, margin: "18px 8px 10px" },
    navItem: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 13px", borderRadius: 16, color: "white", cursor: "pointer", textAlign: "left", marginBottom: 8 },
    navSubItem: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px 10px 24px", borderRadius: 15, color: "#d1d5db", cursor: "pointer", textAlign: "left", marginBottom: 7, fontSize: 13 },
    main: { minWidth: 0 },
    topbar: { padding: 25, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, background: "linear-gradient(135deg, rgba(255,255,255,0.07), rgba(0,255,157,0.04))" },
    heroBrand: { fontSize: 54, lineHeight: 0.95, letterSpacing: -3, fontWeight: 950, marginBottom: 10, background: "linear-gradient(135deg, #ffffff 10%, #00ff9d 52%, #6fffd0 92%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "0 0 34px rgba(0,255,157,0.16)" },
    title: { fontSize: 21, letterSpacing: -0.4, marginBottom: 6, color: "#d1d5db", fontWeight: 700 },
    cardGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 15, marginBottom: 20 },
    statCard: { padding: 19, minHeight: 120, position: "relative", overflow: "hidden" },
    section: { padding: 22, marginBottom: 20 },
    formGrid: { display: "grid", gridTemplateColumns: "1.12fr 0.88fr", gap: 18 },
    label: { display: "block", fontSize: 13, color: "#9ca3af", marginBottom: 8, fontWeight: 750 },
    textarea: { width: "100%", minHeight: 96, resize: "vertical", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)", color: "white", borderRadius: 16, padding: 14, outline: "none" },
    pill: { display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 850 },
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "◆", count: flows.length },
    { id: "flows", label: "Flow Manager", icon: "◇", count: flows.length },
    { id: "triggers", label: "Trigger Library", icon: "✦", count: triggers.length },
    { id: "create", label: "Create Trigger", icon: "+", count: null },
    { id: "whatsapp", label: "WhatsApp", icon: "●", count: waStatus ? "ON" : "OFF" },
  ];

  function navButton(item, isSub = false) {
    const active = activeMenu === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveMenu(item.id);
          if (item.id === "create") setShowForm(true);
        }}
        className="sidebar-item"
        style={{
          ...(isSub ? styles.navSubItem : styles.navItem),
          background: active ? "linear-gradient(135deg, rgba(0,255,157,0.18), rgba(255,255,255,0.055))" : "rgba(255,255,255,0.035)",
          border: active ? "1px solid rgba(0,255,157,0.28)" : "1px solid rgba(255,255,255,0.055)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: active ? "#00ff9d" : "#7a7f87" }}>{item.icon}</span>
          <span>{item.label}</span>
        </span>
        {item.count !== null && item.count !== undefined && (
          <span style={{ fontSize: 11, color: active ? "#00ff9d" : "#9ca3af", background: active ? "rgba(0,255,157,0.12)" : "rgba(255,255,255,0.06)", padding: "4px 8px", borderRadius: 999 }}>{item.count}</span>
        )}
      </button>
    );
  }

  function Header() {
    const titleMap = {
      dashboard: "Dashboard Overview",
      flows: "Flow Manager",
      triggers: "Trigger Library",
      create: "Create Trigger",
      whatsapp: "WhatsApp Connection",
    };
    const descMap = {
      dashboard: "Ringkasan status automation, flow aktif, dan trigger terbaru.",
      flows: "Kelola semua alur di sidebar dan pilih flow kerja utama.",
      triggers: "Preview, edit, duplicate, copy flow, dan hapus trigger.",
      create: "Buat trigger baru dengan multi-jawaban, foto, dan video.",
      whatsapp: "Pantau koneksi WhatsApp dan scan QR jika dibutuhkan.",
    };

    return (
      <div className="glass-card" style={styles.topbar}>
        <div>
          <p style={{ color: "#00ff9d", fontSize: 12, fontWeight: 900, letterSpacing: 1.8, marginBottom: 10 }}>NEXIS COMMAND CENTER</p>
          <div style={styles.heroBrand}>NEXIS</div>
          <h1 style={styles.title}>{titleMap[activeMenu]}</h1>
          <p style={{ ...styles.muted, maxWidth: 660, lineHeight: 1.7 }}>{descMap[activeMenu]}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ ...styles.pill, background: waStatus ? "rgba(0,255,157,0.12)" : "rgba(255,77,103,0.12)", color: waStatus ? "#00ff9d" : "#ff7b90", border: waStatus ? "1px solid rgba(0,255,157,0.2)" : "1px solid rgba(255,77,103,0.2)" }}>● WA {waStatus ? "ONLINE" : "OFFLINE"}</span>
          <button onClick={() => { setActiveMenu("create"); setShowForm(true); }} disabled={!selectedFlow} className={selectedFlow ? "green-btn" : ""} style={{ ...styles.button, opacity: selectedFlow ? 1 : 0.45, cursor: selectedFlow ? "pointer" : "not-allowed", minWidth: 150 }}>+ Trigger</button>
        </div>
      </div>
    );
  }

  function Stats() {
    return (
      <div style={styles.cardGrid}>
        {[
          ["Total Flow", flows.length, "Alur automation tersedia"],
          ["Trigger", triggers.length, "Dalam alur terpilih"],
          ["Aktif", activeTriggers, "Siap membalas pelanggan"],
          ["Media", mediaTriggerCount, "Trigger dengan foto/video"],
        ].map((item) => (
          <div className="glass-card" style={styles.statCard} key={item[0]}>
            <p style={styles.muted}>{item[0]}</p>
            <h2 style={{ fontSize: 32, marginTop: 12 }}>{item[1]}</h2>
            <p style={{ ...styles.muted, marginTop: 10, fontSize: 13 }}>{item[2]}</p>
          </div>
        ))}
      </div>
    );
  }

  function SelectedFlowCard() {
    return (
      <div className="glass-card" style={{ ...styles.section, background: "linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
          <div>
            <p style={styles.muted}>Selected Flow</p>
            <h2 style={{ marginTop: 6, letterSpacing: -0.4 }}>{selectedFlow?.name || "Pilih alur terlebih dahulu"}</h2>
            <p style={{ ...styles.muted, marginTop: 8, fontSize: 14 }}>Semua trigger di kanan mengikuti flow yang sedang dipilih.</p>
          </div>
          <span style={{ ...styles.pill, background: "rgba(0,255,157,0.12)", color: "#00ff9d", border: "1px solid rgba(0,255,157,0.2)" }}>● {selectedFlow ? "LIVE FLOW" : "NO FLOW"}</span>
        </div>
      </div>
    );
  }

  function WhatsAppCard() {
    return (
      <div className="glass-card" style={styles.section}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start" }}>
          <div>
            <p style={styles.muted}>WhatsApp Status</p>
            <h2 style={{ marginTop: 8 }}>{waStatus ? "Terhubung" : "Belum Terhubung"}</h2>
            <p style={{ ...styles.muted, marginTop: 8, lineHeight: 1.7 }}>Gunakan koneksi ini untuk menjalankan auto reply secara real-time.</p>
          </div>
          <span style={{ width: 13, height: 13, borderRadius: 999, background: waStatus ? "#00ff9d" : "#ff4d67", boxShadow: waStatus ? "0 0 22px rgba(0,255,157,0.8)" : "0 0 22px rgba(255,77,103,0.8)", marginTop: 7 }} />
        </div>
        <button onClick={waStatus ? logoutWa : connectWa} className={waStatus ? "" : "green-btn"} style={{ ...styles.button, ...(waStatus ? styles.dangerButton : {}), marginTop: 18, minWidth: 190 }}>{waStatus ? "Logout WhatsApp" : "Hubungkan WhatsApp"}</button>
        {!waStatus && qrData && (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 22, background: "rgba(255,255,255,0.06)", maxWidth: 360 }}>
            <img src={qrData} alt="QR" style={{ width: "100%", borderRadius: 16, display: "block" }} />
          </div>
        )}
      </div>
    );
  }

  function CreateForm() {
    return (
      <div className="glass-card glow" style={styles.section}>
        <div style={{ marginBottom: 22 }}>
          <p style={{ color: "#00ff9d", fontSize: 12, fontWeight: 900, letterSpacing: 1.5, marginBottom: 8 }}>CREATE AUTOMATION</p>
          <h2>Tambah Trigger Baru</h2>
          <p style={{ ...styles.muted, marginTop: 8 }}>Buat keyword, multi balasan, dan lampirkan media jika diperlukan.</p>
        </div>
        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>Keyword</label>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Contoh: halo, harga, ongkir" style={{ ...styles.input, marginBottom: 16 }} />
            <label style={styles.label}>Multi Jawaban</label>
            {responseList.map((item, index) => (
              <div key={index} style={{ marginBottom: 12 }}>
                <textarea value={item} onChange={(e) => { const updated = [...responseList]; updated[index] = e.target.value; setResponseList(updated); setResponse(joinResponses(updated)); }} placeholder={`Jawaban ${index + 1}`} style={styles.textarea} />
                {responseList.length > 1 && <button onClick={() => { const updated = responseList.filter((_, i) => i !== index); setResponseList(updated); setResponse(joinResponses(updated)); }} style={{ ...styles.button, ...styles.dangerButton, marginTop: 8, padding: "9px 12px" }}>Hapus Jawaban</button>}
              </div>
            ))}
            <button onClick={() => setResponseList([...responseList, ""])} style={{ ...styles.button, ...styles.ghostButton, marginBottom: 16 }}>+ Tambah Jawaban</button>
          </div>
          <div>
            <label style={styles.label}>Tipe Trigger</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...styles.input, marginBottom: 16 }}>
              <option>Mengandung</option>
              <option>Sama Persis</option>
            </select>
            <label style={{ display: "flex", gap: 10, alignItems: "center", padding: 15, borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16, cursor: "pointer" }}>
              <input type="checkbox" checked={isFlowEntry} onChange={(e) => setIsFlowEntry(e.target.checked)} />
              <span>Jadikan trigger masuk/pindah alur</span>
            </label>
            <label style={styles.label}>Media</label>
            <label style={{ display: "block", padding: 18, borderRadius: 20, border: "1px dashed rgba(0,255,157,0.35)", background: "rgba(0,255,157,0.06)", cursor: "pointer", textAlign: "center", marginBottom: 14 }}>
              <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => { const files = Array.from(e.target.files || []); files.forEach((file) => uploadMedia(file)); e.target.value = ""; }} />
              <b>Upload Foto / Video</b>
              <p style={{ ...styles.muted, fontSize: 13, marginTop: 6 }}>Klik untuk pilih file media</p>
            </label>
            {uploading && <p style={{ color: "#00ff9d", marginBottom: 12 }}>Upload media... {uploadingCount} file sedang diproses</p>}
            {media.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {media.map((item, index) => (
                  <div key={index} style={{ padding: 10, borderRadius: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {item.type === "video" ? <video src={item.url} controls style={{ width: "100%", borderRadius: 12, display: "block", marginBottom: 8 }} /> : <img src={item.url} alt="Preview" style={{ width: "100%", borderRadius: 12, display: "block", marginBottom: 8 }} />}
                    <button onClick={() => removeMedia(index)} style={{ ...styles.button, ...styles.dangerButton, width: "100%", padding: "8px 10px" }}>Hapus</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <button onClick={addTrigger} disabled={uploading} className={!uploading ? "green-btn" : ""} style={{ ...styles.button, marginTop: 22, opacity: uploading ? 0.5 : 1, cursor: uploading ? "not-allowed" : "pointer", minWidth: 180 }}>Simpan Trigger</button>
      </div>
    );
  }

  function MediaPreview({ item }) {
    const list = getMediaFromItem(item);
    if (list.length === 0) return <span style={{ ...styles.pill, background: "rgba(255,255,255,0.055)", color: "#9ca3af" }}>Tanpa media</span>;
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: list.length === 1 ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8, maxWidth: 220 }}>
          {list.slice(0, 4).map((m, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", height: list.length === 1 ? 126 : 82 }}>
              {m.type === "video" ? <><video src={m.url} muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /><span style={{ position: "absolute", left: 8, bottom: 8, padding: "4px 8px", borderRadius: 999, fontSize: 11, fontWeight: 850, background: "rgba(0,0,0,0.58)", color: "white" }}>VIDEO</span></> : <img src={m.url} alt="Media Preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              {i === 3 && list.length > 4 && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.55)", fontWeight: 900 }}>+{list.length - 4}</div>}
            </div>
          ))}
        </div>
        <p style={{ ...styles.muted, marginTop: 8, fontSize: 12 }}>{getMediaSummary(item)}</p>
      </div>
    );
  }

  function TriggerLibrary() {
    return (
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "22px 22px 0", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div>
            <h2 style={{ letterSpacing: -0.5 }}>Trigger Library</h2>
            <p style={{ ...styles.muted, marginTop: 6 }}>Preview balasan, media, duplicate, dan copy trigger ke flow lain.</p>
          </div>
        </div>
        <div style={{ overflowX: "auto", padding: 22 }}>
          <table className="table-modern">
            <thead>
              <tr><th>Keyword</th><th>Respon</th><th>Media</th><th>Trigger</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {triggers.map((item) => (
                <tr key={item.id}>
                  {editingTriggerId === item.id ? (
                    <>
                      <td style={{ minWidth: 190 }}><input value={editKeyword} onChange={(e) => setEditKeyword(e.target.value)} style={styles.input} /></td>
                      <td style={{ minWidth: 290 }}>
                        {editResponseList.map((item, index) => (
                          <div key={index} style={{ marginBottom: 8 }}>
                            <textarea value={item} onChange={(e) => { const updated = [...editResponseList]; updated[index] = e.target.value; setEditResponseList(updated); setEditResponse(joinResponses(updated)); }} placeholder={`Jawaban ${index + 1}`} style={{ ...styles.textarea, minHeight: 74 }} />
                            {editResponseList.length > 1 && <button onClick={() => { const updated = editResponseList.filter((_, i) => i !== index); setEditResponseList(updated); setEditResponse(joinResponses(updated)); }} style={{ ...styles.button, ...styles.dangerButton, marginTop: 6, padding: "7px 10px" }}>Hapus</button>}
                          </div>
                        ))}
                        <button onClick={() => setEditResponseList([...editResponseList, ""])} style={{ ...styles.button, ...styles.ghostButton, padding: "8px 10px" }}>+ Tambah Jawaban</button>
                      </td>
                      <td style={{ minWidth: 210 }}>
                        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                          {editMedia.length > 0 ? editMedia.slice(0, 4).map((m, i) => <div key={i} style={{ borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", minHeight: 86 }}>{m.type === "video" ? <video src={m.url} controls style={{ width: "100%", height: 86, objectFit: "cover", display: "block" }} /> : <img src={m.url} alt="Media Preview" style={{ width: "100%", height: 86, objectFit: "cover", display: "block" }} />}</div>) : <span style={styles.muted}>Belum ada media</span>}
                        </div>
                      </td>
                      <td style={{ minWidth: 230 }}>
                        <select value={editType} onChange={(e) => setEditType(e.target.value)} style={{ ...styles.input, marginBottom: 10 }}><option>Mengandung</option><option>Sama Persis</option></select>
                        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#d1d5db" }}><input type="checkbox" checked={editIsFlowEntry} onChange={(e) => setEditIsFlowEntry(e.target.checked)} />Masuk/Pindah Alur</label>
                        <label style={{ display: "block", padding: 12, borderRadius: 14, border: "1px dashed rgba(0,255,157,0.25)", background: "rgba(0,255,157,0.05)", cursor: "pointer", textAlign: "center", marginTop: 12, fontSize: 13 }}>
                          <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => { const files = Array.from(e.target.files || []); files.forEach((file) => uploadEditMedia(file)); e.target.value = ""; }} />Upload Media
                        </label>
                        {editUploading && <p style={{ color: "#00ff9d", marginTop: 8 }}>Upload... {editUploadingCount} file</p>}
                        {editMedia.length > 0 && <div style={{ marginTop: 10, display: "grid", gap: 10 }}>{editMedia.map((item, index) => <div key={index} style={{ padding: 8, borderRadius: 14, background: "rgba(255,255,255,0.06)" }}>{item.type === "video" ? <video src={item.url} controls style={{ width: "100%", borderRadius: 10, display: "block", marginBottom: 6 }} /> : <img src={item.url} alt="Edit Preview" style={{ width: "100%", borderRadius: 10, display: "block", marginBottom: 6 }} />}<button onClick={() => removeEditMedia(index)} style={{ ...styles.button, ...styles.dangerButton, width: "100%", padding: "7px 10px" }}>Hapus</button></div>)}</div>}
                      </td>
                      <td><span style={{ ...styles.pill, background: item.active ? "rgba(0,255,157,0.12)" : "rgba(255,77,103,0.12)", color: item.active ? "#00ff9d" : "#ff7b90" }}>{item.active ? "Aktif" : "Nonaktif"}</span></td>
                      <td style={{ minWidth: 170 }}><div style={{ display: "grid", gap: 8 }}><button onClick={() => saveEditTrigger(item.id)} disabled={editUploading} className={!editUploading ? "green-btn" : ""} style={{ ...styles.button, padding: "9px 12px", opacity: editUploading ? 0.5 : 1 }}>Simpan</button><button onClick={() => { setEditingTriggerId(null); setEditMedia([]); setEditImage(""); setEditUploadingCount(0); }} style={{ ...styles.button, ...styles.ghostButton, padding: "9px 12px" }}>Batal</button></div></td>
                    </>
                  ) : (
                    <>
                      <td><b>{item.keyword}</b></td>
                      <td style={{ maxWidth: 360 }}><div style={{ whiteSpace: "pre-wrap", color: "#d1d5db", lineHeight: 1.55 }}>{item.response || <span style={styles.muted}>Media only</span>}</div></td>
                      <td style={{ minWidth: 210 }}><MediaPreview item={item} /></td>
                      <td><span style={{ ...styles.pill, background: item.is_flow_entry ? "rgba(0,255,157,0.12)" : "rgba(255,255,255,0.07)", color: item.is_flow_entry ? "#00ff9d" : "white" }}>{item.is_flow_entry ? "Masuk/Pindah Alur" : item.type}</span></td>
                      <td><span style={{ ...styles.pill, background: item.active ? "rgba(0,255,157,0.12)" : "rgba(255,77,103,0.12)", color: item.active ? "#00ff9d" : "#ff7b90" }}>{item.active ? "Aktif" : "Nonaktif"}</span></td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <button onClick={() => startEditTrigger(item)} style={{ ...styles.button, ...styles.ghostButton, padding: "9px 12px" }}>Edit</button>
                          <button onClick={() => duplicateTrigger(item)} style={{ ...styles.button, background: "rgba(0,255,157,0.12)", color: "#00ff9d", border: "1px solid rgba(0,255,157,0.18)", padding: "9px 12px" }}>Duplicate</button>
                          <button onClick={() => setCopyingTriggerId(copyingTriggerId === item.id ? null : item.id)} style={{ ...styles.button, ...styles.ghostButton, padding: "9px 12px" }}>Copy Flow</button>
                          <button onClick={() => toggleStatus(item.id, item.active)} style={{ ...styles.button, ...styles.ghostButton, padding: "9px 12px" }}>{item.active ? "Matikan" : "Aktifkan"}</button>
                          <button onClick={() => deleteTrigger(item.id)} style={{ ...styles.button, ...styles.dangerButton, padding: "9px 12px" }}>Hapus</button>
                          {copyingTriggerId === item.id && <div style={{ width: "100%", marginTop: 10, padding: 12, borderRadius: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}><p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8, fontWeight: 750 }}>COPY KE ALUR</p><select value={copyTargetFlow[item.id] || ""} onChange={(e) => setCopyTargetFlow({ ...copyTargetFlow, [item.id]: e.target.value })} style={{ ...styles.input, marginBottom: 10, padding: "10px 12px" }}><option value="">Pilih alur tujuan</option>{flows.map((flow) => <option key={flow.id} value={flow.id}>{flow.name}</option>)}</select><button onClick={() => { const target = copyTargetFlow[item.id]; if (!target) return alert("Pilih alur tujuan dulu"); duplicateTrigger(item, Number(target)); }} className="green-btn" style={{ ...styles.button, width: "100%", padding: "10px 12px" }}>Salin Trigger</button></div>}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {triggers.length === 0 && <tr><td colSpan="6" style={{ color: "#9ca3af" }}>Belum ada trigger di alur ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function FlowManager() {
    return (
      <div className="glass-card" style={styles.section}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
          <div><h2>Flow Manager</h2><p style={{ ...styles.muted, marginTop: 8 }}>Buat, pilih, edit, atau hapus alur automation.</p></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 360px) minmax(0, 1fr)", gap: 18 }}>
          <div style={{ padding: 16, borderRadius: 22, background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <label style={styles.label}>Buat Alur Baru</label>
            <input value={newFlowName} onChange={(e) => setNewFlowName(e.target.value)} placeholder="Contoh: Closing, CS, Promo" style={styles.input} />
            <button onClick={addFlow} className="green-btn" style={{ ...styles.button, width: "100%", marginTop: 10 }}>+ Tambah Alur</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {flows.map((flow) => <div key={flow.id} style={{ padding: 16, borderRadius: 22, background: selectedFlow?.id === flow.id ? "linear-gradient(135deg, rgba(0,255,157,0.16), rgba(255,255,255,0.045))" : "rgba(255,255,255,0.045)", border: selectedFlow?.id === flow.id ? "1px solid rgba(0,255,157,0.24)" : "1px solid rgba(255,255,255,0.07)" }}>{editingFlowId === flow.id ? <><input value={editingFlowName} onChange={(e) => setEditingFlowName(e.target.value)} style={styles.input} /><div style={{ display: "flex", gap: 8, marginTop: 10 }}><button onClick={() => updateFlowName(flow.id)} className="green-btn" style={{ ...styles.button, flex: 1 }}>Simpan</button><button onClick={() => { setEditingFlowId(null); setEditingFlowName(""); }} style={{ ...styles.button, ...styles.ghostButton, flex: 1 }}>Batal</button></div></> : <><p style={styles.muted}>Flow</p><h3 style={{ marginTop: 8 }}>{flow.name}</h3><div style={{ display: "flex", gap: 8, marginTop: 14 }}><button onClick={() => selectFlow(flow)} className={selectedFlow?.id === flow.id ? "green-btn" : ""} style={{ ...styles.button, ...(selectedFlow?.id === flow.id ? {} : styles.ghostButton), flex: 1 }}>Pilih</button><button onClick={() => { setEditingFlowId(flow.id); setEditingFlowName(flow.name); }} style={{ ...styles.button, ...styles.ghostButton, flex: 1 }}>Edit</button><button onClick={() => deleteFlow(flow.id)} style={{ ...styles.button, ...styles.dangerButton, flex: 1 }}>Hapus</button></div></>}</div>)}
          </div>
        </div>
      </div>
    );
  }

  function Dashboard() {
    return (
      <>
        <Stats />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 0.9fr", gap: 20 }}>
          <div><SelectedFlowCard /><TriggerLibrary /></div>
          <div><WhatsAppCard /><div className="glass-card" style={styles.section}><p style={styles.muted}>Automation Health</p><h2 style={{ marginTop: 8 }}>Minimal Luxury Mode</h2><div style={{ display: "grid", gap: 12, marginTop: 18 }}><div style={{ display: "flex", justifyContent: "space-between", padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.045)" }}><span style={styles.muted}>Aktif</span><b style={{ color: "#00ff9d" }}>{activeTriggers}</b></div><div style={{ display: "flex", justifyContent: "space-between", padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.045)" }}><span style={styles.muted}>Flow Entry</span><b>{flowEntryCount}</b></div></div></div></div>
        </div>
      </>
    );
  }

  function Content() {
    if (activeMenu === "dashboard") return <Dashboard />;
    if (activeMenu === "flows") return <><SelectedFlowCard /><FlowManager /></>;
    if (activeMenu === "triggers") return <><SelectedFlowCard /><TriggerLibrary /></>;
    if (activeMenu === "create") return <><SelectedFlowCard /><CreateForm /></>;
    if (activeMenu === "whatsapp") return <WhatsAppCard />;
    return <Dashboard />;
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <aside className="glass-card" style={styles.sidebar}>
          <div style={styles.brand}>
            <div style={styles.logo}>N</div>
            <div><h2 style={{ fontSize: 22, lineHeight: 1, letterSpacing: -0.6 }}>NEXIS</h2><p style={{ ...styles.muted, fontSize: 12, marginTop: 6 }}>WhatsApp Automation Suite</p></div>
          </div>

          <p style={styles.navTitle}>MAIN MENU</p>
          {menuItems.map((item) => navButton(item))}

          <p style={styles.navTitle}>FLOW SUBMENU</p>
          <div style={{ padding: 12, borderRadius: 18, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.055)", marginBottom: 10 }}>
            <input value={newFlowName} onChange={(e) => setNewFlowName(e.target.value)} placeholder="Nama alur baru" style={{ ...styles.input, padding: "11px 12px" }} />
            <button onClick={addFlow} className="green-btn" style={{ ...styles.button, width: "100%", marginTop: 9, padding: "10px 12px" }}>+ Tambah Alur</button>
          </div>
          {flows.map((flow) => {
            const active = selectedFlow?.id === flow.id;
            return <button key={flow.id} onClick={() => { selectFlow(flow); setActiveMenu("triggers"); }} className="sidebar-item" style={{ ...styles.navSubItem, background: active ? "linear-gradient(135deg, rgba(0,255,157,0.16), rgba(255,255,255,0.05))" : "rgba(255,255,255,0.025)", border: active ? "1px solid rgba(0,255,157,0.25)" : "1px solid rgba(255,255,255,0.045)" }}><span style={{ display: "flex", gap: 9 }}><span style={{ color: active ? "#00ff9d" : "#6b7280" }}>▸</span><span>{flow.name}</span></span>{active && <span style={{ color: "#00ff9d" }}>●</span>}</button>;
          })}
          {flows.length === 0 && <p style={{ ...styles.muted, padding: "8px 12px", fontSize: 13, lineHeight: 1.6 }}>Belum ada flow.</p>}

          <div style={{ marginTop: 18, padding: 14, borderRadius: 20, background: "linear-gradient(135deg, rgba(0,255,157,0.12), rgba(255,255,255,0.035))", border: "1px solid rgba(0,255,157,0.14)" }}>
            <p style={{ ...styles.muted, fontSize: 12, marginBottom: 8 }}>Current Flow</p>
            <b>{selectedFlow?.name || "Belum dipilih"}</b>
          </div>
        </aside>

        <section style={styles.main}>
          <Header />
          <Content />
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 1180px) {
          main > div { grid-template-columns: 1fr !important; }
          aside { position: relative !important; top: auto !important; height: auto !important; }
          section > div { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          main { padding: 14px !important; }
          section > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
