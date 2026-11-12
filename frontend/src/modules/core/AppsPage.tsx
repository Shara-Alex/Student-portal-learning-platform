import { PageHeader } from "@/components/ui/page-header";
import { modules } from "@/modules/registry";
import { Link } from "react-router-dom";
import { useMe } from "./api";

/** The app menu: one tile per module this user may open (Homeroom's AppTile grid, like Odoo's home menu). */
export function AppsPage() {
  const role = useMe().data?.role;
  const apps = modules.filter((m) => role && m.roles.includes(role));
  return (
    <div className="space-y-6">
      <PageHeader title="Apps" />
      <div className="hr-apps !p-0">
        {apps.map((m) => (
          <Link key={m.name} to={`/${m.name}`} className="hr-app text-center">
            <i className={`c-${m.color}`}><m.icon size={28} /></i>
            {(role === "student" && m.studentLabel) || m.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
