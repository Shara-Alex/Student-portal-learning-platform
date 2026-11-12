import { Cover } from "@/components/Cover";
import { usePublicSchool } from "@/modules/admissions/api";
import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The frame shared by the pages you see before signing in (sign in, forgot password, new password):
 * the Homeroom cover on the left on wide screens, a small card on the right.
 */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  // The school's name is public (the application form shows it too), so no login is needed to ask for it.
  const school = usePublicSchool().data?.school || "School portal";
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <Cover title={school} tagline="Marks, registers, fees and the school day in one place." />
      <div className="flex items-center justify-center p-4">
        {/* The inset yellow line is Homeroom's signature stripe. */}
        <div className="w-full max-w-sm overflow-hidden rounded-lg bg-raised p-6 [box-shadow:inset_0_3px_0_var(--bus),var(--shadow-lift)]">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-board text-on-board"><GraduationCap size={24} /></div>
            <div>
              <h1 className="text-lg font-extrabold">{title}</h1>
              <p className="text-sm text-ink-muted">{school}</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
