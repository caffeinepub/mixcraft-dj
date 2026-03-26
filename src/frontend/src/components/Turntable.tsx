const GROOVE_FACTORS = [0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36];

interface TurntableProps {
  isPlaying: boolean;
  accentColor: string;
  size?: number;
  trackName?: string | null;
}

export function Turntable({
  isPlaying,
  accentColor,
  size = 180,
  trackName,
}: TurntableProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: isPlaying
            ? `0 0 24px 6px ${accentColor}60, 0 0 0 2px ${accentColor}`
            : `0 0 12px 2px ${accentColor}30, 0 0 0 1px ${accentColor}60`,
          transition: "box-shadow 0.3s ease",
          borderRadius: "50%",
        }}
      />

      <div
        className={`vinyl-spin${isPlaying ? " playing" : ""}`}
        style={{
          width: size,
          height: size,
          animationDuration: isPlaying ? "1.8s" : "4s",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Vinyl turntable platter"
        >
          <circle cx={cx} cy={cy} r={outerR} fill="#080a0e" />

          {GROOVE_FACTORS.map((factor) => (
            <circle
              key={factor}
              cx={cx}
              cy={cy}
              r={outerR * factor}
              fill="none"
              stroke="#1a1e2a"
              strokeWidth="0.8"
            />
          ))}

          <circle cx={cx} cy={cy} r={outerR * 0.28} fill="#1a1e2a" />
          <circle cx={cx} cy={cy} r={outerR * 0.26} fill="#14181f" />
          <circle
            cx={cx}
            cy={cy}
            r={outerR * 0.22}
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            opacity="0.7"
          />
          <circle cx={cx} cy={cy} r={4} fill="#2a2e3a" />
          <circle cx={cx} cy={cy} r={2} fill="#080a0e" />
          <line
            x1={cx - outerR * 0.15}
            y1={cy - outerR * 0.05}
            x2={cx + outerR * 0.15}
            y2={cy + outerR * 0.05}
            stroke={accentColor}
            strokeWidth="0.5"
            opacity="0.4"
          />
        </svg>
      </div>

      {!isPlaying && (
        <div
          className="absolute text-center pointer-events-none"
          style={{ width: outerR * 0.5, top: cy - 8, left: cx - outerR * 0.25 }}
        >
          <span
            className="text-[7px] font-bold uppercase tracking-widest truncate block"
            style={{ color: accentColor }}
          >
            {trackName ? trackName.substring(0, 12) : "NO TRACK"}
          </span>
        </div>
      )}

      <svg
        className="absolute pointer-events-none"
        width={size * 0.55}
        height={size * 0.55}
        role="img"
        aria-label="Tonearm"
        style={{
          right: -8,
          top: 4,
          transformOrigin: "90% 10%",
          transform: isPlaying ? "rotate(18deg)" : "rotate(8deg)",
          transition: "transform 0.8s ease",
        }}
      >
        <line
          x1="90%"
          y1="10%"
          x2="20%"
          y2="85%"
          stroke="#98A3B3"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="90%"
          cy="10%"
          r="5"
          fill="#1a2030"
          stroke="#3A4458"
          strokeWidth="1.5"
        />
        <polygon
          points="20%,82% 16%,92% 24%,92%"
          fill={accentColor}
          opacity="0.9"
        />
      </svg>
    </div>
  );
}
