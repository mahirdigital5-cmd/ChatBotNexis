"use client";

import { useEffect, useState } from "react";
import supabase from "../lib/supabase";

const WA_ENGINE_URL = "https://wa-engine-production-8ebe.up.railway.app";

export default function Home() {
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [newFlowName, setNewFlowName] = useState("");

  const [editingFlowId, setEditingFlowId] = useState(null);
  const [editingFlowName, setEditingFlowName] = useState("");

  const [triggers, setTriggers] = useState([]);

  const [keyword, setKeyword] = useState("");
  const [response, setResponse] = useState("");
  const [type, setType] = useState("Mengandung");
  const [image, setImage] = useState("");
  const [media, setMedia] = useState([]);
  const [isFlowEntry, setIsFlowEntry] = useState(false);

  const [editingTriggerId, setEditingTriggerId] = useState(null);
  const [editKeyword, setEditKeyword] = useState("");
  const [editResponse, setEditResponse] = useState("");
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
      const mediaType = file.type.startsWith("video/") ? "video" : "image";

      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              file: reader.result,
              image: reader.result,
              type: mediaType,
            }),
          });

          const data = await res.json();

          if (!data.success) {
            alert(data.message || "Upload gagal");
            return;
          }

          const url = data.url || data.image;

          setMedia((prev) => [
            ...prev,
            {
              type: data.type || mediaType,
              url,
            },
          ]);

          if (mediaType === "image" && !image) {
            setImage(url);
          }
        } catch (err) {
          alert("Upload gagal: " + err.message);
        } finally {
          setUploadingCount((prev) => Math.max(prev - 1, 0));
        }
      };

      reader.onerror = () => {
        alert("Gagal membaca file");
        setUploadingCount((prev) => Math.max(prev - 1, 0));
      };

      reader.readAsDataURL(file);
    } catch (err) {
      alert("Upload gagal: " + err.message);
      setUploadingCount((prev) => Math.max(prev - 1, 0));
    }
  }

  async function uploadEditMedia(file) {
    setEditUploadingCount((prev) => prev + 1);

    try {
      const mediaType = file.type.startsWith("video/") ? "video" : "image";

      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              file: reader.result,
              image: reader.result,
              type: mediaType,
            }),
          });

          const data = await res.json();

          if (!data.success) {
            alert(data.message || "Upload gagal");
            return;
          }

          const url = data.url || data.image;

          setEditMedia((prev) => [
            ...prev,
            {
              type: data.type || mediaType,
              url,
            },
          ]);

          if (mediaType === "image" && !editImage) {
            setEditImage(url);
          }
        } catch (err) {
          alert("Upload gagal: " + err.message);
        } finally {
          setEditUploadingCount((prev) => Math.max(prev - 1, 0));
        }
      };

      reader.onerror = () => {
        alert("Gagal membaca file");
        setEditUploadingCount((prev) => Math.max(prev - 1, 0));
      };

      reader.readAsDataURL(file);
    } catch (err) {
      alert("Upload gagal: " + err.message);
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

    if (uploading) return alert("Tunggu upload media selesai dulu");

    if (!keyword || (!response && media.length === 0)) {
      return alert("Isi keyword dan respon/foto/video");
    }

    const firstImage = media.find((m) => m.type === "image");

    await supabase.from("triggers").insert([
      {
        flow_id: selectedFlow.id,
        keyword,
        response,
        type,
        image: firstImage?.url || "",
        media,
        active: true,
        is_flow_entry: isFlowEntry,
      },
    ]);

    setKeyword("");
    setResponse("");
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
    setEditType(item.type || "Mengandung");
    setEditIsFlowEntry(item.is_flow_entry === true);
    setEditMedia(itemMedia);
    setEditImage(firstImage?.url || item.image || "");
    setEditUploadingCount(0);
  }

  async function saveEditTrigger(id) {
    if (editUploading) return alert("Tunggu upload media selesai dulu");

    if (!editKeyword || (!editResponse && editMedia.length === 0)) {
      return alert("Keyword dan respon/foto/video tidak boleh kosong");
    }

    const firstImage = editMedia.find((m) => m.type === "image");

    await supabase
      .from("triggers")
      .update({
        keyword: editKeyword,
        response: editResponse,
        type: editType,
        image: firstImage?.url || "",
        media: editMedia,
        is_flow_entry: editIsFlowEntry,
      })
      .eq("id", id);

    setEditingTriggerId(null);
    setEditKeyword("");
    setEditResponse("");
    setEditType("Mengandung");
    setEditIsFlowEntry(false);
    setEditImage("");
    setEditMedia([]);
    setEditUploadingCount(0);

    getTriggers();
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

        {!waStatus ? (
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
            }}
          >
            Hubungkan WA
          </button>
        ) : (
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

        {!waStatus && qrData && (
          <div style={{ marginTop: 20 }}>
            <img
              src={qrData}
              alt="QR"
              style={{
                width: 250,
                borderRadius: 10,
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
        }}
      >
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 10,
          }}
        >
          <h3>Daftar Alur</h3>

          <input
            value={newFlowName}
            onChange={(e) => setNewFlowName(e.target.value)}
            placeholder="Nama alur"
            style={{
              padding: 10,
              width: "100%",
              marginBottom: 10,
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={addFlow}
            style={{
              width: "100%",
              background: "#00a884",
              color: "white",
              border: "none",
              padding: 10,
              borderRadius: 8,
              marginBottom: 15,
              cursor: "pointer",
            }}
          >
            + Tambah Alur
          </button>

          {flows.map((flow) => (
            <div
              key={flow.id}
              style={{
                background:
                  selectedFlow?.id === flow.id ? "#00a884" : "#f2f2f2",
                color: selectedFlow?.id === flow.id ? "white" : "black",
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              {editingFlowId === flow.id ? (
                <>
                  <input
                    value={editingFlowName}
                    onChange={(e) => setEditingFlowName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 8,
                      marginBottom: 8,
                      boxSizing: "border-box",
                    }}
                  />

                  <button
                    onClick={() => updateFlowName(flow.id)}
                    style={{ marginRight: 5 }}
                  >
                    Simpan
                  </button>

                  <button
                    onClick={() => {
                      setEditingFlowId(null);
                      setEditingFlowName("");
                    }}
                  >
                    Batal
                  </button>
                </>
              ) : (
                <>
                  <div
                    onClick={() => selectFlow(flow)}
                    style={{
                      cursor: "pointer",
                      marginBottom: 10,
                      fontWeight:
                        selectedFlow?.id === flow.id ? "bold" : "normal",
                    }}
                  >
                    {flow.name}
                  </div>

                  <button
                    onClick={() => {
                      setEditingFlowId(flow.id);
                      setEditingFlowName(flow.name);
                    }}
                    style={{ marginRight: 5 }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteFlow(flow.id)}
                    style={{
                      background: "red",
                      color: "white",
                      border: "none",
                    }}
                  >
                    Hapus
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <div>
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 10,
              marginBottom: 20,
            }}
          >
            <h3>
              Trigger Alur:{" "}
              <span style={{ color: "#00a884" }}>
                {selectedFlow?.name || "-"}
              </span>
            </h3>

            <button
              onClick={() => setShowForm(!showForm)}
              disabled={!selectedFlow}
              style={{
                background: selectedFlow ? "#00a884" : "#999",
                color: "white",
                border: "none",
                padding: "10px 15px",
                borderRadius: 8,
                cursor: selectedFlow ? "pointer" : "not-allowed",
              }}
            >
              + Tambah Trigger
            </button>
          </div>

          {showForm && (
            <div
              style={{
                background: "white",
                padding: 20,
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <h3>Tambah Trigger</h3>

              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Keyword"
                style={{
                  padding: 12,
                  marginBottom: 10,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />

              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Respon"
                style={{
                  padding: 12,
                  marginBottom: 10,
                  width: "100%",
                  minHeight: 120,
                  boxSizing: "border-box",
                }}
              />

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  padding: 12,
                  marginBottom: 10,
                  width: "100%",
                }}
              >
                <option>Mengandung</option>
                <option>Sama Persis</option>
              </select>

              <div style={{ marginBottom: 15 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={isFlowEntry}
                    onChange={(e) => setIsFlowEntry(e.target.checked)}
                  />{" "}
                  Jadikan trigger masuk/pindah alur
                </label>
              </div>

              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach((file) => uploadMedia(file));
                  e.target.value = "";
                }}
              />

              {uploading && <p>Upload media... ({uploadingCount})</p>}

              {media.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {media.map((item, index) => (
                    <div key={index}>
                      {item.type === "video" ? (
                        <video
                          src={item.url}
                          controls
                          style={{
                            width: 120,
                            border
