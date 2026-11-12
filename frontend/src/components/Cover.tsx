/**
 * Homeroom's Cover: the design system's own artwork, used beside the sign-in pages.
 * A chalkboard slab, a school-bus block and a pen block on ruled exercise-book paper with a red margin line.
 * Every colour is a token, so it follows the Paper and Chalkboard themes by itself.
 */
export function Cover({ title, tagline }: { title: string; tagline: string }) {
  const rule = { stroke: "var(--line-strong)", strokeWidth: 1 };
  return (
    <div className="relative hidden overflow-hidden border-r border-line md:flex md:flex-col md:justify-end md:p-8">
      {/* "slice" fills the panel and crops the overflow, like background-size: cover does for a photo. */}
      <svg viewBox="0 0 480 288" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
        {[160, 192, 224, 256].map((y) => <line key={y} x1="0" y1={y} x2="480" y2={y} style={rule} />)}
        <line x1="16" y1="0" x2="16" y2="288" style={{ stroke: "var(--marker)", strokeWidth: 1.5 }} />
        <rect x="48" y="-24" width="176" height="248" rx="18" style={{ fill: "var(--board)" }} />
        <rect x="240" y="32" width="144" height="96" rx="18" style={{ fill: "var(--bus)" }} />
        <rect x="400" y="32" width="96" height="96" rx="18" style={{ fill: "var(--pen)" }} />
        <rect x="240" y="144" width="144" height="112" rx="10" style={{ fill: "var(--board-soft)" }} />
        <rect x="400" y="144" width="96" height="24" rx="12" style={{ fill: "var(--marker)" }} />
        <rect x="256" y="168" width="64" height="24" rx="12" style={{ fill: "var(--board)" }} />
        <rect x="256" y="208" width="96" height="24" rx="12" style={{ fill: "var(--bus)" }} />
      </svg>
      <div className="relative max-w-md rounded-lg bg-raised p-6 shadow-card">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-ink-muted">{tagline}</p>
      </div>
    </div>
  );
}
