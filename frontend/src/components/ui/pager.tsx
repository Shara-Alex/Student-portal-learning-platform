import { Button } from "./button";

/**
 * The line under a long list: how many there are, and Previous / Next when there is more than one page.
 * `data` is the paged answer from the API ({count, next, previous, results}).
 */
export function Pager({ data, page, onPage, noun }: {
  data?: { count: number; next: string | null; previous: string | null };
  page: number;
  onPage: (page: number) => void;
  noun: string; // "student", "message": what one row is called
}) {
  return (
    <div className="flex items-center justify-between text-sm text-ink-muted">
      <span>{data?.count ?? 0} {noun}(s)</span>
      {/* With one page there is nothing to turn, so the buttons stay away. */}
      {(data?.previous || data?.next) && (
        <div className="flex gap-2">
          <Button variant="default" disabled={!data.previous} onClick={() => onPage(page - 1)}>Previous</Button>
          <Button variant="default" disabled={!data.next} onClick={() => onPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
