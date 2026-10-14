import {
  Accessibility,
  AirVent,
  Baby,
  BedDouble,
  Briefcase,
  Building2,
  Bus,
  CarFront,
  Clock,
  ConciergeBell,
  Droplets,
  Dumbbell,
  Flower2,
  Moon,
  Plug,
  Shirt,
  Sparkles,
  Umbrella,
  Utensils,
  UtensilsCrossed,
  WavesHorizontal,
  Wifi,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { AMENITY_LABELS } from "@/data/hotels";

const ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  pool: WavesHorizontal,
  indoor_pool: WavesHorizontal,
  spa: Sparkles,
  gym: Dumbbell,
  restaurant: Utensils,
  bar: Wine,
  parking: CarFront,
  shuttle: Bus,
  family: BedDouble,
  kids: Baby,
  beach: Umbrella,
  ac: AirVent,
  frontdesk: Clock,
  concierge: ConciergeBell,
  roomservice: UtensilsCrossed,
  business: Briefcase,
  laundry: Shirt,
  accessible: Accessibility,
  prayer: Moon,
  halal: UtensilsCrossed,
  haram_shuttle: Bus,
  zamzam: Droplets,
  kitchen: Flower2,
  ev: Plug,
};

export function AmenityIcon({ id, className }: { id: string; className?: string }) {
  const Icon = ICONS[id] ?? Building2;
  return <Icon className={className ?? "h-4 w-4"} aria-hidden />;
}

export const amenityLabel = (id: string) => AMENITY_LABELS[id] ?? id;

export function AmenityChips({ ids, limit = 4 }: { ids: string[]; limit?: number }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {ids.slice(0, limit).map((id) => (
        <li key={id} className="flex items-center gap-1.5 text-xs text-slate-600">
          <AmenityIcon id={id} className="h-3.5 w-3.5 text-slate-400" /> {amenityLabel(id)}
        </li>
      ))}
    </ul>
  );
}
