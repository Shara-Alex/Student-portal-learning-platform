import { useSections } from "@/lib/sections";
import { useMe } from "@/modules/core/api";
import { CalendarTab } from "./components/CalendarTab";
import { NoticesTab } from "./components/NoticesTab";
import { sections } from "./sections";

export function EventsPage() {
  const { current } = useSections(sections);
  const canEdit = useMe().data?.role === "admin";
  return current === "notices" ? <NoticesTab canEdit={canEdit} /> : <CalendarTab canEdit={canEdit} />;
}
