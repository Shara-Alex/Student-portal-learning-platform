import { useSections } from "@/lib/sections";
import { InvoicesTab } from "./components/InvoicesTab";
import { StructureTab } from "./components/StructureTab";
import { sections } from "./sections";

export function FeesPage() {
  const { current } = useSections(sections);
  return current === "structure" ? <StructureTab /> : <InvoicesTab />;
}
