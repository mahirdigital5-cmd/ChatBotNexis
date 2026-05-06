const triggers = [
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
];

export default function Home() {
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
    placeholder="Kata kunci"
    style={{ padding: 12, marginRight: 10 }}
  />

  <input
    placeholder="Respon otomatis"
    style={{ padding: 12, marginRight: 10 }}
  />

  <select style={{ padding: 12, marginRight: 10 }}>
    <option>Mengandung</option>
    <option>Sama Persis</option>
  </select>

  <button
    style={{
      background: "#00a884",
      color: "white",
      border: "none",
      padding: "12px 18px",
      borderRadius: 8,
      fontWeight: "bold",
    }}
  >
    Simpan
  </button>
</div>
</button>

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
            </tr>
          </thead>

          <tbody>
            {triggers.map((item, index) => (
              <tr key={index}>
                <td>{item.keyword}</td>
                <td>{item.response}</td>
                <td>{item.type}</td>
                <td>
                  {item.active ? "🟢 Aktif" : "🔴 Nonaktif"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
