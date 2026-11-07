/**
 * The module registry — the equivalent of Odoo's app menu.
 * To add a module: create src/modules/<name>/, then add one entry here.
 * The sidebar and the router are both generated from this list.
 */
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard } from "lucide-react";
import type { ComponentType } from "react";
import type { Role } from "./core/types";
import { DashboardPage } from "./core/DashboardPage";

export interface Module {
  name: string;       // folder name, also the URL: /students
  label: string;      // shown in the sidebar
  icon: LucideIcon;
  page: ComponentType;
  roles: Role[];      // who sees it
}

export const modules: Module[] = [
  { name: "", label: "Dashboard", icon: LayoutDashboard, page: DashboardPage, roles: ["admin", "teacher", "parent", "student"] },
  // { name: "students", label: "Students", icon: Users, page: StudentsPage, roles: ["admin", "teacher"] },
];
