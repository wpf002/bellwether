/**
 * Bellwether mark: a bell whose interior is three rising signal bars (a leading
 * indicator that "rings"), with an amber crown ping. Indigo→violet gradient.
 */
export function BellMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Bellwether">
      <defs>
        <linearGradient id="bw-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      {/* bell body */}
      <path
        d="M16 5.6c-5.1 0-7.1 4.3-7.1 9.6 0 4.3-1.3 6.3-3.1 7.8h20.4c-1.8-1.5-3.1-3.5-3.1-7.8 0-5.3-2-9.6-7.1-9.6Z"
        fill="url(#bw-grad)"
      />
      {/* crown ping */}
      <circle cx="16" cy="4" r="1.9" fill="#f59e0b" />
      {/* clapper */}
      <path d="M13.3 24.6a2.7 2.7 0 0 0 5.4 0Z" fill="url(#bw-grad)" />
      {/* interior rising signal bars */}
      <g fill="#fff" opacity="0.92">
        <rect x="12" y="16.2" width="2" height="4.4" rx="1" />
        <rect x="15" y="13.6" width="2" height="7" rx="1" />
        <rect x="18" y="11" width="2" height="9.6" rx="1" />
      </g>
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <BellMark className="h-8 w-8 drop-shadow" />
      <span className="text-[1.35rem] font-semibold tracking-tight text-white">
        Bell<span className="text-accent-400">wether</span>
      </span>
    </span>
  );
}
