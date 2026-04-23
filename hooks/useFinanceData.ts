"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { FinanceData } from "@/types";
import {
  clearLegacyLocalFinanceData,
  defaultFinanceData,
  getSampleData,
  loadLegacyLocalFinanceData,
  saveLegacyLocalFinanceData
} from "@/lib/storage";

async function fetchFinanceData(): Promise<FinanceData> {
  const response = await fetch("/api/finance-data", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load finance data");
  return response.json();
}

async function persistFinanceData(data: FinanceData) {
  await fetch("/api/finance-data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

export function useFinanceData() {
  const { data: session, status } = useSession();
  const isSignedIn = Boolean(session?.user?.id);
  const [data, setData] = useState<FinanceData>(defaultFinanceData);
  const [hydrated, setHydrated] = useState(false);
  const [hasLegacyData, setHasLegacyData] = useState(false);

  useEffect(() => {
    const legacy = loadLegacyLocalFinanceData();
    setHasLegacyData(Boolean(legacy));

    if (status === "loading") return;

    if (!isSignedIn) {
      setData(legacy ?? defaultFinanceData);
      setHydrated(true);
      return;
    }

    fetchFinanceData()
      .then((loaded) => setData(loaded))
      .catch(() => setData(defaultFinanceData))
      .finally(() => setHydrated(true));
  }, [isSignedIn, status]);

  useEffect(() => {
    if (!hydrated) return;

    if (!isSignedIn) {
      saveLegacyLocalFinanceData(data);
      return;
    }

    persistFinanceData(data).catch(() => undefined);
  }, [data, hydrated, isSignedIn]);

  const importLegacyData = useCallback(async () => {
    const legacy = loadLegacyLocalFinanceData();
    if (!legacy || !isSignedIn) return;
    await fetch("/api/finance-data/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(legacy)
    });
    setData(legacy);
    clearLegacyLocalFinanceData();
    setHasLegacyData(false);
  }, [isSignedIn]);

  const actions = useMemo(
    () => ({
      update<K extends keyof FinanceData>(key: K, value: FinanceData[K]) {
        setData((prev) => ({ ...prev, [key]: value }));
      },
      replace(next: FinanceData) {
        setData(next);
      },
      async reset() {
        if (isSignedIn) {
          await fetch("/api/finance-data", { method: "DELETE" });
        }
        clearLegacyLocalFinanceData();
        setData(defaultFinanceData);
      },
      fillSample() {
        setData(getSampleData());
      },
      importLegacyData,
      isSignedIn
    }),
    [importLegacyData, isSignedIn]
  );

  return { data, hydrated, hasLegacyData, ...actions };
}
