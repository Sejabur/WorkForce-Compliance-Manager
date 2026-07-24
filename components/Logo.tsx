import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "", size = 36 }: LogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-sm border border-white/20 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="100" height="100" rx="26" fill="url(#bento-grad-comp)" />
        <rect x="1.5" y="1.5" width="97" height="97" rx="24.5" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="3" />
        <rect x="22" y="22" width="24" height="24" rx="7" fill="#E76257" />
        <rect x="54" y="22" width="24" height="24" rx="7" fill="#FFFFFF" fillOpacity="0.9" />
        <rect x="22" y="54" width="24" height="24" rx="7" fill="#FFFFFF" fillOpacity="0.9" />
        <rect x="54" y="54" width="24" height="24" rx="7" fill="#E76257" />
        <defs>
          <linearGradient id="bento-grad-comp" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e2847" />
            <stop offset="1" stopColor="#1C2439" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
