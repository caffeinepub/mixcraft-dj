import type { DeckHookResult } from "../types/audio";
import { DeckPanel } from "./DeckPanel";

interface YTTrack {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface DeckAProps {
  deck: DeckHookResult;
  onLoadFile?: (file: File, deckId: "A" | "B") => void;
  ytTrack?: YTTrack | null;
}

export function DeckA({ deck, onLoadFile, ytTrack }: DeckAProps) {
  return (
    <DeckPanel
      deck={deck}
      deckId="A"
      accentColor="#28E6FF"
      onLoadFile={onLoadFile}
      ytTrack={ytTrack}
    />
  );
}
