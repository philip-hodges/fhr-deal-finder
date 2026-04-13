import { NextResponse } from "next/server";
import { exec } from "child_process";

export async function POST() {
  try {
    exec("npx tsx scripts/scrape.ts", {
      cwd: process.cwd(),
    });
    return NextResponse.json({ success: true, message: "Scrape started in background" });
  } catch {
    return NextResponse.json({ error: "Failed to start scrape" }, { status: 500 });
  }
}
