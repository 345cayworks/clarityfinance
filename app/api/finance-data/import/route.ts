import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveFinanceData } from "@/lib/services/financeDataService";
import { FinanceData } from "@/types";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = (await request.json()) as FinanceData;
  await saveFinanceData(userId, data);
  return NextResponse.json({ imported: true });
}
