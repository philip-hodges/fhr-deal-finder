import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  const filePath = path.join(process.cwd(), "data", `${hotelId}.json`);

  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

// Force Next.js to bundle all JSON files from data/ at build time
export const dynamic = "force-static";
export async function generateStaticParams() {
  const hotelsPath = path.join(process.cwd(), "data", "hotels.json");
  const hotels = JSON.parse(fs.readFileSync(hotelsPath, "utf-8"));
  return hotels.map((h: { id: string }) => ({ hotelId: h.id }));
}
