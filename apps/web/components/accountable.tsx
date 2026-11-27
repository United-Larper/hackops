import { Icon } from "@/components/icon";

const MEANS = "Accountable: this person owns the hackathon. They saved the team, and it shows as theirs on the board.";

/** The star for the one accountable person on a hackathon. Hover or focus shows what it means. */
export function Accountable() {
  // Gold only ever sits on ink (DESIGN.md), so the star gets an ink chip.
  return (
    <span tabIndex={0} title={MEANS} className="grid size-[20px] shrink-0 cursor-help place-items-center rounded-[3px] bg-rail text-gold">
      <Icon name="star-fill" size={13} label={MEANS} />
    </span>
  );
}
