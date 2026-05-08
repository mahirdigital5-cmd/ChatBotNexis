export async function GET() {
  return Response.json([
    {
      keyword: "halo",
      response: "ini test gambar",
      image: "https://picsum.photos/300/300",
      is_active: true,
    },
  ]);
}
