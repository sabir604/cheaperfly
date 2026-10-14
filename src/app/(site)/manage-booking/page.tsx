import type { Metadata } from "next";
import { LookupForm } from "@/components/manage/lookup-form";

export const metadata: Metadata = { title: "Manage booking" };

export default function ManageBookingPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <LookupForm />
    </div>
  );
}
