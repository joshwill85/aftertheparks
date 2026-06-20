export function FoldedMap404() {
  return (
    <div className="mx-auto mb-8 flex justify-center" aria-hidden>
      <svg
        width="160"
        height="120"
        viewBox="0 0 160 120"
        className="text-[var(--color-muted)]"
        style={{ transform: "rotate(-3deg)" }}
      >
        <path
          d="M20 20 L80 10 L140 20 L140 100 L80 110 L20 100 Z"
          fill="var(--color-sand)"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M80 10 L80 110"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
        <text x="45" y="55" fontSize="8" fill="currentColor" opacity="0.5">
          28.3852
        </text>
        <text x="95" y="70" fontSize="8" fill="currentColor" opacity="0.5">
          -81.5639
        </text>
        <text x="50" y="85" fontSize="10" fill="currentColor">
          You are here*
        </text>
      </svg>
    </div>
  );
}
