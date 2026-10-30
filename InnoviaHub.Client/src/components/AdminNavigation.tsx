import type {ReactNode} from "react";
import {adminTabs, type AdminTab} from "./adminData";
import {IconDashboard, IconGrid, IconThermometer, IconUsers} from "./Icons";

type AdminNavigationProps = {
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  mobile?: boolean;
};

const tabIcons: Record<AdminTab, ReactNode> = {
  dashboard: <IconDashboard className="h-4 w-4"/>,
  sensors: <IconThermometer className="h-4 w-4"/>,
  resources: <IconGrid className="h-4 w-4"/>,
  members: <IconUsers className="h-4 w-4"/>,
};

export default function AdminNavigation({
                                          tab,
                                          onTabChange,
                                          mobile = false,
                                        }: AdminNavigationProps) {
  return (
    <nav aria-label="Adminmeny" className={mobile ? "flex flex-wrap gap-2" : "space-y-1"}>
      {adminTabs.map((item) => {
        const isActive = tab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={[
              "flex items-center gap-2.5 font-display font-medium transition-colors cursor-pointer",
              mobile ? "min-h-10 rounded-lg border px-3 text-sm" : "min-h-11 w-full rounded-xl px-3 text-sm",
              isActive
                ? "bg-teal/10 text-teal" + (mobile ? " border-teal/40" : "")
                : "text-muted hover:bg-panel hover:text-text" + (mobile ? " border-border" : ""),
            ].join(" ")}
          >
            {tabIcons[item.id]}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
