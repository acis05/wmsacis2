import { query } from "@/lib/db";

export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({ ok: true, database: "connected" });
  } catch (error) {
    return Response.json({ ok: false, database: "disconnected" }, { status: 503 });
  }
}
