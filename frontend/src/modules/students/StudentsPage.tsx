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
  const canEdit = me.data?.role === "admin"; // teachers get a read-only view

  if (current === "classes") return <ClassesTab canEdit={canEdit} />;
  if (current === "guardians") return <GuardiansTab canEdit={canEdit} />;
  return <StudentsTab canEdit={canEdit} />;
}
