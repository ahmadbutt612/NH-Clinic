import type { Metadata } from "next";
import { SiteFooter, SiteHeader, WhatsAppFloat } from "../components/SiteHeader";
import { BookingExperience } from "./BookingExperience";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Choose a doctor and reserve an available 30-minute appointment at NH Gyne Clinic.",
};

export default function BookingPage() {
  return (
    <>
      <SiteHeader compact />
      <main className="booking-page">
        <BookingExperience />
      </main>
      <SiteFooter />
      <WhatsAppFloat message="Hello NH Gyne Clinic, I need help booking an appointment." />
    </>
  );
}
