import type { IconName } from "../icon";

export const NAV: { href: string; label: string; icon: IconName; mobile: boolean }[] = [
  { href: "/discover", label: "Discover", icon: "compass", mobile: true },
  { href: "/board", label: "Board", icon: "kanban", mobile: true },
  { href: "/team", label: "Team", icon: "users-three", mobile: true },
  { href: "/projects", label: "Projects", icon: "folder-simple", mobile: true },
  { href: "/portfolio", label: "Portfolio", icon: "trophy", mobile: true },
  { href: "/settings", label: "Settings", icon: "gear-six", mobile: false },
];
