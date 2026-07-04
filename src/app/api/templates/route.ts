import { NextResponse } from "next/server";
import { store } from "@/lib/server/demo-store";

export async function GET() {
  return NextResponse.json({
    templates: Array.from(store.templates.values())
  });
}
