export type AdminTab = "dashboard" | "sensors" | "resources" | "members";

export const adminTabs: { id: AdminTab; label: string }[] = [
  {id: "dashboard", label: "Översikt"},
  {id: "sensors", label: "Sensorer"},
  {id: "resources", label: "Resurser"},
  {id: "members", label: "Medlemmar"},
];
