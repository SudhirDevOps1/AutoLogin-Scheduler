import Link from "next/link";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

/** App logo — shield + clock SVG. Crisp at any size. */
export function Logo({ size = 32, showText = true, className = "" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 group ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="shieldGradLogo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="112" fill="#0a0a0f" />
        <path
          d="M256 96 L160 136 L160 256 Q160 356 256 400 Q352 356 352 256 L352 136 Z"
          fill="url(#shieldGradLogo)"
        />
        <circle cx="256" cy="248" r="60" fill="none" stroke="#f4f4f7" strokeWidth="8" />
        <line x1="256" y1="248" x2="256" y2="210" stroke="#f4f4f7" strokeWidth="6" strokeLinecap="round" />
        <line x1="256" y1="248" x2="288" y2="268" stroke="#f4f4f7" strokeWidth="6" strokeLinecap="round" />
        <circle cx="256" cy="248" r="6" fill="#f4f4f7" />
        <circle cx="312" cy="184" r="10" fill="#10b981" />
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-semibold tracking-tight">AutoLogin</span>
          <span className="text-[10px] text-text-dim tracking-wider uppercase">Scheduler</span>
        </div>
      )}
    </Link>
  );
}
