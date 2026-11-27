import type { CSSProperties } from "react";

export type IconName =
  | "compass" | "kanban" | "users-three" | "folder-simple" | "trophy" | "gear-six"
  | "plus" | "funnel-simple" | "arrow-clockwise" | "calendar-blank" | "clock"
  | "magnifying-glass" | "caret-down" | "x" | "check" | "warning-circle" | "arrow-right" | "timer-fill" | "star-fill";

/** An SVG from /public/icons, painted in the current text colour. Decorative unless `label` is given. */
export function Icon({ name, size = 18, label, className = "" }: { name: IconName; size?: number; label?: string; className?: string }) {
  const style = { "--icon": `url(/icons/${name}.svg)`, "--icon-size": `${size}px` } as CSSProperties;
  return label ? (
    <span role="img" aria-label={label} className={`icon ${className}`} style={style} />
  ) : (
    <span aria-hidden className={`icon ${className}`} style={style} />
  );
}
