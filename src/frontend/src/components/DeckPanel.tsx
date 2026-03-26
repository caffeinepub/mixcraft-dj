import { Disc, Pause, Play, Repeat, RotateCcw } from "lucide-react";
import type { DeckHookResult } from "../types/audio";
import { EQKnob } from "./EQKnob";
import { Turntable } from "./Turntable";
import { WaveformCanvas } from "./WaveformCanvas";

interface YTTrack {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface DeckPanelProps {
  deck: DeckHookResult;
  deckId: "A" | "B";
  accentColor: string;
  onLoadFile?: (file: File, deckId: "A" | "B") => void;
  ytTrack?: YTTrack | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

const PAD_CONFIGS = [
  { label: "CUE 1", type: "cue", index: 0 },
  { label: "CUE 2", type: "cue", index: 1 },
  { label: "CUE 3", type: "cue", index: 2 },
  { label: "LOOP", type: "loop", index: 0 },
  { label: "IN", type: "loopIn", index: 0 },
  { label: "OUT", type: "loopOut", index: 0 },
  { label: "REVERB", type: "fx", index: 0 },
  { label: "ECHO", type: "fx", index: 1 },
] as const;

export function DeckPanel({
  deck,
  deckId,
  accentColor,
  onLoadFile,
  ytTrack,
}: DeckPanelProps) {
  const { state, actions } = deck;

  const handlePadClick = (pad: (typeof PAD_CONFIGS)[number]) => {
    if (pad.type === "cue") {
      actions.jumpToCue(pad.index as 0 | 1 | 2);
    } else if (pad.type === "loop") {
      actions.toggleLoop();
    } else if (pad.type === "loopIn") {
      actions.setLoopIn();
    } else if (pad.type === "loopOut") {
      actions.setLoopOut();
    } else if (pad.type === "fx") {
      if (pad.index === 0) actions.toggleEffect("reverb");
      else actions.toggleEffect("echo");
    }
  };

  const handlePadLongPress = (pad: (typeof PAD_CONFIGS)[number]) => {
    if (pad.type === "cue") {
      actions.setCuePoint(pad.index as 0 | 1 | 2);
    }
  };

  const getPadActive = (pad: (typeof PAD_CONFIGS)[number]): boolean => {
    if (pad.type === "cue")
      return state.cuePoints[pad.index as 0 | 1 | 2] !== null;
    if (pad.type === "loop") return state.loop.enabled;
    if (pad.type === "fx" && pad.index === 0) return state.effects.reverb;
    if (pad.type === "fx" && pad.index === 1) return state.effects.echo;
    return false;
  };

  const getPadColor = (pad: (typeof PAD_CONFIGS)[number]): string => {
    if (!getPadActive(pad)) return "#1a2030";
    if (pad.type === "cue") return "#F5C542";
    if (pad.type === "loop" || pad.type === "loopIn" || pad.type === "loopOut")
      return "#8B5CF6";
    return accentColor;
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onLoadFile) onLoadFile(file, deckId);
      else actions.loadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (
      file &&
      (file.type.startsWith("audio/") ||
        file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/i))
    ) {
      if (onLoadFile) onLoadFile(file, deckId);
      else actions.loadFile(file);
    }
  };

  const deckOcid = deckId.toLowerCase();
  const showYtInfo = ytTrack && !state.trackName;

