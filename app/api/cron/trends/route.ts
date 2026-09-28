import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const base = new URL(request.url);
  const response = await fetch(`${base.origin}/api/admin/trends`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET || ""}` }, cache: "no-store" });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
