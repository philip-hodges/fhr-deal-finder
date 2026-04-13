import { NextResponse } from "next/server";
import fs14336 from "../../../../../data/14336.json";
import fs415858 from "../../../../../data/415858.json";

const rateFiles: Record<string, object> = {
  "14336": fs14336,
  "415858": fs415858,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  const data = rateFiles[hotelId];

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
