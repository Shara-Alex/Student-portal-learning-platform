import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageAlerts } from "@/components/PageAlerts";
import { auth } from "@/lib/auth";
import { useStored } from "@/lib/stored";
import { cn } from "@/lib/utils";
import { useMe } from "@/modules/core/api";
import { GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Rail } from "./Rail";
import { Sidebar } from "./Sidebar";
import { StatusFooter } from "./StatusFooter";
import { TabsBar } from "./TabsBar";
import { useLoadingStripe } from "./useLoadingStripe";

/**
 * Homeroom's AppShell: the frame every logged-in screen sits in.
 *
 *   ┌──────────┬──────────────────────────┬───────────┐
 *   │ Sidebar  │ Tabs: app name + pages   │ Right now │
 *   │ (apps)   ├──────────────────────────┤ Coming up │
 *   │          │ Page (<Outlet />)        │ Notices   │
 *   ├──────────┴──────────────────────────┴───────────┤
 *   │ Status footer: term · period · clock             │
 *   └──────────────────────────────────────────────────┘
 *
 * The layout itself is CSS grid in homeroom.css (.hr-shell). This component only sets classes on it:
 * side-collapsed, no-rail, side-open (phone menu), aria-busy and done (the loading stripe).
 * Only the page area animates; the sidebar, tabs, rail and footer stay still.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useStored("sidebar-collapsed", false); // desktop: sidebar shrunk to icons
  const [railOpen, setRailOpen] = useStored("rail-open", true);            // wide screens: the right-hand rail
  const [menuOpen, setMenuOpen] = useState(false);                         // phone: sidebar slid in over the page
  const { pathname, search } = useLocation();
  const me = useMe();
  const stripe = useLoadingStripe();

  // Picking a page in the phone menu should close the menu.
  useEffect(() => setMenuOpen(false), [pathname, search]);

  // Escape closes the phone menu too, as people expect from any pop-over.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // After the hooks on purpose: React needs the same hooks called in the same order on every draw.
  if (!auth.isLoggedIn()) return <Navigate to="/login" replace />;

  // A new key makes React build the page area afresh, which replays the hr-enter fade.
  // The app and its tab count as "a new page"; other things in the address (?child=, ?class=) do not.
  const pageKey = `${pathname}?${new URLSearchParams(search).get("tab") ?? ""}`;

  return (
    <div
      className={cn("hr-shell", !railOpen && "no-rail", collapsed && "side-collapsed", menuOpen && "side-open", stripe.done && "done")}
      aria-busy={stripe.busy || undefined}
    >
      <div className="hr-stripe" aria-hidden="true" />
      {/* First load only: until we know who is logged in there is nothing sensible to draw. */}
      {me.isPending && <Splash />}
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />
      {/* The dim layer behind the open phone menu. Tapping it closes the menu. */}
      {menuOpen && <div className="hr-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <main className="hr-main">
        <TabsBar onMenu={() => setMenuOpen(true)} railOpen={railOpen} onRail={() => setRailOpen(!railOpen)} />
        <div className="hr-page">
          <PageAlerts />
          {/* key={pathname}: moving to another app clears a crash message left by the last one. */}
          <ErrorBoundary key={pathname}>
            <div key={pageKey} className="hr-enter mx-auto max-w-6xl space-y-4">
              <Outlet />
            </div>
          </ErrorBoundary>
        </div>
      </main>
      <Rail />
      <StatusFooter />
    </div>
  );
}

/** Homeroom's splash: the school mark pulsing, a yellow pencil line drawing itself underneath. */
function Splash() {
  return (
    <div className="hr-splash" role="status">
      <div>
        <div className="mark"><GraduationCap size={26} /></div>
        <svg className="line" width="120" height="10" viewBox="0 0 120 10" aria-hidden="true"><path d="M4 6 C 30 2, 60 9, 116 4" /></svg>
        <p>Getting your day ready…</p>
      </div>
    </div>
  );
}
