import { ADMIN, inGroup, OFFICE } from "@/lib/roles";
import { useSections } from "@/lib/sections";
import { useMe } from "@/modules/core/api";
import { ClassesTab } from "./components/ClassesTab";
import { GuardiansTab } from "./components/GuardiansTab";
import { StudentsTab } from "./components/StudentsTab";
import { sections } from "./sections";

/** The Students app. Which section shows is chosen from the menu in the top bar. */
export function StudentsPage() {
  const { current } = useSections(sections);
  const me = useMe();
  // Admins and the front office keep student and guardian records; teachers and the bursar only read them.
  const canEdit = inGroup(me.data?.role, OFFICE);

  // Classes (and year-end promotion) stay with the admin alone.
  if (current === "classes") return <ClassesTab canEdit={inGroup(me.data?.role, ADMIN)} />;
  if (current === "guardians") return <GuardiansTab canEdit={canEdit} />;
  return <StudentsTab canEdit={canEdit} />;
}
