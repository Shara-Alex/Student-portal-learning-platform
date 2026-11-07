import { Card } from "@/components/ui/card";
import { useMe, useSchool } from "./api";

export function DashboardPage() {
  const me = useMe();
  const school = useSchool();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        Welcome{me.data ? `, ${me.data.first_name || me.data.username}` : ""}
      </h1>
      <Card>
        <p className="text-sm text-slate-500">School</p>
        <p className="text-lg font-medium">{school.data?.name ?? "Not set up yet — add it in /admin"}</p>
      </Card>
      <Card>
        <p className="text-sm text-slate-500">Coming next</p>
        <p>Upcoming events, attendance summary, fee balance and announcements will appear here.</p>
      </Card>
    </div>
  );
}
