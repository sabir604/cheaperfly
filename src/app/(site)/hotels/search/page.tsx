import type { Metadata } from "next";
import { HotelResults } from "@/components/hotels/hotel-results";
import { ButtonLink } from "@/components/ui/button";
import { StateView } from "@/components/ui/feedback";
import { parseHotelCriteria } from "@/lib/engine/criteria";

export const metadata: Metadata = { title: "Hotel results" };

export default async function HotelSearchPage({ searchParams }: PageProps<"/hotels/search">) {
  const criteria = parseHotelCriteria(await searchParams);
  if (!criteria)
    return (
      <div className="container-page py-16">
        <StateView
          tone="warning"
          title="That search link isn't valid"
          description="Some details are missing or out of date. Start a new hotel search and we'll take it from there."
          actions={<ButtonLink href="/hotels">Search hotels</ButtonLink>}
        />
      </div>
    );
  return <HotelResults key={JSON.stringify(criteria)} criteria={criteria} />;
}
