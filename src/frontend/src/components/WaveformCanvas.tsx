import { useCallback, useEffect, useRef } from "react";

interface WaveformCanvasProps {
  waveformData: Float32Array | null;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  color: string;
  height?: number;
  loopIn?: number;
  loopOut?: number;
  loopEnabled?: boolean;
  cuePoints?: (number | null)[];
}

export function WaveformCanvas({
  waveformData,
  currentTime,
  duration,
  onSeek,
  color,
  height = 72,
  loopIn,
  loopOut,
  loopEnabled,
  cuePoints,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0d1320";
    ctx.fillRect(0, 0, W, H);

    if (!waveformData || waveformData.length === 0) {
      ctx.strokeStyle = "#1e2a3a";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      ctx.fillStyle = "#2a3a4a";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Drop a file to load", W / 2, H / 2 + 4);
      return;
    }

    const numPeaks = waveformData.length;
    const barW = W / numPeaks;
    const playheadX = duration > 0 ? (currentTime / duration) * W : 0;

    if (
      loopEnabled &&
      duration > 0 &&
      loopIn !== undefined &&
      loopOut !== undefined
    ) {
      const loopX1 = (loopIn / duration) * W;
      const loopX2 = (loopOut / duration) * W;
      ctx.fillStyle = "rgba(139, 92, 246, 0.12)";
      ctx.fillRect(loopX1, 0, loopX2 - loopX1, H);
      ctx.strokeStyle = "rgba(139, 92, 246, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(loopX1, 0);
      ctx.lineTo(loopX1, H);
      ctx.moveTo(loopX2, 0);
      ctx.lineTo(loopX2, H);
      ctx.stroke();
    }

    for (let i = 0; i < numPeaks; i++) {
      const peak = waveformData[i];
      const barH = Math.max(2, peak * H * 0.9);
      const x = i * barW;
      const y = (H - barH) / 2;
      const posRatio = i / numPeaks;
      const isPlayed = duration > 0 && posRatio < currentTime / duration;
      ctx.fillStyle = isPlayed ? color : `${color}60`;
      ctx.fillRect(x, y, Math.max(barW - 0.5, 1), barH);
    }

    const cueColors = ["#F5C542", "#4ADE80", "#60A5FA"];
    cuePoints?.forEach((cueTime, idx) => {
      if (cueTime === null || duration <= 0) return;
      const cx = (cueTime / duration) * W;
      ctx.strokeStyle = cueColors[idx] || "#F5C542";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = cueColors[idx] || "#F5C542";
      ctx.beginPath();
      ctx.moveTo(cx - 5, 0);
      ctx.lineTo(cx + 5, 0);
      ctx.lineTo(cx, 8);
      ctx.closePath();
      ctx.fill();
    });

    if (duration > 0) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, H);
      ctx.stroke();
      ctx.strokeStyle = `${color}80`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, H);
      ctx.stroke();
    }
  }, [
    waveformData,
    currentTime,
    duration,
    color,
    loopIn,
    loopOut,
    loopEnabled,
    cuePoints,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const seekToX = useCallback(
    (clientX: number) => {
      if (!canvasRef.current || duration <= 0) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      onSeek((x / rect.width) * duration);
    },
    [duration, onSeek],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      seekToX(e.clientX);
    },
    [seekToX],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (e.key === "ArrowLeft") onSeek(Math.max(0, currentTime - 5));
      else if (e.key === "ArrowRight")
        onSeek(Math.min(duration, currentTime + 5));
    },
    [currentTime, duration, onSeek],
  );

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={height}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="Waveform seek bar"
      aria-valuenow={currentTime}
      aria-valuemin={0}
      aria-valuemax={duration}
      className="w-full rounded cursor-crosshair focus:outline-none"
      style={{ height }}
      data-ocid="waveform.canvas_target"
    />
  );
}
