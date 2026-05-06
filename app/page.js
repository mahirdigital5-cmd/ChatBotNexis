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
