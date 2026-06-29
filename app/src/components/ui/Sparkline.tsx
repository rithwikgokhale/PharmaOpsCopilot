interface Props {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}

export function Sparkline({
  values,
  width = 80,
  height = 24,
  stroke = "currentColor",
  fill = "none",
}: Props) {
  if (values.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area =
    fill !== "none"
      ? `${line} L${width},${height} L0,${height} Z`
      : "";

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      {area && <path d={area} fill={fill} opacity={0.15} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
