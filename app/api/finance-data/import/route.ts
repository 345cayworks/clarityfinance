import { NextRequest, NextResponse } from "next/server";
import { USER_ID_HEADER } from "@/lib/userIdentity";
import { saveFinanceData } from "@/lib/services/financeDataService";
import { FinanceData } from "@/types";

export async function POST(request: NextRequest) {
  const userId = request.headers.get(USER_ID_HEADER);
  if (!userId) return NextResponse.json({ error: "Missing user id header" }, { status: 400 });
  const data = (await request.json()) as FinanceData;
  await saveFinanceData(userId, data);
  return NextResponse.json({ imported: true });
}
