import { cn, formatPercentage, formatScore } from "@/lib/utils";

type ScoreRingProps = {
  score: number;
  max?: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export function ScoreRing({
  score,
  max = 100,
  label = "Readiness score",
  size = 148,
  strokeWidth = 12,
  className,
}: ScoreRingProps) {
  const clampedScore = Math.min(Math.max(score, 0), max);
  const progress = (clampedScore / max) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  const tone =
    progress >= 80
      ? "var(--success)"
      : progress >= 60
        ? "var(--warning)"
        : "var(--destructive)";

  return (
    <div className={cn("relative flex h-fit flex-col items-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-foreground text-3xl font-semibold">
          {formatPercentage(progress)}
        </span>
        <span className="text-muted mt-1 text-xs tracking-[0.18em] uppercase">
          {label}
        </span>
        <span className="text-muted mt-2 text-sm">
          {formatScore(clampedScore, max)}
        </span>
      </div>
    </div>
  );
}
