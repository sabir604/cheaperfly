import type { Metadata } from "next";
import { FlightResults } from "@/components/flights/flight-results";
import { ButtonLink } from "@/components/ui/button";
import { StateView } from "@/components/ui/feedback";
import { parseFlightCriteria } from "@/lib/engine/criteria";

export const metadata: Metadata = { title: "Flight results" };

export default async function FlightSearchPage({ searchParams }: PageProps<"/flights/search">) {
  const criteria = parseFlightCriteria(await searchParams);
  if (!criteria)
    return (
      <div className="container-page py-16">
        <StateView
          tone="warning"
          title="That search link isn't valid"
          description="Some details are missing or out of date. Start a new flight search and we'll take it from there."
          actions={<ButtonLink href="/flights">Search flights</ButtonLink>}
        />
      </div>
    );
  return <FlightResults key={JSON.stringify(criteria)} criteria={criteria} />;
}
