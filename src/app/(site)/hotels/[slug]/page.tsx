import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { HotelDetail } from "@/components/hotels/hotel-detail";
import { getHotel } from "@/data/hotels";
import { parseHotelCriteria } from "@/lib/engine/criteria";

export async function generateMetadata({ params }: PageProps<"/hotels/[slug]">): Promise<Metadata> {
  const hotel = getHotel((await params).slug);
  return hotel ? { title: hotel.name } : {};
}

export default async function HotelPage({ params, searchParams }: PageProps<"/hotels/[slug]">) {
  await connection();
  const hotel = getHotel((await params).slug);
  if (!hotel) notFound();
  const destination = hotel.city.toLowerCase();
  // A stale or partial link still opens the hotel, with the search-form defaults.
  const criteria = parseHotelCriteria({ ...(await searchParams), dest: destination }) ?? parseHotelCriteria({}, destination)!;
  return <HotelDetail key={JSON.stringify(criteria)} hotel={hotel} criteria={criteria} />;
}
