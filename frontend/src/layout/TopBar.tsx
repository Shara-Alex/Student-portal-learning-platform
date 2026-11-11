import { Avatar } from "@/components/ui/avatar";
import { useSections } from "@/lib/sections";
import { theme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { logout, useMe, useSchool, useTerms } from "@/modules/core/api";
import type { Term } from "@/modules/core/types";
import { modules } from "@/modules/registry";
import { GraduationCap, LogOut, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

/** "Term 1 · Week 5": the school's clock. Week 1 starts on the term's first day. */
function termAndWeek(terms: Term[] | undefined) {
  const term = terms?.find((t) => t.is_current);
  if (!term) return "";
  const days = Math.floor((Date.now() - new Date(term.start_date).getTime()) / 86_400_000);
  return days < 0 ? term.name : `${term.name} · Week ${Math.floor(days / 7) + 1}`;
}

/**
 * Homeroom's top bar: where you are on the left, that app's menu in the middle,
 * the term and the signed-in user on the right. The yellow stripe along the top is the system's signature.
 */
export function TopBar() {
  const me = useMe();
  const school = useSchool();
  const terms = useTerms();
  const { pathname } = useLocation();
  // "/students" -> the students module. On the home screen there is no current module.
  const current = modules.find((m) => pathname === `/${m.name}`);
  const { visible, current: tab } = useSections(current?.sections ?? []);
  const [mode, setMode] = useState<Theme>(theme.get());

  function toggleTheme() {
    const next = mode === "paper" ? "chalkboard" : "paper";
    theme.set(next);
    setMode(next);
  }

  const name = me.data?.full_name || me.data?.username || "";
  const icon = "rounded-sm p-2 hover:bg-sunken hover:text-ink";

  return (
    <header className="hr-topbar sticky top-0 z-40 print:hidden">
      <Link to="/" className="app text-ink no-underline" title="Home: all apps">
        <span className="dot">{current ? <current.icon size={15} /> : <GraduationCap size={15} />}</span>
        {current?.label ?? school.data?.name ?? "School"}
      </Link>
      <nav className="overflow-x-auto">
        {visible.map((s) => (
          <Link key={s.key} to={`/${current!.name}?tab=${s.key}`} className={cn("whitespace-nowrap", s.key === tab && "on")}>
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="me">
        <span className="hidden sm:inline">{termAndWeek(terms.data?.results)}</span>
        <button type="button" onClick={toggleTheme} className={icon} aria-label={mode === "paper" ? "Switch to the dark chalkboard theme" : "Switch to the light paper theme"}>
          {mode === "paper" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        {name && <Avatar name={name} />}
        <button type="button" onClick={logout} className={icon} aria-label="Sign out"><LogOut size={16} /></button>
      </div>
    </header>
  );
}
