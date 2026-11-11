import { auth } from "@/lib/auth";
import { Navigate, Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";

/** Wraps every logged-in page: the top bar, then the page on the paper background. */
export function AppShell() {
  if (!auth.isLoggedIn()) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
