import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
  },
  "produk 2": {
    nama: "Produk 2",
    harga: {
      "1": "Rp129.000",
      "2": "Rp239.000",
      "3": "Rp339.000"
    },
    cod: true,
    stok: "ready"
  }
};

export async function POST(req) {
  try {
    const { message } = await req.json();

    const prompt = `
Kamu adalah ChatBotNexis, admin WhatsApp dropship.

Aturan:
- Jawab ramah, singkat, natural.
- Panggil customer dengan "kak".
- Fokus closing.
- Jangan mengarang harga, stok, COD, atau ongkir.
- Kalau tanya ongkir, minta kecamatan, kota/kabupaten, provinsi, dan jumlah pesanan.
- Kalau mau order, kasih form order.

Data produk:
${JSON.stringify(products, null, 2)}

Chat customer:
${message}

Balasan:
`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6
    });

    return Response.json({
      reply: res.choices[0].message.content
    });
  } catch (error) {
    return Response.json(
      { reply: "Maaf kak, bot lagi gangguan sebentar 🙏" },
      { status: 500 }
    );
  }
}
