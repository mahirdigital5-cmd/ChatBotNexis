export async function GET() {
  return Response.json([
    {
      keyword: "halo",
      response: "ini gambar dari cloudinary",
      image:
        "https://res.cloudinary.com/dw1oauijs/image/upload/v1778212352/chatbotnexis/a2ky01smsuuptyrltbcu.jpg",
      is_active: true,
    },
  ]);
}
