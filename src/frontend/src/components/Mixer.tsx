import { Headphones, Pause, Play, RotateCcw, Timer, Zap } from "lucide-react";
import { usePerDeckOutputRouting } from "../hooks/usePerDeckOutputRouting";
import type { DeckHookResult } from "../types/audio";
import { EQKnob } from "./EQKnob";
import { VUMeter } from "./VUMeter";

interface MixerProps {
  deckA: DeckHookResult;
  deckB: DeckHookResult;
  crossfaderPos: number;
  setCrossfader: (pos: number) => void;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  onSync: () => void;
  onPlayAll: () => void;
  onPauseAll: () => void;
  onSyncBoth: () => void;
  onRevertDefault: () => void;
}

function PerDeckAudioRouting() {
  const {
    devices,
    selectedDeviceA,
    selectedDeviceB,
    selectDeviceA,
    selectDeviceB,
    permissionState,
    requestPermission,
    isSupported,
  } = usePerDeckOutputRouting();

  if (!isSupported) {
    return (
      <p className="text-[9px] text-dj-muted text-center">
        Per-deck output routing requires Chrome 110+
      </p>
    );
  }

  if (permissionState === "idle") {
    return (
      <button
        type="button"
        onClick={requestPermission}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 border"
        style={{
          background: "rgba(40, 230, 255, 0.08)",
          borderColor: "rgba(40, 230, 255, 0.5)",
          color: "#28E6FF",
          boxShadow: "0 0 8px rgba(40,230,255,0.15)",
        }}
        data-ocid="mixer.primary_button"
      >
        <Headphones size={9} />🎧 ENABLE PER-DECK ROUTING
      </button>
    );
  }

  if (permissionState === "requesting") {
    return (
      <p className="text-[9px] text-dj-muted text-center">Detecting devices…</p>
    );
  }

  if (permissionState === "denied") {
    return (
      <p className="text-[9px] text-center" style={{ color: "#FF4D4D" }}>
        Device access denied — check browser permissions
      </p>
    );
  }

  // granted
  const outputDevices = devices.filter((d) => d.kind === "audiooutput");

  return (
    <div className="flex flex-row gap-2">
      {/* Deck A output */}
      <div className="flex flex-col gap-1 flex-1">
        <span
          className="text-[8px] uppercase tracking-wider text-center font-black"
          style={{ color: "#28E6FF" }}
        >
          DECK A OUTPUT
        </span>
        <select
          value={selectedDeviceA}
          onChange={(e) => selectDeviceA(e.target.value)}
          className="w-full rounded py-1 px-1.5 text-[10px] cursor-pointer outline-none"
          style={{
            background: "#1a2030",
            border: "1px solid rgba(40, 230, 255, 0.4)",
            color: "#c8d0e0",
          }}
          data-ocid="mixer.select"
        >
          {outputDevices.map((device, i) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Output ${i + 1}`}
            </option>
          ))}
        </select>
      </div>

      {/* Deck B output */}
      <div className="flex flex-col gap-1 flex-1">
        <span
          className="text-[8px] uppercase tracking-wider text-center font-black"
          style={{ color: "#FF3B8A" }}
        >
          DECK B OUTPUT
        </span>
        <select
          value={selectedDeviceB}
          onChange={(e) => selectDeviceB(e.target.value)}
          className="w-full rounded py-1 px-1.5 text-[10px] cursor-pointer outline-none"
          style={{
            background: "#1a2030",
            border: "1px solid rgba(255, 59, 138, 0.4)",
            color: "#c8d0e0",
          }}
          data-ocid="mixer.select"
        >
          {outputDevices.map((device, i) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Output ${i + 1}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function Mixer({
  deckA,
  deckB,
  crossfaderPos,
  setCrossfader,
  isRecording,
  startRecording,
  stopRecording,
  onSync,
  onPlayAll,
  onPauseAll,
  onSyncBoth,
  onRevertDefault,
}: MixerProps) {
  const stateA = deckA.state;
  const stateB = deckB.state;

  return (
    <div
      className="dj-card flex flex-col gap-3 p-3 h-full"
      data-ocid="mixer.panel"
    >
      <div className="flex items-center justify-center">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-dj-muted">
          MIXER
        </span>
      </div>

      {/* Global Controls — 2x2 grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onPlayAll}
          className="flex items-center justify-center gap-1 py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 border"
          style={{
            background: "rgba(34, 197, 94, 0.12)",
            borderColor: "#22C55E",
            color: "#22C55E",
            boxShadow: "0 0 8px rgba(34,197,94,0.25)",
          }}
          data-ocid="mixer.primary_button"
        >
          <Play size={9} />
          PLAY ALL
        </button>

        <button
          type="button"
          onClick={onPauseAll}
          className="flex items-center justify-center gap-1 py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 border"
          style={{
            background: "rgba(251, 191, 36, 0.12)",
            borderColor: "#FBBF24",
            color: "#FBBF24",
            boxShadow: "0 0 8px rgba(251,191,36,0.25)",
          }}
          data-ocid="mixer.secondary_button"
        >
          <Pause size={9} />
          PAUSE ALL
        </button>

        <button
          type="button"
          onClick={onSyncBoth}
          className="flex items-center justify-center gap-1 py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 border"
          style={{
            background: "rgba(40, 230, 255, 0.12)",
            borderColor: "#28E6FF",
            color: "#28E6FF",
            boxShadow: "0 0 8px rgba(40,230,255,0.25)",
          }}
          data-ocid="mixer.toggle"
        >
          <Timer size={9} />
          SYNC BOTH
        </button>

        <button
          type="button"
          onClick={onRevertDefault}
          className="flex items-center justify-center gap-1 py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 border"
          style={{
            background: "rgba(255, 59, 138, 0.12)",
            borderColor: "#FF3B8A",
            color: "#FF3B8A",
            boxShadow: "0 0 8px rgba(255,59,138,0.25)",
          }}
          data-ocid="mixer.delete_button"
        >
          <RotateCcw size={9} />
          REVERT
        </button>
      </div>

      {/* BPM Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-center flex-1">
          <div className="text-[9px] uppercase tracking-wider text-deck-a mb-0.5">
            DECK A
          </div>
          <div className="text-xl font-black font-mono text-deck-a">
            {stateA.bpm?.toFixed(1) ?? "--.-"}
          </div>
          <div className="text-[8px] text-dj-muted">BPM</div>
        </div>

        <button
          type="button"
          onClick={onSync}
          className="px-3 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border"
          style={{
            background: "rgba(139, 92, 246, 0.15)",
            borderColor: "#8B5CF6",
            color: "#8B5CF6",
            boxShadow: "0 0 10px rgba(139,92,246,0.4)",
          }}
          data-ocid="mixer.primary_button"
        >
          <Zap size={12} className="inline mr-1" />
          SYNC
        </button>

        <div className="text-center flex-1">
          <div className="text-[9px] uppercase tracking-wider text-deck-b mb-0.5">
            DECK B
          </div>
          <div className="text-xl font-black font-mono text-deck-b">
            {stateB.bpm?.toFixed(1) ?? "--.-"}
          </div>
          <div className="text-[8px] text-dj-muted">BPM</div>
        </div>
      </div>

      {/* VU Meters */}
      <div className="flex items-end justify-center gap-4">
        <div className="flex gap-1 items-end">
          <VUMeter level={stateA.vuLevel} height={90} />
          <VUMeter level={stateA.vuLevel * 0.9} height={90} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[8px] uppercase tracking-wider text-dj-muted">
            LEVEL
          </span>
          <div className="w-px h-16 bg-dj-border" />
        </div>
        <div className="flex gap-1 items-end">
          <VUMeter level={stateB.vuLevel * 0.9} height={90} />
          <VUMeter level={stateB.vuLevel} height={90} />
        </div>
      </div>

      {/* EQ - Deck A */}
      <div className="border-t border-dj-border pt-2">
        <div className="text-[8px] uppercase tracking-wider text-deck-a text-center mb-2">
          EQ — A
        </div>
        <div className="flex justify-around">
          <EQKnob
            value={stateA.eq.high}
            onChange={(v) => deckA.actions.setEQ("high", v)}
            label="HI"
            color="#28E6FF"
            size={40}
          />
          <EQKnob
            value={stateA.eq.mid}
            onChange={(v) => deckA.actions.setEQ("mid", v)}
            label="MID"
            color="#28E6FF"
            size={40}
          />
          <EQKnob
            value={stateA.eq.low}
            onChange={(v) => deckA.actions.setEQ("low", v)}
            label="LOW"
            color="#28E6FF"
            size={40}
          />
        </div>
      </div>

      {/* Channel faders */}
      <div className="flex justify-around gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[8px] uppercase tracking-wider text-deck-a">
            A
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={stateA.gain}
            onChange={(e) =>
              deckA.actions.setGain(Number.parseFloat(e.target.value))
            }
            className="h-20 cursor-pointer"
            style={{
              writingMode: "vertical-lr",
              direction: "rtl",
              accentColor: "#28E6FF",
            }}
            data-ocid="mixer.toggle"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[8px] uppercase tracking-wider text-deck-b">
            B
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={stateB.gain}
            onChange={(e) =>
              deckB.actions.setGain(Number.parseFloat(e.target.value))
            }
            className="h-20 cursor-pointer"
            style={{
              writingMode: "vertical-lr",
              direction: "rtl",
              accentColor: "#FF3B8A",
            }}
            data-ocid="mixer.toggle"
          />
        </div>
      </div>

      {/* EQ - Deck B */}
      <div className="border-t border-dj-border pt-2">
        <div className="text-[8px] uppercase tracking-wider text-deck-b text-center mb-2">
          EQ — B
        </div>
        <div className="flex justify-around">
          <EQKnob
            value={stateB.eq.high}
            onChange={(v) => deckB.actions.setEQ("high", v)}
            label="HI"
            color="#FF3B8A"
            size={40}
          />
          <EQKnob
            value={stateB.eq.mid}
            onChange={(v) => deckB.actions.setEQ("mid", v)}
            label="MID"
            color="#FF3B8A"
            size={40}
          />
          <EQKnob
            value={stateB.eq.low}
            onChange={(v) => deckB.actions.setEQ("low", v)}
            label="LOW"
            color="#FF3B8A"
            size={40}
          />
        </div>
      </div>

      {/* Crossfader */}
      <div className="flex flex-col gap-1 border-t border-dj-border pt-2">
        <div className="flex justify-between text-[8px] uppercase tracking-wider">
          <span className="text-deck-a">A</span>
          <span className="text-dj-muted">CROSSFADER</span>
          <span className="text-deck-b">B</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={crossfaderPos}
          onChange={(e) => setCrossfader(Number.parseFloat(e.target.value))}
          className="w-full h-2 rounded-full cursor-pointer"
          style={{ accentColor: "#8B5CF6" }}
          data-ocid="mixer.select"
        />
      </div>

      {/* Record */}
      <div className="flex flex-col gap-2 border-t border-dj-border pt-2">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className="w-full py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          style={{
            background: isRecording
              ? "rgba(255, 77, 77, 0.2)"
              : "rgba(34, 197, 94, 0.15)",
            border: `1px solid ${isRecording ? "#FF4D4D" : "#22C55E"}`,
            color: isRecording ? "#FF4D4D" : "#22C55E",
            boxShadow: isRecording ? "0 0 10px rgba(255,77,77,0.4)" : "none",
          }}
          data-ocid="mixer.primary_button"
        >
          {isRecording ? "● STOP REC" : "⏺ RECORD MIX"}
        </button>
      </div>

      {/* Per-Deck Audio Output Routing */}
      <div className="flex flex-col gap-2 border-t border-dj-border pt-2">
        <PerDeckAudioRouting />
      </div>
    </div>
  );
}
