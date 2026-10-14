import { BedDouble, CalendarClock, CreditCard, Luggage, Moon, Plane, Ticket, Undo2, UserRound, type LucideIcon } from "lucide-react";
import type { HelpIcon as HelpIconName } from "@/data/help";

const ICONS: Record<HelpIconName, LucideIcon> = {
  plane: Plane,
  hotel: BedDouble,
  moon: Moon,
  ticket: Ticket,
  card: CreditCard,
  calendar: CalendarClock,
  undo: Undo2,
  luggage: Luggage,
  user: UserRound,
};

export function HelpIcon({ icon, className = "h-5 w-5" }: { icon: HelpIconName; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden />;
}
