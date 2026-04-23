import { FinanceData } from "@/types";
import { deleteAllFinanceData, getFinanceDataByExternalUserId, upsertFinanceData } from "@/lib/repositories/financeRepository";

export async function loadFinanceData(externalUserId: string): Promise<FinanceData> {
  return getFinanceDataByExternalUserId(externalUserId);
}

export async function saveFinanceData(externalUserId: string, data: FinanceData) {
  return upsertFinanceData(externalUserId, data);
}

export async function removeFinanceData(externalUserId: string) {
  return deleteAllFinanceData(externalUserId);
}
