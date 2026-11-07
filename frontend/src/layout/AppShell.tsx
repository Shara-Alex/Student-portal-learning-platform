import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { logout, useMe, useSchool } from "@/modules/core/api";
import { modules } from "@/modules/registry";
import { LogOut } from "lucide-react";
import { Navigate, NavLink, Outlet } from "react-router-dom";

/** Sidebar + header wrapper around every logged-in page. */
export function AppShell() {
  if (!auth.isLoggedIn()) return <Navigate to="/login" replace />;
  const me = useMe();
  const school = useSchool();
  const visible = modules.filter((m) => !me.data || m.roles.includes(me.data.role));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <p className="truncate font-semibold">{school.data?.name ?? "School"}</p>
          <p className="text-xs text-slate-500 capitalize">{me.data?.role}</p>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {visible.map((m) => (
            <NavLink
              key={m.name}
              to={`/${m.name}`}
              end={m.name === ""}
              className={({ isActive }) =>
                cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", isActive ? "bg-brand/10 text-brand font-medium" : "text-slate-700 hover:bg-slate-100")
              }
            >
              <m.icon size={18} /> {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-2">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}><LogOut size={16} /> Sign out</Button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
