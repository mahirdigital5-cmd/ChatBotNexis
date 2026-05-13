import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    const body = await req.json();

    const file = body.file || body.image;

    if (!file) {
      return NextResponse.json({
        success: false,
        message: "File tidak ditemukan",
      });
    }

    const isVideo =
      body.type === "video" ||
      String(file).startsWith("data:video/");

    const uploaded = await cloudinary.uploader.upload(file, {
      folder: "chatbotnexis",
      resource_type: isVideo ? "video" : "image",
    });

    return NextResponse.json({
      success: true,

      // format baru
      url: uploaded.secure_url,
      type: isVideo ? "video" : "image",

      // support code lama
      image: uploaded.secure_url,
    });
  } catch (err) {
    console.log(err);

    return NextResponse.json({
      success: false,
      message: err?.message || "Upload gagal",
    });
  }
}
