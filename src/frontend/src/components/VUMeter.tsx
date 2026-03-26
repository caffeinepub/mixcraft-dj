const NUM_SEGMENTS = 20;
const SEGMENTS = Array.from({ length: NUM_SEGMENTS }, (_, i) => ({
  id: `vu-seg-${i}`,
  normalized: i / NUM_SEGMENTS,
}));

interface VUMeterProps {
  level: number;
  height?: number;
}

export function VUMeter({ level, height = 120 }: VUMeterProps) {
  const activeSegments = Math.floor(level * NUM_SEGMENTS);

  return (
    <div className="flex flex-col-reverse gap-[2px]" style={{ height }}>
      {SEGMENTS.map((seg, i) => {
        const isActive = i < activeSegments;
        let segColor: string;
        if (seg.normalized < 0.6) {
          segColor = isActive ? "#2EE59D" : "#1a2a25";
        } else if (seg.normalized < 0.8) {
          segColor = isActive ? "#F7D14B" : "#2a2a18";
        } else {
          segColor = isActive ? "#FF4D4D" : "#2a1a1a";
        }

        return (
          <div
            key={seg.id}
            className="flex-1 rounded-[1px] transition-colors duration-75"
            style={{
              backgroundColor: segColor,
              boxShadow:
                isActive && seg.normalized > 0.8
                  ? `0 0 4px ${segColor}`
                  : "none",
            }}
          />
        );
      })}
    </div>
  );
}
