/**
 * The module registry — the equivalent of Odoo's app menu.
 * To add a module: create src/modules/<name>/, then add one entry here.
 * The sidebar, the apps menu, the tab bar and the router are all generated from this list.
 */
import { ADMIN, ALL_STAFF, EVERYONE, FAMILY, FINANCE, OFFICE, TEACHING } from "@/lib/roles";
import type { Section } from "@/lib/sections";
import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarDays, ClipboardCheck, ClipboardList, Mail, Settings, UserPlus, Users, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import { AcademicsPage } from "./academics/AcademicsPage";
import { sections as academicsSections } from "./academics/sections";
import { AdmissionsPage } from "./admissions/AdmissionsPage";
import { sections as admissionsSections } from "./admissions/sections";
import { AssessmentsPage } from "./assessments/AssessmentsPage";
import { sections as assessmentsSections } from "./assessments/sections";
import { AttendancePage } from "./attendance/AttendancePage";
import { sections as attendanceSections } from "./attendance/sections";
import { CommunicationPage } from "./communication/CommunicationPage";
import { sections as communicationSections } from "./communication/sections";
import type { Role } from "./core/types";
import { EventsPage } from "./events/EventsPage";
import { sections as eventsSections } from "./events/sections";
import { FeesPage } from "./fees/FeesPage";
import { sections as feesSections } from "./fees/sections";
import { PortalPage } from "./portal/PortalPage";
import { sections as portalSections } from "./portal/sections";
import { sections as settingsSections } from "./settings/sections";
import { SettingsPage } from "./settings/SettingsPage";
import { sections as studentsSections } from "./students/sections";
import { StudentsPage } from "./students/StudentsPage";

/** The sidebar's headings. Staff see their apps under these; families have so few apps that they see none. */
export type Group = "classroom" | "people" | "office";
export const GROUPS: { key: Group; label: string }[] = [
  { key: "classroom", label: "Classroom" },
  { key: "people", label: "People" },
  { key: "office", label: "Office" },
];

export interface Module {
  name: string;          // folder name, also the URL: /students
  label: string;         // shown under the app tile and in the top bar
  studentLabel?: string; // a different label when a student is signed in
  icon: LucideIcon;
  /** Tile colour. Homeroom's five app colours. */
  color: "board" | "bus" | "pen" | "crayon" | "marker";
  page: ComponentType;
  roles: Role[];         // who sees it
  group: Group;          // its heading in the sidebar
  sections: Section[];   // the app's pages, shown as tabs above the page
}

// Who sees each app comes from the role groups in lib/roles.ts (the same groups the backend uses).
// Order = order of the tiles. Teachers' daily tools first, the office last (a Homeroom rule).
export const modules: Module[] = [
  { name: "portal", label: "My children", studentLabel: "My school record", icon: Users, color: "board", page: PortalPage, roles: FAMILY, group: "people", sections: portalSections },
  { name: "attendance", label: "Attendance", icon: ClipboardCheck, color: "bus", page: AttendancePage, roles: TEACHING, group: "classroom", sections: attendanceSections },
  { name: "assessments", label: "Gradebook", icon: ClipboardList, color: "crayon", page: AssessmentsPage, roles: TEACHING, group: "classroom", sections: assessmentsSections },
  { name: "academics", label: "Academics", icon: BookOpen, color: "pen", page: AcademicsPage, roles: TEACHING, group: "classroom", sections: academicsSections },
  { name: "students", label: "Students", icon: Users, color: "board", page: StudentsPage, roles: ALL_STAFF, group: "people", sections: studentsSections },
  { name: "communication", label: "Messages", icon: Mail, color: "pen", page: CommunicationPage, roles: EVERYONE, group: "people", sections: communicationSections },
  { name: "events", label: "Calendar", icon: CalendarDays, color: "board", page: EventsPage, roles: EVERYONE, group: "office", sections: eventsSections },
  { name: "fees", label: "Fees", icon: Wallet, color: "marker", page: FeesPage, roles: FINANCE, group: "office", sections: feesSections },
  { name: "admissions", label: "Admissions", icon: UserPlus, color: "crayon", page: AdmissionsPage, roles: OFFICE, group: "office", sections: admissionsSections },
  // No backend folder of its own: it manages what lives in the backend's core app (users, the school, years and terms).
  { name: "settings", label: "Settings", icon: Settings, color: "pen", page: SettingsPage, roles: ADMIN, group: "office", sections: settingsSections },
];
