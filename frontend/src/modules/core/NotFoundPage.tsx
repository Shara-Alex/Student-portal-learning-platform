import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

/**
 * Shown for an address that is not a page, or (denied) a page this login may not open.
 * The server would refuse the data anyway; this just says so plainly instead of showing an empty screen.
 */
export function NotFoundPage({ denied = false }: { denied?: boolean }) {
  return (
    <Card className="mx-auto max-w-xl space-y-3">
      <h1 className="text-2xl font-extrabold">{denied ? "This page is not part of your login" : "We cannot find that page"}</h1>
      <p className="text-ink-muted">
        {denied
          ? "Your role does not include this part of the system. If you need it, ask the school administrator."
          : "The address may be mistyped, or the page may have moved."}
      </p>
      <Link to="/" className="hr-btn hr-btn-primary">Back to Today</Link>
    </Card>
  );
}
