import { Avatar } from "@/components/ui/avatar";
import { useSections } from "@/lib/sections";
import { theme, type Theme } from "@/lib/theme";
import { logout, useMe } from "@/modules/core/api";
import { modules } from "@/modules/registry";
import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

/**
 * The bar above the page: which app you are in and its pages (Students · Classes · Guardians),
 * then your tools on the right. Sidebar = which app; tabs = which page of it.
 * The bus-yellow stripe sits above this bar, on the shell itself.
 */
export function TabsBar({ onMenu }: { onMenu: () => void }) {
  const me = useMe();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  // "/students" -> the students module. On Today and the apps menu there is no current module.
  const current = modules.find((m) => pathname === `/${m.name}`);
  const { visible, current: tab } = useSections(current?.sections ?? []);
  const [mode, setMode] = useState<Theme>(theme.get());

  function toggleTheme() {
    const next = mode === "paper" ? "chalkboard" : "paper";
    theme.set(next);
    setMode(next);
  }

  // The portal keeps "which child" in the address; carry it along when switching page.
  const child = params.get("child");
  const name = me.data?.full_name || me.data?.username || "";
  const title = current
    ? (me.data?.role === "student" && current.studentLabel) || current.label
    : pathname === "/apps" ? "Apps" : "Today";

  return (
    <div className="hr-tabs">
      {/* Phones only (styles/app.css): opens the sidebar as a slide-in menu. */}
      <button type="button" className="hr-iconbtn hr-menu-btn" onClick={onMenu} aria-label="Open the menu">
        <Menu />
      </button>
      <h2>{title}</h2>
      {visible.length > 1 && (
        // Scrolls sideways when the pages do not fit, instead of squashing them.
        <nav className="flex min-w-0 gap-1 overflow-x-auto">
          {visible.map((s) => (
            <Link
              key={s.key}
              to={`/${current!.name}?tab=${s.key}${child ? `&child=${child}` : ""}`}
              aria-current={s.key === tab ? "page" : undefined}
              className="whitespace-nowrap"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="tools">
        <button type="button" onClick={toggleTheme} className="hr-iconbtn" aria-label={mode === "paper" ? "Switch to the dark chalkboard theme" : "Switch to the light paper theme"}>
          {mode === "paper" ? <Moon /> : <Sun />}
        </button>
        {name && <span title={name}><Avatar name={name} /></span>}
        <button type="button" onClick={logout} className="hr-iconbtn" aria-label="Sign out"><LogOut /></button>
      </div>
    </div>
  );
}
