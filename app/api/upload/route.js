export async function POST(req) {
  try {
    const body = await req.json();

    return Response.json({
      success: true,
      image: body.image,
    });
  } catch (err) {
    return Response.json({
      success: false,
    });
  }
}