  return (
    <div
      className="dj-card flex flex-col gap-3 p-3 h-full"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      data-ocid={`deck_${deckOcid}.card`}
    >
      {/* Deck header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-black tracking-[0.2em] uppercase px-2 py-0.5 rounded"
            style={{
              color: accentColor,
              border: `1px solid ${accentColor}40`,
              background: `${accentColor}10`,
            }}
          >
            DECK {deckId}
          </span>
          {state.bpm && (
            <span className="text-xs font-mono" style={{ color: accentColor }}>
              {state.bpm.toFixed(1)} BPM
            </span>
          )}
        </div>
        <label
          className="cursor-pointer"
          data-ocid={`deck_${deckOcid}.upload_button`}
        >
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.flac,.aac"
            className="hidden"
            onChange={handleFileInput}
          />
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-dj-muted hover:text-dj-text transition-colors px-2 py-1 rounded border border-dj-border hover:border-dj-border2">
            <Disc size={10} />
            Load
          </div>
        </label>
      </div>

      {/* Track name / YT track info */}
      {showYtInfo ? (
        <div
          className="flex items-center gap-2 rounded p-1.5"
          style={{
            background: `${accentColor}0D`,
            border: `1px solid ${accentColor}30`,
          }}
        >
          <img
            src={ytTrack.thumbnail}
            alt={ytTrack.title}
            className="w-14 h-9 object-cover rounded flex-shrink-0"
          />
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold truncate"
              style={{ color: accentColor }}
            >
              {ytTrack.title}
            </p>
            <p className="text-[8px] text-dj-muted truncate">
              {ytTrack.channelTitle}
            </p>
            <span
              className="text-[7px] uppercase tracking-wider px-1 py-0.5 rounded mt-0.5 inline-block"
              style={{
                background: "rgba(255,0,0,0.15)",
                color: "#FF4444",
                border: "1px solid rgba(255,0,0,0.25)",
              }}
            >
              ▶ YouTube
            </span>
          </div>
        </div>
      ) : (
        <div className="text-sm font-semibold text-dj-text truncate min-h-[20px]">
          {state.trackName ?? (
            <span className="text-dj-muted text-xs italic">
              Drop audio file to load...
            </span>
          )}
        </div>
      )}

      {/* Turntable + controls row */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Turntable
            isPlaying={state.isPlaying}
            accentColor={accentColor}
            size={160}
            trackName={state.trackName}
          />
        </div>

        <div className="flex flex-col gap-3 flex-1">
          <div className="flex justify-center">
            <EQKnob
              value={state.gain * 12}
              onChange={(v) => actions.setGain(v / 12)}
              min={0}
              max={12}
              label="GAIN"
              color={accentColor}
              size={44}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wider text-dj-muted text-center">
              PITCH
            </span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.01"
              value={state.playbackRate}
              onChange={(e) =>
                actions.setPlaybackRate(Number.parseFloat(e.target.value))
              }
              className="w-full accent-current h-1"
              style={{ accentColor }}
              data-ocid={`deck_${deckOcid}.toggle`}
            />
            <div className="flex justify-between text-[9px] text-dj-muted font-mono">
              <span>-50%</span>
              <span style={{ color: accentColor }}>
                {((state.playbackRate - 1) * 100).toFixed(0)}%
              </span>
              <span>+100%</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wider text-dj-muted text-center">
              FILTER
            </span>
            <input
              type="range"
              min="100"
              max="18000"
              step="100"
              value={state.filterFreq}
              onChange={(e) =>
                actions.setFilterFreq(Number.parseFloat(e.target.value))
              }
              className="w-full h-1"
              style={{
                accentColor: state.effects.filter ? accentColor : "#3A4458",
              }}
            />
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div
        className="rounded overflow-hidden"
        style={{ border: `1px solid ${accentColor}20` }}
      >
        <WaveformCanvas
          waveformData={state.waveformData}
          currentTime={state.currentTime}
          duration={state.duration}
          onSeek={actions.seek}
          color={accentColor}
          height={64}
          loopIn={state.loop.inPoint}
          loopOut={state.loop.outPoint}
          loopEnabled={state.loop.enabled}
          cuePoints={state.cuePoints}
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs font-mono px-1">
        <span style={{ color: accentColor }}>
          {formatTime(state.currentTime)}
        </span>
        <span className="text-dj-muted">
          -{formatTime(Math.max(0, state.duration - state.currentTime))}
        </span>
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (state.cuePoints[0] !== null) actions.jumpToCue(0);
            else actions.setCuePoint(0);
          }}
          className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all"
          style={{
            background: "#F5C542",
            color: "#0B0D12",
            boxShadow: "0 0 8px rgba(245, 197, 66, 0.4)",
          }}
          data-ocid={`deck_${deckOcid}.secondary_button`}
        >
          CUE
        </button>

