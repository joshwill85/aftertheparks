import Link from "next/link";

export function TrustInline({
  lastVerified,
  sourceCount,
  rowCount,
}: {
  lastVerified?: string | null;
  sourceCount: number;
  rowCount: number;
}) {
  return (
    <p className="trust-inline">
      <span>{rowCount} source-backed rows</span>
      {lastVerified ? <span>verified {lastVerified}</span> : null}
      {sourceCount > 0 ? <span>{sourceCount} official sources</span> : null}
      <Link href="/source-and-accuracy-policy">How we verify</Link>
    </p>
  );
}
