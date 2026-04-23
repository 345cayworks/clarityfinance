import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { removeFinanceData, loadFinanceData, saveFinanceData } from "@/lib/services/financeDataService";
import { FinanceData } from "@/types";

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const data = await loadFinanceData(userId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load data" }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const data = (await request.json()) as FinanceData;
    await saveFinanceData(userId, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save data" }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    await removeFinanceData(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete data" }, { status: 400 });
  }
}
