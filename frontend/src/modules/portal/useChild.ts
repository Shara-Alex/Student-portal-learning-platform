import { useStudents } from "@/modules/students/api";
import { useSearchParams } from "react-router-dom";

/**
 * Which child the portal is showing. The server only sends a parent their own
 * children (and a student only themselves), so this list is already the right one.
 * The choice lives in the address as ?child=12 so a refresh keeps it.
 */
export function useChild() {
  const students = useStudents({});
  const [params, setParams] = useSearchParams();
  const children = students.data?.results ?? [];
  const child = children.find((s) => String(s.id) === params.get("child")) ?? children[0];

  function setChild(id: string) {
    const next = new URLSearchParams(params);
    next.set("child", id);
    setParams(next);
  }
  return { children, child, setChild, loading: students.isLoading };
}
