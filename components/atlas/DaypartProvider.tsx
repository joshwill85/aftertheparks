"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getDaypart, getNowInOrlando, type Daypart } from "@/lib/daypart";

interface DaypartContextValue {
  daypart: Daypart;
  forceDaypart: Daypart | null;
  setForceDaypart: (d: Daypart | null) => void;
}

const DaypartContext = createContext<DaypartContextValue | null>(null);

export function DaypartProvider({
  children,
  initialForce,
}: {
  children: ReactNode;
  initialForce?: Daypart | null;
}) {
  const [forceDaypart, setForceDaypart] = useState<Daypart | null>(
    initialForce ?? null
  );
  const [daypart, setDaypart] = useState<Daypart>(
    initialForce ?? getDaypart(getNowInOrlando())
  );

  const update = useCallback(() => {
    if (forceDaypart) {
      setDaypart(forceDaypart);
      return;
    }
    setDaypart(getDaypart(getNowInOrlando()));
  }, [forceDaypart]);

  useEffect(() => {
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [update]);

  useEffect(() => {
    document.documentElement.setAttribute("data-daypart", daypart);
  }, [daypart]);

  const value = useMemo(
    () => ({ daypart, forceDaypart, setForceDaypart }),
    [daypart, forceDaypart]
  );

  return (
    <DaypartContext.Provider value={value}>{children}</DaypartContext.Provider>
  );
}

export function useDaypart() {
  const ctx = useContext(DaypartContext);
  if (!ctx) throw new Error("useDaypart must be used within DaypartProvider");
  return ctx;
}
