interface Props {
  tone?: "alarm" | "warning" | "ok" | "info";
  pulse?: boolean;
}

const TONES: Record<NonNullable<Props["tone"]>, string> = {
  alarm: "bg-red-500",
  warning: "bg-amber-500",
  ok: "bg-green-500",
  info: "bg-sky-500",
};

export function StatusDot({ tone = "info", pulse = true }: Props) {
  const color = TONES[tone];
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden>
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full animate-pulse-ring rounded-full ${color} opacity-75`}
        />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}
