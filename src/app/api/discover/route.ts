import { NextResponse } from "next/server";
import { discoverPages } from "@/lib/audit/discovery";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    const result = await discoverPages(String(url || ""));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not discover pages." },
      { status: 400 },
    );
  }
}
