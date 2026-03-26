import type { DeckHookResult } from "../types/audio";
import { DeckPanel } from "./DeckPanel";

interface YTTrack {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

interface DeckBProps {
  deck: DeckHookResult;
  onLoadFile?: (file: File, deckId: "A" | "B") => void;
  ytTrack?: YTTrack | null;
}

export function DeckB({ deck, onLoadFile, ytTrack }: DeckBProps) {
  return (
    <DeckPanel
      deck={deck}
      deckId="B"
      accentColor="#FF3B8A"
      onLoadFile={onLoadFile}
      ytTrack={ytTrack}
    />
  );
}
