import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "File tidak ditemukan",
        },
        {
          status: 400,
        }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const mimeType = file.type || "";

    const isVideo = mimeType.startsWith("video/");

    const base64 = `data:${mimeType};base64,${buffer.toString("base64")}`;

    const uploaded = await cloudinary.uploader.upload(base64, {
      folder: "chatbotnexis",
      resource_type: isVideo ? "video" : "image",
    });

    return NextResponse.json({
      success: true,
      url: uploaded.secure_url,
      type: isVideo ? "video" : "image",
      image: uploaded.secure_url,
    });
  } catch (err) {
    console.log("UPLOAD ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Upload gagal",
      },
      {
        status: 500,
      }
    );
  }
}
