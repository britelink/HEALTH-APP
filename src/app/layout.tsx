import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthApp — AI Telemedicine",
  description: "Book doctors, run AI-assisted virtual consultations, and understand your care.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
