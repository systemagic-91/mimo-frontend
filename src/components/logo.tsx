import { cn } from "@/lib/utils";

type LogoVariant = "full" | "horizontal" | "symbol";

const SOURCES: Record<LogoVariant, string> = {
  full: "/logo/luma-full.svg",
  horizontal: "/logo/luma-horizontal.svg",
  symbol: "/logo/luma-simbolo.svg",
};

const HEIGHTS: Record<LogoVariant, Record<"sm" | "md" | "lg", string>> = {
  full: { sm: "h-20", md: "h-28", lg: "h-36" },
  horizontal: { sm: "h-8", md: "h-10", lg: "h-14" },
  symbol: { sm: "h-8", md: "h-10", lg: "h-12" },
};

export function Logo({
  variant = "horizontal",
  size = "md",
  className,
}: {
  variant?: LogoVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <img
      src={SOURCES[variant]}
      alt="Luma Semijoias"
      className={cn(HEIGHTS[variant][size], "w-auto shrink-0", className)}
    />
  );
}