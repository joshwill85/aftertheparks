import type { Metadata } from "next";

type VerificationEnv = {
  GOOGLE_SITE_VERIFICATION?: string;
  BING_SITE_VERIFICATION?: string;
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?: string;
  NEXT_PUBLIC_BING_SITE_VERIFICATION?: string;
};

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function buildSiteVerificationMetadata(
  env?: VerificationEnv
): Pick<Metadata, "verification"> {
  const source = env ?? process.env;
  const google = clean(
    source.GOOGLE_SITE_VERIFICATION ??
      source.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  );
  const bing = clean(
    source.BING_SITE_VERIFICATION ?? source.NEXT_PUBLIC_BING_SITE_VERIFICATION
  );

  if (!google && !bing) return {};

  return {
    verification: {
      ...(google ? { google } : {}),
      ...(bing
        ? {
            other: {
              "msvalidate.01": bing,
            },
          }
        : {}),
    },
  };
}
