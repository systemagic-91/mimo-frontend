import { cn } from "@/lib/utils";

/** Código identificador de peça — sempre em IBM Plex Mono. */
export function PieceCode({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "whitespace-nowrap font-mono text-[13px] font-medium tracking-tight text-foreground",
        className,
      )}
    >
      {code}
    </span>
  );
}
