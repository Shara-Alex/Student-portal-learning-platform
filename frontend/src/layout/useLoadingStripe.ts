import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

/**
 * Drives Homeroom's loading stripe (the yellow line at the top that fills with green).
 * TanStack Query already counts every request in flight, so no screen has to say "I am loading":
 *   busy  something is being fetched or saved right now  -> the stripe fills
 *   done  the last request has just finished             -> the stripe completes and fades
 */
export function useLoadingStripe() {
  const busy = useIsFetching() + useIsMutating() > 0;
  const [done, setDone] = useState(false);
  const wasBusy = useRef(false); // a ref remembers a value between draws without causing a redraw

  useEffect(() => {
    if (busy) {
      wasBusy.current = true;
      setDone(false);
    } else if (wasBusy.current) {
      wasBusy.current = false;
      setDone(true);
    }
  }, [busy]);

  return { busy, done };
}
