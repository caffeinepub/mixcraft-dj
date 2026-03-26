import { Toaster } from "@/components/ui/sonner";
import { Disc3, Radio } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DeckA } from "./components/DeckA";
import { DeckB } from "./components/DeckB";
import { Mixer } from "./components/Mixer";
import { TrackBrowser } from "./components/TrackBrowser";
import { YouTubeSearch } from "./components/YouTubeSearch";
import { getAudioContext, useAudioEngine } from "./hooks/useAudioEngine";
import { useDeck } from "./hooks/useDeck";
import type { DeckHookResult, Track } from "./types/audio";

interface YTTrack {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

// Pre-computed static waveform bars to avoid array-index key issues
const LEFT_BARS = Array.from({ length: 80 }, (_, i) => ({
  id: `l${i}`,
  h: 20 + Math.sin(i * 0.4) * 12 + ((i * 7919) % 10),
  x: (i / 80) * 50,
  opacity: 0.3 + (i / 80) * 0.5,
}));

const RIGHT_BARS = Array.from({ length: 80 }, (_, i) => ({
  id: `r${i}`,
  h: 20 + Math.sin(i * 0.4 + 2) * 12 + ((i * 6271) % 10),
  x: 50 + (i / 80) * 50,
  opacity: 0.3 + (i / 80) * 0.5,
}));

function WaveformOverview() {
  return (
    <div
      className="w-full h-12 rounded overflow-hidden relative"
      style={{ background: "#0d0d00" }}
    >
      <svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        className="absolute inset-0"
        role="img"
        aria-label="Stereo waveform overview"
      >
        {LEFT_BARS.map((bar) => (
          <rect
            key={bar.id}
            x={`${bar.x}%`}
            y={`${(100 - bar.h) / 2}%`}
            width="0.5%"
            height={`${bar.h}%`}
            fill={`rgba(255, 215, 0, ${bar.opacity})`}
          />
        ))}
        {RIGHT_BARS.map((bar) => (
          <rect
            key={bar.id}
            x={`${bar.x}%`}
            y={`${(100 - bar.h) / 2}%`}
            width="0.5%"
            height={`${bar.h}%`}
            fill={`rgba(255, 59, 138, ${bar.opacity})`}
          />
        ))}
        <line
          x1="50%"
          y1="0"
          x2="50%"
          y2="100%"
          stroke="#2a2000"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

const SHORTCUTS = [
  ["Space", "Play/Pause Deck A"],
  ["Shift+Space", "Play/Pause Deck B"],
  ["Q/W/E", "Cue 1/2/3 Deck A"],
  ["U/I/O", "Cue 1/2/3 Deck B"],
  ["S", "Sync BPM"],
] as const;

export default function App() {
  const engine = useAudioEngine();
  const deckA = useDeck("A", "mixcraft-deck-a");
  const deckB = useDeck("B", "mixcraft-deck-b");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [ytTrackA, setYtTrackA] = useState<YTTrack | null>(null);
  const [ytTrackB, setYtTrackB] = useState<YTTrack | null>(null);

  // Use refs to capture latest deck state for keyboard handler
  const deckARef = useRef<DeckHookResult>(deckA);
  const deckBRef = useRef<DeckHookResult>(deckB);
  useEffect(() => {
    deckARef.current = deckA;
    deckBRef.current = deckB;
  });

  const handleSync = useCallback(() => {
    const bpmA = deckARef.current.state.bpm;
    const baseBpmB = deckBRef.current.state.baseBpm;
    if (!bpmA || !baseBpmB) {
      toast.error("Load tracks on both decks to sync BPM");
      return;
    }
    const newRate = bpmA / baseBpmB;
    deckBRef.current.actions.setPlaybackRate(
      Math.max(0.5, Math.min(2.0, newRate)),
    );
    toast.success(`Deck B synced to ${bpmA.toFixed(1)} BPM`);
  }, []);

  const handlePlayAll = useCallback(() => {
    const ctx = getAudioContext();
    ctx.resume().then(() => {
      deckARef.current.actions.play();
      deckBRef.current.actions.play();
    });
  }, []);

  const handlePauseAll = useCallback(() => {
    deckARef.current.actions.pause();
    deckBRef.current.actions.pause();
  }, []);

  const handleSyncBoth = useCallback(() => {
    const currentTime = deckARef.current.state.currentTime;
    deckBRef.current.actions.seek(currentTime);
    toast.success("Deck B synced to Deck A position");
  }, []);

  const handleRevertDefault = useCallback(() => {
    deckARef.current.actions.resetToDefault();
    deckBRef.current.actions.resetToDefault();
    engine.setCrossfader(0.5);
    toast.success("Settings reverted to default");
  }, [engine]);

  const handleSyncRef = useRef(handleSync);
  useEffect(() => {
    handleSyncRef.current = handleSync;
  }, [handleSync]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const dA = deckARef.current;
      const dB = deckBRef.current;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (e.shiftKey) {
            dB.state.isPlaying ? dB.actions.pause() : dB.actions.play();
          } else {
            dA.state.isPlaying ? dA.actions.pause() : dA.actions.play();
          }
          break;
        case "KeyQ":
          dA.actions.jumpToCue(0);
          break;
        case "KeyW":
          dA.actions.jumpToCue(1);
          break;
        case "KeyE":
          dA.actions.jumpToCue(2);
          break;
        case "KeyU":
          dB.actions.jumpToCue(0);
          break;
        case "KeyI":
          dB.actions.jumpToCue(1);
          break;
        case "KeyO":
          dB.actions.jumpToCue(2);
          break;
        case "KeyS":
          handleSyncRef.current();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLoadFile = useCallback(
    (file: File, deckId: "A" | "B") => {
      const name = file.name.replace(/\.[^.]+$/, "");
      if (deckId === "A") {
        deckA.actions.loadFile(file).then(() => {
          toast.success(`Loaded "${name}" to Deck A`);
        });
      } else {
        deckB.actions.loadFile(file).then(() => {
          toast.success(`Loaded "${name}" to Deck B`);
        });
      }
    },
    [deckA.actions, deckB.actions],
  );

  const handleYouTubeLoadToDeck = useCallback(
    (result: YTTrack, deckId: "A" | "B") => {
      if (deckId === "A") {
        setYtTrackA(result);
        toast.success("YouTube track loaded to Deck A");
      } else {
        setYtTrackB(result);
        toast.success("YouTube track loaded to Deck B");
      }
    },
    [],
  );

  const addTrack = useCallback((track: Track) => {
    setTracks((prev) => {
      if (prev.find((t) => t.name === track.name)) return prev;
      return [...prev, track];
    });
  }, []);

  const removeTrack = useCallback((id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#000000" }}>
      <Toaster position="top-right" theme="dark" />

      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-dj-border px-6 py-3"
        style={{
          background: "rgba(0,0,0,0.95)",
          backdropFilter: "blur(12px)",
        }}
        data-ocid="app.panel"
      >
        <div className="max-w-[1280px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #FFD700, #FF8C00)",
                boxShadow: "0 0 12px rgba(255, 215, 0, 0.4)",
              }}
            >
              <Disc3 size={18} className="text-black" />
            </div>
            <div>
              <div className="text-base font-black tracking-wider text-dj-text">
                MixCraft
              </div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-dj-muted">
                DJ Studio
              </div>
            </div>
          </div>

          {/* RISE OF THE DJ heading */}
          <div
            className="hidden md:flex items-center gap-0"
            style={{ fontFamily: "'Bungee', cursive" }}
          >
            <span
              key="ch0"
              style={{
                color: "#FFD700",
                fontSize: "1.4rem",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.4)",
                display: "inline-block",
              }}
            >
              R
            </span>
            <span
              key="ch1"
              style={{
                color: "#ffffff",
                fontSize: "1.4rem",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.4)",
                display: "inline-block",
              }}
            >
              I
            </span>
            <span
              key="ch2"
              style={{
                color: "#FFD700",
                fontSize: "1.4rem",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.4)",
                display: "inline-block",
              }}
            >
              S
            </span>
            <span
              key="ch3"
              style={{
                color: "#ffffff",
                fontSize: "1.4rem",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.4)",
                display: "inline-block",
              }}
            >
              E
            </span>
            <span
              key="ch4"
              style={{
                color: "transparent",
                fontSize: "1.4rem",
                display: "inline-block",
                minWidth: "0.4em",
              }}
            >
              {" "}
            </span>
            <span
              key="ch5"
              style={{
                color: "#ffffff",
                fontSize: "1.4rem",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.4)",
                display: "inline-block",
              }}
            >
              O
            </span>
            <span
              key="ch6"
              style={{
                color: "#FFD700",
                fontSize: "1.4rem",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.4)",
                display: "inline-block",
              }}
            >
              F
            </span>
            <span
              key="ch7"
              style={{
                color: "transparent",
                fontSize: "1.4rem",
                display: "inline-block",
                minWidth: "0.4em",
              }}
            >
              {" "}
            </span>
            <span
              key="ch8"
              style={{
                color: "#FFD700",
                fontSize: "1.4rem",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.4)",
                display: "inline-block",
              }}
            >
              T
            </span>
            <span
              key="ch9"
              style={{
                color: "#ffffff",
                fontSize: "1.4rem",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.4)",
                display: "inline-block",
              }}
            >
              H
            </span>
            <span
              key="ch10"
              style={{
                color: "#FFD700",
                fontSize: "1.4rem",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.4)",
                display: "inline-block",
              }}
            >
              E
            </span>
            <span
              key="ch11"
              style={{
                color: "transparent",
                fontSize: "1.4rem",
                display: "inline-block",
                minWidth: "0.4em",
              }}
            >
              {" "}
            </span>
            <span
              key="ch12"
              style={{
                color: "#FFD700",
                fontSize: "1.4rem",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.4)",
                display: "inline-block",
              }}
            >
              D
            </span>
            <span
              key="ch13"
              style={{
                color: "#ffffff",
                fontSize: "1.4rem",
                letterSpacing: "0.02em",
                textShadow:
                  "0 0 10px rgba(255,215,0,0.7), 0 0 20px rgba(255,215,0,0.4)",
                display: "inline-block",
              }}
            >
              J
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] text-dj-muted">
              <Radio size={10} />
              <span className="hidden sm:inline">Web Audio API</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-4"
        >
          <WaveformOverview />
        </motion.div>

        {/* Decks + Mixer with wallpaper background */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-[1fr_220px_1fr] gap-3 mb-4 relative rounded-xl overflow-hidden"
          style={{
            backgroundImage:
              "url(/assets/uploads/wallpaper-019d2841-5fe3-77da-9662-1d81d2e66477-1.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            padding: "12px",
          }}
        >
          {/* Dark overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "rgba(0,0,0,0.65)", zIndex: 0 }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <DeckA
              deck={deckA}
              onLoadFile={handleLoadFile}
              ytTrack={ytTrackA}
            />
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <Mixer
              deckA={deckA}
              deckB={deckB}
              crossfaderPos={engine.crossfaderPos}
              setCrossfader={engine.setCrossfader}
              isRecording={engine.isRecording}
              startRecording={engine.startRecording}
              stopRecording={engine.stopRecording}
              onSync={handleSync}
              onPlayAll={handlePlayAll}
              onPauseAll={handlePauseAll}
              onSyncBoth={handleSyncBoth}
              onRevertDefault={handleRevertDefault}
            />
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <DeckB
              deck={deckB}
              onLoadFile={handleLoadFile}
              ytTrack={ytTrackB}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <TrackBrowser
            tracks={tracks}
            onLoadToDeckA={(file) => handleLoadFile(file, "A")}
            onLoadToDeckB={(file) => handleLoadFile(file, "B")}
            onAddTrack={addTrack}
            onRemoveTrack={removeTrack}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-4"
        >
          <YouTubeSearch
            onLoadToDeck={handleLoadFile}
            onYouTubeLoadToDeck={handleYouTubeLoadToDeck}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-4 dj-card p-3"
        >
          <div className="text-[9px] uppercase tracking-widest text-dj-muted mb-2">
            Keyboard Shortcuts
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {SHORTCUTS.map(([key, desc]) => (
              <div key={key} className="flex items-center gap-2">
                <kbd
                  className="px-2 py-0.5 rounded text-[9px] font-mono font-bold"
                  style={{
                    background: "#1a1000",
                    color: "#FFD700",
                    border: "1px solid #2a2000",
                  }}
                >
                  {key}
                </kbd>
                <span className="text-[9px] text-dj-muted">{desc}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-dj-border mt-8 py-6 px-6">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #FFD700, #FF8C00)",
              }}
            >
              <Disc3 size={14} className="text-black" />
            </div>
            <span className="text-xs text-dj-muted">
              &copy; {new Date().getFullYear()} A Quality Product of NEXUS
              Trading Company, Co-owned by Afaq Mehdi.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
