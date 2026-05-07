export async function GET() {
  return Response.json([
    {
      keyword: "halo",
      response: "halo jugaa",
      is_active: true,
    },
  ]);
}
