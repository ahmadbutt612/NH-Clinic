import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import { DoctorPortal } from "./DoctorPortal";

export const metadata: Metadata = {
  title: "Doctor Portal",
  robots: { index: false, follow: false },
};

export default function DoctorPage() {
  return (
    <>
      <SiteHeader compact />
      <main className="doctor-page"><DoctorPortal /></main>
    </>
  );
}
