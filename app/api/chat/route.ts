import OpenAI from "openai";

const products = {
  "produk 1": {
    nama: "Produk 1",
    harga: {
      "1": "Rp149.000",
      "2": "Rp269.000",
      "3": "Rp379.000"
    },
    cod: true,
    stok: "ready"
  }
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  const { message } = await req.json();

  const prompt = `
Kamu adalah ChatBotNexis, admin WhatsApp dropship.

Tugas kamu:
- Jawab ramah, singkat, dan natural.
- Panggil customer dengan "kak".
- Fokus bantu closing.
- Jangan mengarang harga, stok, atau ongkir.
- Kalau customer tanya ongkir, minta kecamatan, kota/kabupaten, provinsi, dan jumlah pesanan.
- Kalau customer mau order, kasih form order.

Data produk:
${JSON.stringify(products)}

Chat customer:
${message}

Balasan:
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  return Response.json({
    reply: res.choices[0].message.content
  });
}
