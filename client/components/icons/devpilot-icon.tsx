import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type DevPilotIconProps = SVGProps<SVGSVGElement> & {
  variant?: "color" | "mono";
};

export function DevPilotIcon({
  className,
  variant = "color",
  ...props
}: DevPilotIconProps) {
  const mono = variant === "mono";

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      {...props}
    >
      
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="16"
        fill={mono ? "currentColor" : "url(#devpilot-bg)"}
        fillOpacity={mono ? "0.1" : "1"}
      />

      
      <path
        d="M20 26L12 32L20 38"
        stroke={mono ? "currentColor" : "#38BDF8"}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M44 26L52 32L44 38"
        stroke={mono ? "currentColor" : "#38BDF8"}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      
      <path
        d="M32 18C32 24.5 38.5 32 38.5 32C38.5 32 32 39.5 32 46C32 39.5 25.5 32 25.5 32C25.5 32 32 24.5 32 18Z"
        fill={mono ? "currentColor" : "url(#devpilot-spark)"}
      />

      
      {!mono && (
        <defs>
          <linearGradient
            id="devpilot-bg"
            x1="4"
            y1="4"
            x2="60"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#0F172A" />
            <stop offset="1" stopColor="#1E293B" />
          </linearGradient>

          <linearGradient
            id="devpilot-spark"
            x1="25.5"
            y1="18"
            x2="38.5"
            y2="46"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#818CF8" />
          </linearGradient>
        </defs>
      )}
    </svg>
  );
}