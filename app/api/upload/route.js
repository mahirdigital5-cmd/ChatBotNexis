import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers,
  });
}

export async function POST(req) {
  try {
    const body = await req.json();

    const uploaded = await cloudinary.uploader.upload(body.image, {
      folder: "chatbotnexis",
    });

    return Response.json(
      {
        success: true,
        image: uploaded.secure_url,
      },
      { headers }
    );
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500, headers }
    );
  }
}
