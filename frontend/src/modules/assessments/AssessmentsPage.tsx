import { useSections } from "@/lib/sections";
import { GradingTab } from "./components/GradingTab";
import { MarkbookTab } from "./components/MarkbookTab";
import { ReportsTab } from "./components/ReportsTab";
import { sections } from "./sections";

/** The Gradebook app. Which section shows is chosen from the menu in the top bar. */
export function AssessmentsPage() {
  const { current } = useSections(sections);
  if (current === "reports") return <ReportsTab />;
  if (current === "grading") return <GradingTab />;
  return <MarkbookTab />;
}
