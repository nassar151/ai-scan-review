import { useEffect, useState } from 'react';

/** Current time, re-rendering every `intervalMs` while `isTicking` is true. */
export const useNow = (intervalMs: number, isTicking: boolean) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isTicking) return undefined;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, isTicking]);

  return now;
};
