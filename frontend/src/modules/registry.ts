/**
 * The module registry — the equivalent of Odoo's app menu.
 * To add a module: create src/modules/<name>/, then add one entry here.
 * The home screen's app tiles, the top bar menu and the router are all generated from this list.
 */
import type { Section } from "@/lib/sections";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Users } from "lucide-react";
import type { ComponentType } from "react";
import { AcademicsPage } from "./academics/AcademicsPage";
import { sections as academicsSections } from "./academics/sections";
import type { Role } from "./core/types";
import { sections as studentsSections } from "./students/sections";
import { StudentsPage } from "./students/StudentsPage";

export interface Module {
  name: string;         // folder name, also the URL: /students
  label: string;        // shown under the app tile and in the top bar
  icon: LucideIcon;
  /** Tile colour. Homeroom's five app colours; keep one per app. */
  color: "board" | "bus" | "pen" | "crayon" | "marker";
  page: ComponentType;
  roles: Role[];        // who sees it
  sections: Section[];  // the app's menu in the top bar
}

// Order = order of the tiles on the home screen.
export const modules: Module[] = [
  { name: "students", label: "Students", icon: Users, color: "board", page: StudentsPage, roles: ["admin", "teacher"], sections: studentsSections },
  { name: "academics", label: "Academics", icon: BookOpen, color: "pen", page: AcademicsPage, roles: ["admin", "teacher"], sections: academicsSections },
];
