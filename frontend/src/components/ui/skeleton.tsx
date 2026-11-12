import { useEffect, useState, type ReactNode } from "react";

/**
 * True once `ms` have passed. Homeroom's rule: under about 300ms show nothing,
 * because a skeleton that flashes for a split second is worse than none.
 */
function useDelayed(ms = 300) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setLate(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return late;
}

/** Homeroom's ruled-line skeleton: grey bars in the shape of the content while it loads. Never a spinner mid-page. */
export function Skeleton({ rows = 3, title = true }: { rows?: number; title?: boolean }) {
  const late = useDelayed();
  if (!late) return null;
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {title && <span className="hr-skel title mb-4" />}
      {Array.from({ length: rows }, (_, i) => <span key={i} className="hr-skel row" />)}
    </div>
  );
}

/**
 * The one row a table shows when it has no rows to show:
 * a skeleton while loading, a plain sentence if loading failed, otherwise the "nothing here" message.
 * `query` is the TanStack query the rows come from.
 */
export function EmptyRow({ query, colSpan, children }: { query: { isLoading: boolean; isError: boolean }; colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="!py-8 text-center text-ink-muted">
        {query.isLoading ? <Skeleton title={false} /> : query.isError ? "This list could not be loaded." : children}
      </td>
    </tr>
  );
}
