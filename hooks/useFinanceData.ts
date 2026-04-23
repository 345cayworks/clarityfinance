"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FinanceData } from "@/types";
import {
  clearLegacyLocalFinanceData,
  defaultFinanceData,
  getSampleData,
  loadLegacyLocalFinanceData,
  saveLegacyLocalFinanceData
} from "@/lib/storage";
import { getBrowserUserId, USER_ID_HEADER } from "@/lib/userIdentity";

async function fetchFinanceData(userId: string): Promise<FinanceData> {
  const response = await fetch("/api/finance-data", { headers: { [USER_ID_HEADER]: userId }, cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load finance data");
  return response.json();
}

async function persistFinanceData(userId: string, data: FinanceData) {
  await fetch("/api/finance-data", {
    method: "PUT",
    headers: { "Content-Type": "application/json", [USER_ID_HEADER]: userId },
    body: JSON.stringify(data)
  });
}

export function useFinanceData() {
  const [data, setData] = useState<FinanceData>(defaultFinanceData);
  const [hydrated, setHydrated] = useState(false);
  const [hasLegacyData, setHasLegacyData] = useState(false);

  useEffect(() => {
    const userId = getBrowserUserId();
    const legacy = loadLegacyLocalFinanceData();
    setHasLegacyData(Boolean(legacy));

    fetchFinanceData(userId)
      .then((loaded) => setData(loaded))
      .catch(() => setData(legacy ?? defaultFinanceData))
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const userId = getBrowserUserId();
    saveLegacyLocalFinanceData(data);
    persistFinanceData(userId, data).catch(() => undefined);
  }, [data, hydrated]);

  const importLegacyData = useCallback(async () => {
    const legacy = loadLegacyLocalFinanceData();
    if (!legacy) return;
    const userId = getBrowserUserId();
    await fetch("/api/finance-data/import", {
      method: "POST",
      headers: { "Content-Type": "application/json", [USER_ID_HEADER]: userId },
      body: JSON.stringify(legacy)
    });
    setData(legacy);
    setHasLegacyData(false);
  }, []);

  const actions = useMemo(
    () => ({
      update<K extends keyof FinanceData>(key: K, value: FinanceData[K]) {
        setData((prev) => ({ ...prev, [key]: value }));
      },
      replace(next: FinanceData) {
        setData(next);
      },
      async reset() {
        const userId = getBrowserUserId();
        await fetch("/api/finance-data", { method: "DELETE", headers: { [USER_ID_HEADER]: userId } });
        clearLegacyLocalFinanceData();
        setData(defaultFinanceData);
      },
      fillSample() {
        setData(getSampleData());
      },
      importLegacyData
    }),
    [importLegacyData]
  );

  return { data, hydrated, hasLegacyData, ...actions };
}
