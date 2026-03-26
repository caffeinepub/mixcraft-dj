import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Music, Upload, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import type { Track } from "../types/audio";

interface TrackBrowserProps {
  tracks: Track[];
  onLoadToDeckA: (file: File) => void;
  onLoadToDeckB: (file: File) => void;
  onAddTrack: (track: Track) => void;
  onRemoveTrack: (id: string) => void;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TrackBrowser({
  tracks,
  onLoadToDeckA,
  onLoadToDeckB,
  onAddTrack,
  onRemoveTrack,
}: TrackBrowserProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleFileDrop = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        if (
          file.type.startsWith("audio/") ||
          file.name.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/i)
        ) {
          const track: Track = {
            id: `${Date.now()}-${Math.random()}`,
            name: file.name.replace(/\.[^.]+$/, ""),
            file,
            duration: null,
            bpm: null,
          };
          const url = URL.createObjectURL(file);
          const audio = new Audio(url);
          audio.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            onAddTrack({ ...track, duration: audio.duration });
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            onAddTrack(track);
          };
          audio.load();
        }
      }
    },
    [onAddTrack],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      if (e.dataTransfer.files.length > 0) handleFileDrop(e.dataTransfer.files);
    },
    [handleFileDrop],
  );

  const filteredTracks = tracks.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className="dj-card p-4"
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      data-ocid="browser.panel"
    >
      <Tabs defaultValue="tracks">
        <div className="flex items-center justify-between mb-3">
          <TabsList className="bg-dj-surface border border-dj-border">
            <TabsTrigger
              value="tracks"
              className="text-[10px] uppercase tracking-wider data-[state=active]:text-deck-a"
              data-ocid="browser.tab"
            >
              Tracks
            </TabsTrigger>
            <TabsTrigger
              value="dropzone"
              className="text-[10px] uppercase tracking-wider data-[state=active]:text-deck-b"
              data-ocid="browser.tab"
            >
              Add Files
            </TabsTrigger>
          </TabsList>
          <input
            type="text"
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-dj-surface border border-dj-border rounded px-3 py-1 text-xs text-dj-text placeholder:text-dj-muted focus:outline-none focus:border-deck-a w-48"
            data-ocid="browser.search_input"
          />
        </div>

        <TabsContent value="tracks">
          {filteredTracks.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-8 text-dj-muted"
              data-ocid="browser.empty_state"
            >
              <Music size={32} className="mb-2 opacity-30" />
              <p className="text-xs">
                {tracks.length === 0
                  ? "No tracks loaded — drop audio files here"
                  : "No tracks match your search"}
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <AnimatePresence>
                {filteredTracks.map((track, i) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-dj-surface group cursor-pointer border border-transparent hover:border-dj-border transition-all"
                    data-ocid={`browser.item.${i + 1}`}
                  >
                    <Music size={12} className="text-dj-muted flex-shrink-0" />
                    <span className="flex-1 text-xs text-dj-text truncate">
                      {track.name}
                    </span>
                    <span className="text-[10px] text-dj-muted font-mono">
                      {formatDuration(track.duration)}
                    </span>
                    {track.bpm && (
                      <span className="text-[10px] text-dj-muted font-mono">
                        {track.bpm} BPM
                      </span>
                    )}
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onLoadToDeckA(track.file)}
                        className="px-2 py-0.5 text-[9px] rounded font-bold uppercase transition-all"
                        style={{
                          background: "rgba(40, 230, 255, 0.15)",
                          color: "#28E6FF",
                          border: "1px solid rgba(40, 230, 255, 0.4)",
                        }}
                        data-ocid="browser.primary_button"
                      >
                        &rarr; A
                      </button>
                      <button
                        type="button"
                        onClick={() => onLoadToDeckB(track.file)}
                        className="px-2 py-0.5 text-[9px] rounded font-bold uppercase transition-all"
                        style={{
                          background: "rgba(255, 59, 138, 0.15)",
                          color: "#FF3B8A",
                          border: "1px solid rgba(255, 59, 138, 0.4)",
                        }}
                        data-ocid="browser.secondary_button"
                      >
                        &rarr; B
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveTrack(track.id)}
                      className="hidden group-hover:flex text-dj-muted hover:text-dj-text transition-colors"
                      data-ocid="browser.delete_button"
                    >
                      <X size={10} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="dropzone">
          <div
            className="relative rounded-lg border-2 border-dashed p-8 text-center transition-all"
            style={{
              borderColor: isDraggingOver ? "#28E6FF" : "#242B3A",
              background: isDraggingOver
                ? "rgba(40, 230, 255, 0.05)"
                : "transparent",
            }}
            data-ocid="browser.dropzone"
          >
            <Upload
              size={32}
              className="mx-auto mb-3"
              style={{ color: isDraggingOver ? "#28E6FF" : "#98A3B3" }}
            />
            <p className="text-sm font-medium text-dj-text mb-1">
              Drop audio files here
            </p>
            <p className="text-xs text-dj-muted mb-4">
              MP3, WAV, OGG, FLAC, AAC supported
            </p>
            <label
              className="inline-flex items-center gap-2 px-4 py-2 rounded cursor-pointer text-xs font-bold uppercase tracking-wider transition-all"
              style={{
                background: "rgba(40, 230, 255, 0.15)",
                color: "#28E6FF",
                border: "1px solid rgba(40, 230, 255, 0.4)",
              }}
              data-ocid="browser.upload_button"
            >
              <ChevronRight size={12} />
              Browse Files
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.flac,.aac"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFileDrop(e.target.files);
                }}
              />
            </label>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
