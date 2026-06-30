"use client";

import { useEffect, useState } from "react";
import {
  loadLocalPlanCache,
  subscribePlanUpdates,
} from "@/lib/plan/store";

export function useLocalPlanCount() {
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    let active = true;

    loadLocalPlanCache().then((cache) => {
      if (active) setItemCount(cache.items.length);
    });

    const unsubscribe = subscribePlanUpdates((cache) => {
      setItemCount(cache.items.length);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return itemCount;
}
