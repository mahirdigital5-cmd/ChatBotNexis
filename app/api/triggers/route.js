import { NextResponse } from "next/server";
import supabase from "../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { data, error } = await supabase
    .from("triggers")
    .select("*")
    .eq("active", true)
    .order("id", { ascending: false });

  if (error) {
    console.log(error);
    return NextResponse.json([], {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
