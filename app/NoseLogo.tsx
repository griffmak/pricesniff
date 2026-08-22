/**
 * Cartoon nose, in profile, mid-sniff. The three arcs on the left are the sniff —
 * they stagger their animation so it reads as inhaling rather than pulsing.
 */
export default function NoseLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" className={className} role="img" aria-label="PriceSniff">
      <title>PriceSniff</title>

      {/* sniff lines */}
      <g stroke="var(--color-mint-deep)" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M14 40 q -8 10 0 20">
          <animate
            attributeName="opacity"
            values="0.2;1;0.2"
            dur="1.8s"
            begin="0s"
            repeatCount="indefinite"
          />
        </path>
        <path d="M4 34 q -10 14 0 32">
          <animate
            attributeName="opacity"
            values="0.2;1;0.2"
            dur="1.8s"
            begin="0.3s"
            repeatCount="indefinite"
          />
        </path>
      </g>

      {/* nose: bridge down to tip, under-curve, then the nostril wing */}
      <path
        d="M58 8
           C 44 22, 36 44, 32 58
           C 29 68, 34 74, 44 74
           C 44 82, 52 88, 64 88
           C 84 88, 96 76, 96 60
           C 96 34, 80 8, 58 8 Z"
        fill="var(--color-mint)"
        stroke="var(--color-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* nostril */}
      <ellipse cx="52" cy="72" rx="9" ry="5" fill="var(--color-ink)" transform="rotate(-18 52 72)" />
    </svg>
  );
}
