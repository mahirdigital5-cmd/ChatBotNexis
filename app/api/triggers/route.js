export async function GET() {
  return Response.json([
    {
      keyword: "halo",
      response: "bot aktif lagi",
      image: "",
      is_active: true,
    },
  ]);
}
