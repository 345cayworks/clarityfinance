import { FinanceData } from "@/types";
import { deleteAllFinanceData, getFinanceDataByUserId, upsertFinanceData } from "@/lib/repositories/financeRepository";

export async function loadFinanceData(userId: string): Promise<FinanceData> {
  return getFinanceDataByUserId(userId);
}

export async function saveFinanceData(userId: string, data: FinanceData) {
  return upsertFinanceData(userId, data);
}

export async function removeFinanceData(userId: string) {
  return deleteAllFinanceData(userId);
}
