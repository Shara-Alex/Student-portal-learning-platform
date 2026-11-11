/**
 * A module's sections are its menu in the top bar (Students: Students / Classes / Guardians).
 * The chosen one lives in the address bar as ?tab=classes, so a page can be bookmarked or refreshed.
 */
import { useMe } from "@/modules/core/api";
import type { Role } from "@/modules/core/types";
import { useSearchParams } from "react-router-dom";

export interface Section {
  key: string;
  label: string;
  roles?: Role[]; // leave out = everyone who can open the module
}

/** Which sections this user may see, and which one is open now (default: the first). */
export function useSections(sections: Section[]) {
  const me = useMe();
  const [params] = useSearchParams();
  const role = me.data?.role;
  const visible = sections.filter((s) => !s.roles || (role && s.roles.includes(role)));
  const wanted = params.get("tab");
  const current = visible.find((s) => s.key === wanted)?.key ?? visible[0]?.key ?? "";
  return { visible, current };
}
