/** A round badge with a person's initials: "Tendai Moyo" -> TM. */
export function Avatar({ name }: { name: string }) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
  return <span className="hr-avatar" aria-hidden="true">{initials || "?"}</span>;
}
