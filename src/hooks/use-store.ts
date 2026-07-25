import { useEffect, useState } from "react";
import { store } from "@/lib/storage";

export function useStore<T>(getter: () => T): T {
  const [value, setValue] = useState<T>(() => getter());
  useEffect(() => {
    const sync = () => setValue(getter());
    sync();
    window.addEventListener("unio:data-changed", sync);
    return () => window.removeEventListener("unio:data-changed", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

export { store };
