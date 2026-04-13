import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const HOTELS_PATH = path.join(process.cwd(), "data", "hotels.json");

export async function GET() {
  try {
    const data = fs.readFileSync(HOTELS_PATH, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, maxfhrId } = body;
    if (!id || !name || !maxfhrId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let hotels = [];
    try {
      hotels = JSON.parse(fs.readFileSync(HOTELS_PATH, "utf-8"));
    } catch { /* empty */ }

    hotels.push({ id, name, maxfhrId });
    fs.writeFileSync(HOTELS_PATH, JSON.stringify(hotels, null, 2));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    let hotels = [];
    try {
      hotels = JSON.parse(fs.readFileSync(HOTELS_PATH, "utf-8"));
    } catch { /* empty */ }

    hotels = hotels.filter((h: { id: string }) => h.id !== id);
    fs.writeFileSync(HOTELS_PATH, JSON.stringify(hotels, null, 2));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
