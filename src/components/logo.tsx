import { cn } from "@/lib/utils";

export function Logo({
  size = "md",
  showWordmark = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}) {
  const dims =
    size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const title =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const sub =
    size === "lg" ? "text-[10px]" : size === "sm" ? "text-[7px]" : "text-[8px]";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        viewBox="0 0 64 64"
        className={cn(dims, "shrink-0")}
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="32"
          cy="32"
          r="26"
          stroke="hsl(var(--gold))"
          stroke-width="1.5"
        />
        <text
          x="32"
          y="42"
          text-anchor="middle"
          font-family="Fraunces, serif"
          font-size="28"
          font-weight="500"
          fill="hsl(var(--gold))"
        >
          L
        </text>
      </svg>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-serif font-medium tracking-wide text-foreground",
              title,
            )}
          >
            Luma
          </span>
          <span
            className={cn(
              "mt-1 text-[8px] uppercase tracking-[0.32em] text-muted-foreground",
              sub,
            )}
          >
            semijoias
          </span>
        </div>
      )}
    </div>
  );
}
