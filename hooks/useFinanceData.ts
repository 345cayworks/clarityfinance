"use client";

import { useEffect, useMemo, useState } from "react";
import { FinanceData } from "@/types";
import { clearFinanceData, defaultFinanceData, getSampleData, loadFinanceData, saveFinanceData } from "@/lib/storage";

export function useFinanceData() {
  const [data, setData] = useState<FinanceData>(defaultFinanceData);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadFinanceData();
    setData(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveFinanceData(data);
  }, [data, hydrated]);

  const actions = useMemo(
    () => ({
      update<K extends keyof FinanceData>(key: K, value: FinanceData[K]) {
        setData((prev) => ({ ...prev, [key]: value }));
      },
      reset() {
        clearFinanceData();
        setData(defaultFinanceData);
      },
      fillSample() {
        setData(getSampleData());
      }
    }),
    []
  );

  return { data, hydrated, ...actions };
}
