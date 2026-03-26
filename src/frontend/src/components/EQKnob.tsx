import { useCallback, useEffect, useRef } from "react";

interface EQKnobProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  color?: string;
  size?: number;
}

export function EQKnob({
  value,
  onChange,
  min = -12,
  max = 12,
  label,
  color = "#28E6FF",
  size = 48,
}: EQKnobProps) {
  const isDraggingRef = useRef(false);
  const lastYRef = useRef(0);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const angle = -140 + ((value - min) / (max - min)) * 280;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      lastYRef.current = e.clientY;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const delta = lastYRef.current - ev.clientY;
        lastYRef.current = ev.clientY;
        const range = max - min;
        const newValue = Math.max(
          min,
          Math.min(max, valueRef.current + (delta / 100) * range),
        );
        valueRef.current = newValue;
        onChange(newValue);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [min, max, onChange],
  );

  const handleDoubleClick = useCallback(() => {
    valueRef.current = 0;
    onChange(0);
  }, [onChange]);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.75;
  const indicatorLen = r - 4;
  const angleRad = (angle * Math.PI) / 180;
  const ix = cx + Math.sin(angleRad) * indicatorLen;
  const iy = cy - Math.cos(angleRad) * indicatorLen;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={`${label} knob, value ${value.toFixed(1)}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className="cursor-ns-resize"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#1a2030"
          stroke="#2A3242"
          strokeWidth="1"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r - 3}
          fill="none"
          stroke="#242B3A"
          strokeWidth="3"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r - 3}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${(((value - min) / (max - min)) * 2 * Math.PI * (r - 3) * 0.78).toFixed(1)} 999`}
          strokeLinecap="round"
          transform={`rotate(-230 ${cx} ${cy})`}
        />
        <line
          x1={cx}
          y1={cy}
          x2={ix}
          y2={iy}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={ix} cy={iy} r="2.5" fill={color} />
        <circle cx={cx} cy={cy} r="2" fill="#3A4458" />
      </svg>
      <span className="text-[9px] uppercase tracking-wider text-dj-muted font-medium">
        {label}
      </span>
      <span className="text-[10px] font-mono" style={{ color }}>
        {value > 0 ? "+" : ""}
        {value.toFixed(1)}
      </span>
    </div>
  );
}
