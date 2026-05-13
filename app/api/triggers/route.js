import { NextResponse } from "next/server";
import supabase from "../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    const { data: triggers, error: triggersError } = await supabase
      .from("triggers")
      .select("*")
      .eq("active", true)
      .order("id", { ascending: false });

    if (triggersError) {
      console.log("TRIGGERS ERROR:", triggersError);

      return NextResponse.json(
        {
          triggers: [],
          session: null,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    let session = null;

    if (phone) {
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();

      if (sessionError) {
        console.log("SESSION ERROR:", sessionError);
      } else {
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
  } catch (err) {
    console.log("GET TRIGGERS ERROR:", err);

    return NextResponse.json(
      {
        triggers: [],
        session: null,
        message: err?.message || "Gagal mengambil triggers",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
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

    const { data: existingSession, error: findError } = await supabase
      .from("sessions")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (findError) {
      console.log("FIND SESSION ERROR:", findError);

      return NextResponse.json({
        success: false,
        message: findError.message,
      });
    }

    if (existingSession) {
      const { error } = await supabase
        .from("sessions")
        .update({
          flow_id,
          updated_at: new Date().toISOString(),
        })
        .eq("phone", phone);

      if (error) {
        console.log("UPDATE SESSION ERROR:", error);

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
        console.log("INSERT SESSION ERROR:", error);

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
    console.log("POST SESSION ERROR:", err);

    return NextResponse.json({
      success: false,
      message: err?.message || "Gagal update session",
    });
  }
}
