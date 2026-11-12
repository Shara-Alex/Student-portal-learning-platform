import { useSections } from "@/lib/sections";
import { MessagesTab } from "./components/MessagesTab";
import { sections } from "./sections";

export function CommunicationPage() {
  const { current } = useSections(sections);
  // key: switching between Inbox and Sent starts the list afresh
  return <MessagesTab key={current} box={current === "sent" ? "sent" : "inbox"} />;
}
