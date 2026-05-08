export async function GET() {
  return Response.json([
    {
      keyword: "halo",
      response: "test gambar dulu",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
      is_active: true,
    },
  ]);
}