        <button
          type="button"
          onClick={() => (state.isPlaying ? actions.pause() : actions.play())}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{
            background: state.isPlaying
              ? "rgba(34, 197, 94, 0.15)"
              : "rgba(34, 197, 94, 0.9)",
            border: "2px solid #22C55E",
            boxShadow: state.isPlaying
              ? "0 0 16px rgba(34, 197, 94, 0.6)"
              : "0 0 8px rgba(34, 197, 94, 0.3)",
            color: state.isPlaying ? "#22C55E" : "#0B0D12",
          }}
          data-ocid={`deck_${deckOcid}.primary_button`}
        >
          {state.isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            actions.seek(0);
          }}
          className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider text-dj-muted hover:text-dj-text border border-dj-border hover:border-dj-border2 transition-all"
          data-ocid={`deck_${deckOcid}.secondary_button`}
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* Performance pads */}
      <div className="grid grid-cols-4 gap-1.5">
        {PAD_CONFIGS.map((pad) => {
          const active = getPadActive(pad);
          const padColor = getPadColor(pad);
          const isCue = pad.type === "cue";
          const cueHasMark =
            isCue && state.cuePoints[pad.index as 0 | 1 | 2] !== null;

          return (
            <button
              key={pad.label}
              type="button"
              onClick={() => handlePadClick(pad)}
              onContextMenu={(e) => {
                e.preventDefault();
                handlePadLongPress(pad);
              }}
              title={isCue ? "Click: jump | Right-click: set cue" : pad.label}
              className="h-8 rounded text-[8px] font-bold uppercase tracking-wider transition-all active:scale-95 border"
              style={{
                background: active ? `${padColor}25` : "#0d1320",
                borderColor: active ? padColor : "#1e2a3a",
                color: active ? padColor : "#4a5568",
                boxShadow: active ? `0 0 6px ${padColor}50` : "none",
              }}
              data-ocid={`deck_${deckOcid}.toggle`}
            >
              {cueHasMark ? `★${pad.label}` : pad.label}
            </button>
          );
        })}
      </div>

      {/* Effects row */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-wider text-dj-muted">
          FX:
        </span>
        {(["reverb", "echo", "filter"] as const).map((fx) => (
          <button
            key={fx}
            type="button"
            onClick={() => actions.toggleEffect(fx)}
            className="flex-1 py-1 rounded text-[9px] uppercase tracking-wider font-bold transition-all border"
            style={{
              background: state.effects[fx]
                ? `${accentColor}20`
                : "transparent",
              borderColor: state.effects[fx] ? accentColor : "#1e2a3a",
              color: state.effects[fx] ? accentColor : "#4a5568",
              boxShadow: state.effects[fx]
                ? `0 0 6px ${accentColor}40`
                : "none",
            }}
            data-ocid={`deck_${deckOcid}.toggle`}
          >
            {fx}
          </button>
        ))}
      </div>

      {/* Loop controls */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-wider text-dj-muted">
          LOOP:
        </span>
        <button
          type="button"
          onClick={actions.setLoopIn}
          className="flex-1 py-1 rounded text-[9px] uppercase font-bold border border-dj-border text-dj-muted hover:text-dj-text hover:border-dj-purple transition-all"
          data-ocid={`deck_${deckOcid}.secondary_button`}
        >
          IN
        </button>
        <button
          type="button"
          onClick={actions.setLoopOut}
          className="flex-1 py-1 rounded text-[9px] uppercase font-bold border border-dj-border text-dj-muted hover:text-dj-text hover:border-dj-purple transition-all"
          data-ocid={`deck_${deckOcid}.secondary_button`}
        >
          OUT
        </button>
        <button
          type="button"
          onClick={actions.toggleLoop}
          className="flex-1 py-1 rounded text-[9px] uppercase font-bold border transition-all"
          style={{
            borderColor: state.loop.enabled ? "#8B5CF6" : "#1e2a3a",
            background: state.loop.enabled
              ? "rgba(139,92,246,0.15)"
              : "transparent",
            color: state.loop.enabled ? "#8B5CF6" : "#4a5568",
            boxShadow: state.loop.enabled
              ? "0 0 6px rgba(139,92,246,0.5)"
              : "none",
          }}
          data-ocid={`deck_${deckOcid}.toggle`}
        >
          <Repeat size={9} className="inline" /> LOOP
        </button>
      </div>
    </div>
  );
}
