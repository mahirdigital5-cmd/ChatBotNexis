export async function GET() {
  return Response.json([
    {
      keyword: "halo",
      response: "halo jugaa",
      image: "",
      is_active: true,
    },
  ]);
}
