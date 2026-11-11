import { useSections } from "@/lib/sections";
import { useMe } from "@/modules/core/api";
import { AssignmentsTab } from "./components/AssignmentsTab";
import { MyTimetableTab } from "./components/MyTimetableTab";
import { PeriodsTab } from "./components/PeriodsTab";
import { SubjectsTab } from "./components/SubjectsTab";
import { TimetableTab } from "./components/TimetableTab";
import { sections } from "./sections";

/** The Academics app. Which section shows is chosen from the menu in the top bar. */
export function AcademicsPage() {
  const { current } = useSections(sections);
  const me = useMe();
  const canEdit = me.data?.role === "admin";

  if (current === "mine") return <MyTimetableTab />;
  if (current === "assignments") return <AssignmentsTab canEdit={canEdit} />;
  if (current === "subjects") return <SubjectsTab canEdit={canEdit} />;
  if (current === "periods") return <PeriodsTab canEdit={canEdit} />;
  return <TimetableTab canEdit={canEdit} />;
}
