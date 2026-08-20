"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/useChat";
import {
  LayoutDashboard,
  ListChecks,
  Users,
  FileBarChart,
  UserCircle,
  Bell,
  ArrowRightLeft,
  ClipboardList,
  MessageSquare,
  CalendarClock,
  PartyPopper,
  CalendarDays,
  Camera,
  PackageCheck,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/tasks", label: "Tasks", icon: ListChecks, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/meetings", label: "Meetings", icon: CalendarClock, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/transfers", label: "Transfers", icon: ArrowRightLeft, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/holidays", label: "Holidays", icon: PartyPopper, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/leave", label: "Leave", icon: CalendarDays, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/shoots", label: "Shoots", icon: Camera, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/deliveries", label: "Deliverables", icon: PackageCheck, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/employees", label: "Employees", icon: Users, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/dashboard/reports", label: "Reports", icon: FileBarChart, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle, roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"] },
  {
    href: "/dashboard/work-log",
    label: "Work Log",
    icon: ClipboardList,
    roles: ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"],
  },
];
type SidebarProps = {
  role: string;
  onNavigate?: () => void;
};

export function Sidebar({
  role,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: convoData } = useConversations();
  const unreadMessages = (convoData?.items ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-background p-4">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 font-bold text-primary">
          AFX
        </div>
        <span className="text-lg font-semibold">Avan Flix</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.filter((item) => item.roles.includes(role)).map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const badgeCount = item.href === "/dashboard/messages" ? unreadMessages : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
        Signed in as{" "}
        <span className="font-medium text-foreground">
          {role.replace("_", " ")}
        </span>
      </div>
    </aside>
  );
}
