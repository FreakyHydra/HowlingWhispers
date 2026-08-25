import { NextRequest } from "next/server";
import { forwardCurator } from "../lib";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return forwardCurator(req);
}

export async function POST(req: NextRequest) {
  return forwardCurator(req);
}

export async function PUT(req: NextRequest) {
  return forwardCurator(req);
}

export async function PATCH(req: NextRequest) {
  return forwardCurator(req);
}
