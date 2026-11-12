import { Button } from "@/components/ui/button";
import { errorText } from "@/lib/api";
import { useOnline } from "@/lib/online";
import { notifyManager, useQueryClient, type Query } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";

// A load that failed and that some screen is still waiting for.
const failedLoad = (q: Query) => q.state.status === "error" && q.getObserversCount() > 0;

/**
 * Banners at the top of every page for the two things a screen cannot fix by itself:
 *   - you are offline
 *   - something on this page failed to load (with a Try again button)
 * It watches TanStack Query's cache, so no screen needs its own "could not load" code.
 */
export function PageAlerts() {
  const client = useQueryClient();
  const cache = client.getQueryCache();
  const online = useOnline();

  // useSyncExternalStore = "redraw me when this outside thing changes". Here: the number of failed loads.
  const failed = useSyncExternalStore(
    useCallback((redraw: () => void) => cache.subscribe(notifyManager.batchCalls(redraw)), [cache]),
    () => cache.getAll().filter(failedLoad).length,
  );
  if (online && !failed) return null;

  const first = cache.getAll().find(failedLoad);
  return (
    <div className="mx-auto mb-4 max-w-6xl space-y-2 print:hidden" role="status">
      {!online && (
        <div className="rounded-md bg-bus-soft px-4 py-3 text-bus-ink">
          <b>You are offline.</b> You are seeing what was loaded earlier. Changes cannot be saved until the connection is back.
        </div>
      )}
      {failed > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-marker-soft px-4 py-3 text-marker">
          <span className="min-w-0 flex-1"><b>Part of this screen could not be loaded.</b> {errorText(first?.state.error)}</span>
          <Button variant="default" onClick={() => client.refetchQueries({ predicate: failedLoad })}>Try again</Button>
        </div>
      )}
    </div>
  );
}
