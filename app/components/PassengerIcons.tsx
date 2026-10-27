import type { SVGProps } from "react";

export function AdultIcon({ className = "w-4 h-4", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function ChildIcon({ className = "w-3.5 h-3.5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="6" r="3.5" />
      <path d="M16 19v-3a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v3" />
      <path d="M9 13l-1.5 3" />
      <path d="M15 13l1.5 3" />
    </svg>
  );
}

export function InfantIcon({ className = "w-3.5 h-3.5", ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Sleek Stroller / Baby outline */}
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M9 18.5h9" />
      <path d="M4 4h3l3.5 10.5a2 2 0 0 0 1.9 1.5h6.6a2 2 0 0 0 1.9-1.4l1.6-5.6H7.5" />
      <path d="M14 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </svg>
  );
}

export function getPassengerIcon(type: string, className = "w-3.5 h-3.5") {
  const normalized = type.toLowerCase();
  if (normalized.includes("infant") || normalized.includes("baby") || normalized.includes("婴儿")) {
    return <InfantIcon className={className} />;
  }
  if (normalized.includes("child") || normalized.includes("儿童")) {
    return <ChildIcon className={className} />;
  }
  return <AdultIcon className={className} />;
}

