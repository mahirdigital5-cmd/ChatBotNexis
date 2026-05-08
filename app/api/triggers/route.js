import supabase from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("triggers")
    .select("*")
    .eq("active", true);

  if (error) {
    console.log(error);

    return Response.json([]);
  }

  return Response.json(data);
}
