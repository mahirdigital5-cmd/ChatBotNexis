import { NextResponse } from "next/server";
import supabase from "../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  const { data: triggers, error: triggersError } = await supabase
    .from("triggers")
    .select("*")
    .eq("active", true)
    .order("id", { ascending: false });

  if (triggersError) {
    console.log(triggersError);
    return NextResponse.json({
      triggers: [],
      session: null,
    });
  }

  let session = null;

  if (phone) {
    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (!sessionError) {
      session = sessionData;
    }
  }

  return NextResponse.json(
    {
      triggers: triggers || [],
      session,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone, flow_id } = body;

    if (!phone || !flow_id) {
      return NextResponse.json({
        success: false,
        message: "phone dan flow_id wajib diisi",
      });
    }

    const { data: existingSession } = await supabase
      .from("sessions")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (existingSession) {
      const { error } = await supabase
        .from("sessions")
        .update({
          flow_id,
          updated_at: new Date().toISOString(),
        })
        .eq("phone", phone);

      if (error) {
        return NextResponse.json({
          success: false,
          message: error.message,
        });
      }
    } else {
      const { error } = await supabase.from("sessions").insert([
        {
          phone,
          flow_id,
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        return NextResponse.json({
          success: false,
          message: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Session berhasil disimpan",
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: err?.message || "Gagal update session",
    });
  }
}
