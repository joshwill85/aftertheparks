import type { Metadata } from "next";
import { CorrectionsClient } from "@/app/corrections/CorrectionsClient";

export const metadata: Metadata = {
  title: "Contact After the Parks",
  description:
    "Send After the Parks a correction, source note, or feedback about Walt Disney World resort activity information.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/corrections" },
};

export default function CorrectionsPage() {
  return <CorrectionsClient />;
}
