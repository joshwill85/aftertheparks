import { permanentRedirect } from "next/navigation";

export default function LegacyFirstNightGuideRedirect() {
  permanentRedirect("/guides/first-night-at-disney-resort");
}
