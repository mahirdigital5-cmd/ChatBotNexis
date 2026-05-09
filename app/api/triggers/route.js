import { NextResponse } from "next/server";
import supabase from "../../../lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("triggers")
    .select("*")
    .eq("active", true);

  if (error) {
    console.log(error);
    return NextResponse.json([]);
  }

  return NextResponse.json(data);
}
