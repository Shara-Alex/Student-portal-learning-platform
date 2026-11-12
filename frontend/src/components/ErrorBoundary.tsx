import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches a crash in the screen inside it and shows a message instead of a blank page.
 * Without this, one broken component takes the whole app down with it.
 * (React only offers this as a class component; it is the one class in the app.)
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  // React calls this when something below crashes while drawing. We remember the error...
  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  // ...and log it, so the details are in the browser console for whoever fixes it.
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("A screen crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Card className="mx-auto max-w-xl space-y-3">
        <h1 className="text-2xl font-extrabold">This screen ran into a problem</h1>
        <p className="text-ink-muted">Nothing you saved has been lost, and the rest of the app still works. Try again, or go back to Today.</p>
        <p className="rounded-sm bg-sunken px-3 py-2 font-mono text-sm text-ink-muted">{this.state.error.message}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => this.setState({ error: null })}>Try again</Button>
          {/* A plain link (full page load) on purpose: it also clears whatever state caused the crash. */}
          <a href="/" className="hr-btn">Back to Today</a>
        </div>
      </Card>
    );
  }
}
