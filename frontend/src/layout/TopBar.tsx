import { Avatar } from "@/components/ui/avatar";
import { useSections } from "@/lib/sections";
import { currentTerm, termAndWeek } from "@/lib/term";
import { theme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { logout, useMe, useSchool, useTerms } from "@/modules/core/api";
import { modules } from "@/modules/registry";
import { GraduationCap, LayoutGrid, LogOut, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

/**
 * Homeroom's top bar: the apps menu and where you are on the left, that app's menu in the middle,
 * the term and the signed-in user on the right. The yellow stripe along the top is the system's signature.
 */
export function TopBar() {
  const me = useMe();
  const school = useSchool();
  const terms = useTerms();
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

  // The portal keeps "which child" in the address; carry it along when switching section.
  const child = params.get("child");
  const name = me.data?.full_name || me.data?.username || "";
  const title = current ? (me.data?.role === "student" && current.studentLabel) || current.label : school.data?.name ?? "School";
  const icon = "rounded-sm p-2 hover:bg-sunken hover:text-ink";

  return (
    <header className="hr-topbar sticky top-0 z-40 !gap-4 print:hidden">
      <Link to="/apps" className={cn(icon, "flex items-center gap-2 font-bold text-ink-muted no-underline", pathname === "/apps" && "bg-board-soft text-board")} title="All apps">
        <LayoutGrid size={18} /> <span className="hidden sm:inline">Apps</span>
      </Link>
      <Link to="/" className="app text-ink no-underline" title="Today">
        <span className="dot">{current ? <current.icon size={15} /> : <GraduationCap size={15} />}</span>
        <span className="whitespace-nowrap">{title}</span>
      </Link>
      <nav className="overflow-x-auto">
        {visible.length > 1 && visible.map((s) => (
          <Link key={s.key} to={`/${current!.name}?tab=${s.key}${child ? `&child=${child}` : ""}`} className={cn("whitespace-nowrap", s.key === tab && "on")}>
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="me">
        <span className="hidden whitespace-nowrap md:inline">{termAndWeek(currentTerm(terms.data?.results))}</span>
        <button type="button" onClick={toggleTheme} className={icon} aria-label={mode === "paper" ? "Switch to the dark chalkboard theme" : "Switch to the light paper theme"}>
          {mode === "paper" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        {name && <Avatar name={name} />}
        <button type="button" onClick={logout} className={icon} aria-label="Sign out"><LogOut size={16} /></button>
      </div>
    </header>
  );
}
