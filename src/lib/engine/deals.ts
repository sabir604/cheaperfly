import dealRoutes from "@/data/json/DEAL_ROUTES.json";
import homeDestinations from "@/data/json/HOME_DESTINATIONS.json";
import { airportCityOf } from "@/lib/engine/airports";
import { addDaysISO, todayISO } from "@/lib/engine/dates";
import { apiRequest } from "@/lib/api/client";
import type { FlightCriteria, Offer } from "@/lib/types/flights";

export const DEAL_ROUTES = dealRoutes as { from: string; to: string }[];

export interface HomeDestination {
  to: string;
  city: string;
  country: string;
  /** Key into IMG. */
  image: string;
  tag: string;
}
export const HOME_DESTINATIONS = homeDestinations as HomeDestination[];

/** Return trip, 1 adult economy, departing `inDays` from today for `nights` nights. */
export function dealCriteria(from: string, to: string, inDays = 16, nights = 7): FlightCriteria {
  const dep = addDaysISO(todayISO(), inDays);
  return {
    trip: "return",
    legs: [
      { from, to, date: dep },
      { from: to, to: from, date: addDaysISO(dep, nights) },
    ],
    pax: { adults: 1, children: 0, infants: 0 },
    cabin: "economy",
  };
}

export interface Deal {
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  price: number;
  airlineCode: string;
  airlineName: string;
  stops: number;
  depart: string;
  ret: string;
  offer: Offer;
}

/** Cheapest Saver fare on a route, used for "from £…" prices on the home page. */
export async function cheapestDeal(from: string, to: string, inDays = 16, nights = 7): Promise<Deal | null> {
  const criteria = dealCriteria(from, to, inDays, nights);
  const offers = (await apiRequest<Offer[]>("public","flights/previews",{method:"POST",body:JSON.stringify(criteria)})).data;
  if (!offers.length) return null;
  const best = offers.reduce((a, b) =>
    a.fares[0].farePerAdult + a.fares[0].taxPerAdult <= b.fares[0].farePerAdult + b.fares[0].taxPerAdult ? a : b,
  );
  return {
    from,
    to,
    fromCity: airportCityOf(from),
    toCity: airportCityOf(to),
    price: best.fares[0].farePerAdult + best.fares[0].taxPerAdult,
    airlineCode: best.airlineCode,
    airlineName: best.airlineName,
    stops: Math.max(...best.legs.map((l) => l.stops)),
    depart: criteria.legs[0].date,
    ret: criteria.legs[1].date,
    offer: best,
  };
}
