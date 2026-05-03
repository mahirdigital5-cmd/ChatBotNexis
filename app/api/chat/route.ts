import OpenAI from "openai";
import { products } from "../../../data/products";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  const { message } = await req.json();

  const prompt = `
Kamu adalah ChatBotNexis.

Data produk:
${JSON.stringify(products)}

Customer: ${message}

Balas sebagai admin jualan.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  return Response.json({
    reply: res.choices[0].message.content
  });
}
