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

    const uploaded = await cloudinary.uploader.upload(body.image, {
      folder: "chatbotnexis",
    });

    return NextResponse.json({
      success: true,
      image: uploaded.secure_url,
    });
  } catch (err) {
    console.log(err);

    return NextResponse.json({
      success: false,
    });
  }
}
