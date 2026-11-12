import { useSections } from "@/lib/sections";
import { SchoolTab } from "./components/SchoolTab";
import { UsersTab } from "./components/UsersTab";
import { YearsTab } from "./components/YearsTab";
import { sections } from "./sections";

/** The Settings app (admins only). Which page shows is chosen from the tabs above the page. */
export function SettingsPage() {
  const { current } = useSections(sections);
  if (current === "school") return <SchoolTab />;
  if (current === "calendar") return <YearsTab />;
  return <UsersTab />;
}
