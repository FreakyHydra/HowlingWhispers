import { NextRequest } from "next/server";
import { forwardArchive } from "../lib";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return forwardArchive(req);
}

export async function POST(req: NextRequest) {
  return forwardArchive(req);
}

export async function PUT(req: NextRequest) {
  return forwardArchive(req);
}

export async function DELETE(req: NextRequest) {
  return forwardArchive(req);
}