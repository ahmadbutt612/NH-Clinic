import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host") ?? "localhost:3000";
  const safeHost = /^[a-z0-9.:-]+$/i.test(host) ? host : "localhost:3000";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : safeHost.startsWith("localhost")
      ? "http"
      : "https";
  const baseUrl = new URL(`${protocol}://${safeHost}`);
  const socialImage = new URL("/og.png", baseUrl).toString();

  return {
    metadataBase: baseUrl,
    title: {
      default: "NH Gyne Clinic | Specialist Care in Lahore",
      template: "%s | NH Gyne Clinic",
    },
    description:
      "Book an appointment with Dr. Sofia Bano or Dr. Umar Farooq Shahzada at NH Gyne Clinic in Township, Lahore.",
    keywords: [
      "gynecologist Lahore",
      "women's health clinic Lahore",
      "pain specialist Lahore",
      "NH Gyne Clinic",
    ],
    openGraph: {
      title: "NH Gyne Clinic",
      description: "Thoughtful specialist care in Township, Lahore.",
      type: "website",
      images: [{ url: socialImage, width: 1732, height: 908, alt: "NH Gyne Clinic — Care that listens. Expertise you can trust." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "NH Gyne Clinic",
      description: "Thoughtful specialist care in Township, Lahore.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
