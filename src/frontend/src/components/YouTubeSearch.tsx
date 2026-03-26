import { Eye, EyeOff, Loader2, Play, Search, Square, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";

interface YTResult {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
}

interface NowPlaying {
  result: YTResult;
  deck: "A" | "B";
}

interface YouTubeSearchProps {
  onLoadToDeck: (file: File, deckId: "A" | "B") => void;
  onYouTubeLoadToDeck?: (result: YTResult, deckId: "A" | "B") => void;
}

function parseISO8601Duration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const h = Number.parseInt(match[1] ?? "0");
  const m = Number.parseInt(match[2] ?? "0");
  const s = Number.parseInt(match[3] ?? "0");
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubeSearch({
  onLoadToDeck: _onLoadToDeck,
  onYouTubeLoadToDeck,
}: YouTubeSearchProps) {
  const { actor } = useActor();
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("yt-api-key") ?? "",
  );
  const [isFetchingKey, setIsFetchingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(
    () => !localStorage.getItem("yt-api-key"),
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YTResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowPlayingA, setNowPlayingA] = useState<NowPlaying | null>(null);
  const [nowPlayingB, setNowPlayingB] = useState<NowPlaying | null>(null);
  const [isYTPlayingA, setIsYTPlayingA] = useState(false);
  const [isYTPlayingB, setIsYTPlayingB] = useState(false);

  const playerARef = useRef<any>(null);
  const playerBRef = useRef<any>(null);
  const playerAContainerRef = useRef<HTMLDivElement | null>(null);
  const playerBContainerRef = useRef<HTMLDivElement | null>(null);
  const ytApiLoadedRef = useRef(false);

  // Load API key from backend on mount
  useEffect(() => {
    if (!actor) return;
    setIsFetchingKey(true);
    actor
      .getApiKey()
      .then((key) => {
        if (key) {
          setApiKey(key);
          localStorage.setItem("yt-api-key", key);
          setShowApiKeyInput(false);
        }
      })
      .catch(() => {
        // fallback to localStorage — already initialized in useState
      })
      .finally(() => setIsFetchingKey(false));
  }, [actor]);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    localStorage.setItem("yt-api-key", val);
    // Best-effort save to backend
    if (actor) {
      actor.saveApiKey(val).catch(() => {});
    }
  };

  const loadYTApi = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (window.YT?.Player) {
        resolve();
        return;
      }
      if (ytApiLoadedRef.current) {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          prev?.();
          resolve();
        };
        return;
      }
      ytApiLoadedRef.current = true;
      window.onYouTubeIframeAPIReady = resolve;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    });
  }, []);

  const createPlayer = useCallback(
    async (videoId: string, deck: "A" | "B") => {
      await loadYTApi();

      const playerRef = deck === "A" ? playerARef : playerBRef;
      const containerRef =
        deck === "A" ? playerAContainerRef : playerBContainerRef;
      const setIsPlaying = deck === "A" ? setIsYTPlayingA : setIsYTPlayingB;

      // Destroy existing player for this deck
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        const div = document.createElement("div");
        div.id = `yt-player-${deck}-${Date.now()}`;
        containerRef.current.appendChild(div);

        playerRef.current = new window.YT.Player(div, {
          height: "1",
          width: "1",
          videoId,
          playerVars: { autoplay: 1, controls: 0, rel: 0 },
          events: {
            onStateChange: (e: any) => {
              setIsPlaying(e.data === 1);
            },
          },
        });
      }
    },
    [loadYTApi],
  );

  const handleLoadToPlayer = useCallback(
    async (result: YTResult, deck: "A" | "B") => {
      if (deck === "A") {
        setNowPlayingA({ result, deck });
        setIsYTPlayingA(false);
      } else {
        setNowPlayingB({ result, deck });
        setIsYTPlayingB(false);
      }
      await createPlayer(result.id, deck);
      onYouTubeLoadToDeck?.(result, deck);
    },
    [createPlayer, onYouTubeLoadToDeck],
  );

  const handleYTPlay = useCallback((deck: "A" | "B") => {
    try {
      (deck === "A" ? playerARef : playerBRef).current?.playVideo();
    } catch {}
  }, []);

  const handleYTPause = useCallback((deck: "A" | "B") => {
    try {
      (deck === "A" ? playerARef : playerBRef).current?.pauseVideo();
    } catch {}
  }, []);

  const handleYTStop = useCallback((deck: "A" | "B") => {
    try {
      (deck === "A" ? playerARef : playerBRef).current?.stopVideo();
    } catch {}
    if (deck === "A") {
      setNowPlayingA(null);
      setIsYTPlayingA(false);
    } else {
      setNowPlayingB(null);
      setIsYTPlayingB(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        playerARef.current?.destroy();
      } catch {}
      try {
        playerBRef.current?.destroy();
      } catch {}
    };
  }, []);

  const handleSearch = useCallback(async () => {
    if (!apiKey) {
      setError("Please enter your YouTube API key.");
      return;
    }
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}`,
      );
      if (!searchRes.ok) {
        const errBody = await searchRes.json().catch(() => ({}));
        throw new Error(
          errBody?.error?.message ?? `API error ${searchRes.status}`,
        );
      }
      const searchData = await searchRes.json();
      const items: any[] = searchData.items ?? [];

      if (items.length === 0) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      const ids = items.map((item: any) => item.id.videoId).join(",");
      const detailsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${encodeURIComponent(apiKey)}`,
      );
      const detailsData = await detailsRes.json();
      const durationMap: Record<string, string> = {};
      for (const v of detailsData.items ?? []) {
        durationMap[v.id] = parseISO8601Duration(v.contentDetails.duration);
      }

      const mapped: YTResult[] = items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          "",
        duration: durationMap[item.id.videoId] ?? "--:--",
        channelTitle: item.snippet.channelTitle,
      }));

      setResults(mapped);
    } catch (err: any) {
      setError(err.message ?? "Search failed.");
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const NowPlayingBar = ({ deck }: { deck: "A" | "B" }) => {
    const nowPlaying = deck === "A" ? nowPlayingA : nowPlayingB;
    const isPlaying = deck === "A" ? isYTPlayingA : isYTPlayingB;
    const accentColor = deck === "A" ? "#28E6FF" : "#FF3B8A";
    if (!nowPlaying) return null;
    return (
      <div
        className="mt-2 p-2 rounded border flex items-center gap-2"
        style={{
          borderColor: `${accentColor}66`,
          background: `${accentColor}10`,
        }}
        data-ocid="youtube.panel"
      >
        <img
          src={nowPlaying.result.thumbnail}
          alt={nowPlaying.result.title}
          className="w-10 h-7 object-cover rounded flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold text-dj-text truncate">
            {nowPlaying.result.title}
          </p>
          <p className="text-[8px]" style={{ color: accentColor }}>
            Playing on Deck {deck}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isPlaying ? (
            <button
              type="button"
              onClick={() => handleYTPause(deck)}
              className="w-6 h-6 rounded flex items-center justify-center border transition-all"
              style={{ borderColor: accentColor, color: accentColor }}
              data-ocid="youtube.secondary_button"
            >
              <span className="text-[8px] font-black">⏸</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleYTPlay(deck)}
              className="w-6 h-6 rounded flex items-center justify-center border transition-all"
              style={{ borderColor: "#22C55E", color: "#22C55E" }}
              data-ocid="youtube.primary_button"
            >
              <Play size={9} />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleYTStop(deck)}
            className="w-6 h-6 rounded flex items-center justify-center border transition-all"
            style={{ borderColor: "#FF4444", color: "#FF4444" }}
            data-ocid="youtube.delete_button"
          >
            <Square size={8} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (deck === "A") setNowPlayingA(null);
              else setNowPlayingB(null);
            }}
            className="w-6 h-6 rounded flex items-center justify-center border transition-all"
            style={{ borderColor: "#444", color: "#666" }}
            data-ocid="youtube.close_button"
          >
            <X size={9} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="dj-card p-4" data-ocid="youtube.panel">
      {/* Off-screen YT player containers */}
      <div
        ref={playerAContainerRef}
        style={{
          position: "fixed",
          bottom: "-9999px",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
        aria-hidden="true"
      />
      <div
        ref={playerBContainerRef}
        style={{
          position: "fixed",
          bottom: "-9999px",
          left: "-9998px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black"
            style={{
              background: "rgba(255,0,0,0.2)",
              border: "1px solid #FF4444",
              color: "#FF4444",
            }}
          >
            ▶
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-dj-muted">
            YOUTUBE
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowApiKeyInput((v) => !v)}
          className="text-[9px] uppercase tracking-wider px-2 py-1 rounded border transition-all"
          style={{
            borderColor: "#242B3A",
            color: "#666",
            background: "transparent",
          }}
          data-ocid="youtube.toggle"
        >
          {showApiKeyInput ? "Hide Key" : "API Key"}
        </button>
      </div>

      {/* API Key section */}
      {showApiKeyInput && (
        <div
          className="mb-3 p-2 rounded border"
          style={{
            borderColor: "#242B3A",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] uppercase tracking-wider text-dj-muted">
              YouTube API Key
            </span>
            {isFetchingKey && (
              <Loader2
                size={9}
                className="animate-spin ml-1"
                style={{ color: "#8B5CF6" }}
              />
            )}
            {apiKey && !isFetchingKey && (
              <span
                className="ml-auto text-[8px] px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(34,197,94,0.15)",
                  color: "#22C55E",
                  border: "1px solid rgba(34,197,94,0.3)",
                }}
              >
                ✓ Saved
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="AIza..."
              className="flex-1 bg-transparent text-[10px] px-2 py-1.5 rounded border outline-none text-dj-text placeholder:text-dj-muted"
              style={{ borderColor: "#242B3A" }}
              data-ocid="youtube.input"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="px-2 rounded border"
              style={{ borderColor: "#242B3A", color: "#666" }}
              data-ocid="youtube.toggle"
            >
              {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <p className="text-[8px] text-dj-muted mt-1">
            Get a free key at{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-dj-text"
            >
              Google Cloud Console
            </a>{" "}
            (YouTube Data API v3) — saved securely to backend
          </p>
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search YouTube..."
          className="flex-1 bg-transparent text-xs px-3 py-2 rounded border outline-none text-dj-text placeholder:text-dj-muted"
          style={{ borderColor: "#242B3A" }}
          data-ocid="youtube.search_input"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isLoading}
          className="px-3 py-2 rounded border text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
          style={{
            borderColor: "#8B5CF6",
            color: "#8B5CF6",
            background: "rgba(139,92,246,0.12)",
          }}
          data-ocid="youtube.primary_button"
        >
          {isLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Search size={12} />
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-3 px-3 py-2 rounded border text-[10px] text-red-400"
          style={{
            borderColor: "rgba(255,77,77,0.3)",
            background: "rgba(255,77,77,0.08)",
          }}
          data-ocid="youtube.error_state"
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          className="flex items-center justify-center py-8"
          data-ocid="youtube.loading_state"
        >
          <Loader2
            size={20}
            className="animate-spin"
            style={{ color: "#8B5CF6" }}
          />
        </div>
      )}

      {/* Results grid */}
      {!isLoading && results.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3" data-ocid="youtube.list">
          {results.map((result, idx) => (
            <div
              key={result.id}
              className="rounded border overflow-hidden"
              style={{
                borderColor: "#242B3A",
                background: "rgba(255,255,255,0.02)",
              }}
              data-ocid={`youtube.item.${idx + 1}`}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video">
                <img
                  src={result.thumbnail}
                  alt={result.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <span
                  className="absolute bottom-1 right-1 text-[8px] font-mono font-bold px-1 rounded"
                  style={{ background: "rgba(0,0,0,0.8)", color: "#fff" }}
                >
                  {result.duration}
                </span>
              </div>

              {/* Info */}
              <div className="p-1.5">
                <p className="text-[9px] font-semibold text-dj-text line-clamp-2 leading-tight mb-0.5">
                  {result.title}
                </p>
                <p className="text-[8px] text-dj-muted truncate">
                  {result.channelTitle}
                </p>

                {/* Load buttons */}
                <div className="flex gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => handleLoadToPlayer(result, "A")}
                    className="flex-1 py-1 rounded text-[8px] font-black uppercase tracking-wider border transition-all active:scale-95"
                    style={{
                      borderColor: "#28E6FF",
                      color: "#28E6FF",
                      background: "rgba(40,230,255,0.08)",
                    }}
                    data-ocid={`youtube.button.${idx + 1}`}
                  >
                    → A
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadToPlayer(result, "B")}
                    className="flex-1 py-1 rounded text-[8px] font-black uppercase tracking-wider border transition-all active:scale-95"
                    style={{
                      borderColor: "#FF3B8A",
                      color: "#FF3B8A",
                      background: "rgba(255,59,138,0.08)",
                    }}
                    data-ocid={`youtube.button.${idx + 1}`}
                  >
                    → B
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && results.length === 0 && !error && (
        <div
          className="text-center py-6 text-dj-muted text-[10px]"
          data-ocid="youtube.empty_state"
        >
          Search for tracks to load into your decks
        </div>
      )}

      {/* Now Playing bars */}
      <NowPlayingBar deck="A" />
      <NowPlayingBar deck="B" />

      <p className="text-[8px] text-dj-muted mt-2 text-center">
        ⚠ YouTube audio plays via browser, separate from deck audio processing
      </p>
    </div>
  );
}
