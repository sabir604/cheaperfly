import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { HotelDetail } from "@/components/hotels/hotel-detail";
import { readHotel } from "@/server/hotel-catalogue";
import { StateView } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { parseHotelCriteria } from "@/lib/engine/criteria";

export async function generateMetadata({ params }: PageProps<"/hotels/[slug]">): Promise<Metadata> {
  const {hotel} = await readHotel((await params).slug);
  return hotel ? { title: hotel.name } : {};
}

export default async function HotelPage({ params, searchParams }: PageProps<"/hotels/[slug]">) {
  await connection();
  const {hotel,status} = await readHotel((await params).slug);
  if (status===404) notFound();
  if (!hotel) return <div className="container-page py-16"><StateView tone="warning" title="We couldn’t load this hotel" description="Please try again shortly." actions={<ButtonLink href="/hotels">Search hotels</ButtonLink>} /></div>;
  const destination = hotel.city.toLowerCase();
  const criteria = parseHotelCriteria({ ...(await searchParams), dest: destination });
  if (!criteria) return <div className="container-page py-16"><StateView tone="warning" title="This hotel search isn’t valid" description="Choose valid dates, rooms and guest ages to see available rates." actions={<ButtonLink href="/hotels">Search hotels</ButtonLink>} /></div>;
  return <HotelDetail key={JSON.stringify(criteria)} hotel={hotel} criteria={criteria} />;
}
