import { useSections } from "@/lib/sections";
import { RegisterTab } from "./components/RegisterTab";
import { SummaryTab } from "./components/SummaryTab";
import { sections } from "./sections";

export function AttendancePage() {
  const { current } = useSections(sections);
  return current === "summary" ? <SummaryTab /> : <RegisterTab />;
}
