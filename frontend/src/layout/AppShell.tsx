import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { StatusFooter } from "./StatusFooter";
import { TabsBar } from "./TabsBar";

/**
 * Homeroom's AppShell: the frame every logged-in screen sits in.
 *
 *   ┌──────────┬──────────────────────────┐
 *   │ Sidebar  │ Tabs: app name + pages   │
 *   │ (apps)   ├──────────────────────────┤
 *   │          │ Page (<Outlet />)        │
 *   ├──────────┴──────────────────────────┤
 *   │ Status footer: term · period · clock │
 *   └─────────────────────────────────────┘
 *
 * The layout itself is CSS grid in homeroom.css (.hr-shell). The right-hand rail comes in the next step;
 * until then "no-rail" gives its column zero width.
 */
export function AppShell() {
  const [collapsed, setCollapsed] = useState(false); // desktop: sidebar shrunk to icons
  const [menuOpen, setMenuOpen] = useState(false);   // phone: sidebar slid in over the page
  const { pathname, search } = useLocation();

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

  return (
    <div className={cn("hr-shell no-rail", collapsed && "side-collapsed", menuOpen && "side-open")}>
      <div className="hr-stripe" aria-hidden="true" />
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />
      {/* The dim layer behind the open phone menu. Tapping it closes the menu. */}
      {menuOpen && <div className="hr-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <main className="hr-main">
        <TabsBar onMenu={() => setMenuOpen(true)} />
        <div className="hr-page">
          <div className="mx-auto max-w-6xl space-y-4">
            <Outlet />
          </div>
        </div>
      </main>
      <StatusFooter />
    </div>
  );
}
