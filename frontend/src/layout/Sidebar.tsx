import { ALL_STAFF, inGroup, OFFICE, TEACHING } from "@/lib/roles";
import { useApplications } from "@/modules/admissions/api";
import { useMyRegisters } from "@/modules/attendance/api";
import { useUnreadCount } from "@/modules/communication/api";
import { schoolLogoUrl, useMe, useSchool } from "@/modules/core/api";
import { GROUPS, modules, type Module } from "@/modules/registry";
import { GraduationCap, LayoutGrid, PanelLeftClose, PanelLeftOpen, Sun, type LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

/**
 * Homeroom's sidebar: where you can go. Today on its own, then the apps this role may open, in groups.
 * A small yellow number shows work waiting (counts only, never words).
 * On tablets it shrinks to icons; on phones it is a menu that slides in (see styles/app.css).
 */
export function Sidebar({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: () => void }) {
  const me = useMe();
  const school = useSchool();
  const { pathname } = useLocation();
  const counts = useCounts();
  const role = me.data?.role;
  const isStaff = inGroup(role, ALL_STAFF);
  const mine = modules.filter((m) => role && m.roles.includes(role));
  const label = (m: Module) => (role === "student" && m.studentLabel) || m.label;
  const item = (m: Module) => (
    <Item key={m.name} to={`/${m.name}`} icon={m.icon} label={label(m)} active={pathname === `/${m.name}`} count={counts[m.name]} />
  );

  return (
    <aside className="hr-side" aria-label="Apps">
      <div className="school">
        <span className="hr-logo-slot" title="School logo">
          {school.data?.has_logo ? <img src={schoolLogoUrl()} alt="" className="size-8 rounded-sm object-cover" /> : <GraduationCap />}
        </span>
        <div className="min-w-0">
          <b className="block truncate">{school.data?.name ?? "School"}</b>
          <small>School portal</small>
        </div>
      </div>

      <nav>
        <Item to="/" icon={Sun} label="Today" active={pathname === "/"} />
        {isStaff
          ? GROUPS.map((g) => {
              const inGroup = mine.filter((m) => m.group === g.key);
              if (!inGroup.length) return null; // only the groups this role can open
              return (
                <div key={g.key} className="contents">
                  <div className="grp">{g.label}</div>
                  {inGroup.map(item)}
                </div>
              );
            })
          : mine.map(item) /* families have three items, so no group headings */}
      </nav>

      <div className="foot">
        <Item to="/apps" icon={LayoutGrid} label="All apps" active={pathname === "/apps"} />
        <button type="button" onClick={onCollapse} className="collapse-btn flex h-9 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-[14px] font-bold text-ink-muted hover:bg-sunken hover:text-ink">
          {collapsed ? <PanelLeftOpen size={18} className="shrink-0" /> : <PanelLeftClose size={18} className="shrink-0" />}
          <span className="label">{collapsed ? "Expand" : "Collapse"}</span>
        </button>
      </div>
    </aside>
  );
}

function Item({ to, icon: Icon, label, active, count }: { to: string; icon: LucideIcon; label: string; active: boolean; count?: number }) {
  return (
    // aria-current tells screen readers (and the stylesheet) which page is open.
    // title shows the name on hover when the sidebar is only icons.
    <Link to={to} aria-current={active ? "page" : undefined} title={label}>
      <Icon />
      <span className="label">{label}</span>
      {!!count && <span className="count" aria-label={`${count} waiting`}>{count}</span>}
    </Link>
  );
}

/** How much is waiting in each app, by module name. Each count is only asked for by a role that may see it. */
function useCounts(): Record<string, number> {
  const role = useMe().data?.role;
  const registers = useMyRegisters(inGroup(role, TEACHING));
  const applications = useApplications(inGroup(role, OFFICE));
  const unread = useUnreadCount();
  return {
    attendance: (registers.data ?? []).filter((r) => !r.submitted).length,
    admissions: (applications.data ?? []).filter((a) => a.status === "applied").length,
    communication: unread.data?.count ?? 0,
  };
}
