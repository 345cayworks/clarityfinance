import { NextRequest, NextResponse } from "next/server";
import { removeFinanceData, loadFinanceData, saveFinanceData } from "@/lib/services/financeDataService";
import { USER_ID_HEADER } from "@/lib/userIdentity";
import { FinanceData } from "@/types";

function readUserId(request: NextRequest) {
  const userId = request.headers.get(USER_ID_HEADER);
  if (!userId) throw new Error("Missing user id header");
  return userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = readUserId(request);
    const data = await loadFinanceData(userId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load data" }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = readUserId(request);
    const data = (await request.json()) as FinanceData;
    await saveFinanceData(userId, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save data" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = readUserId(request);
    await removeFinanceData(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete data" }, { status: 400 });
  }
}
