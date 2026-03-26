export interface DeckState {
  trackName: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  bpm: number | null;
  baseBpm: number | null;
  playbackRate: number;
  gain: number;
  eq: { high: number; mid: number; low: number };
  loop: { enabled: boolean; inPoint: number; outPoint: number };
  cuePoints: [number | null, number | null, number | null];
  effects: { reverb: boolean; echo: boolean; filter: boolean };
  filterFreq: number;
  waveformData: Float32Array | null;
  vuLevel: number;
}

export interface DeckActions {
  loadFile: (file: File) => Promise<void>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setGain: (gain: number) => void;
  setEQ: (band: "high" | "mid" | "low", value: number) => void;
  setCuePoint: (index: 0 | 1 | 2) => void;
  jumpToCue: (index: 0 | 1 | 2) => void;
  setLoopIn: () => void;
  setLoopOut: () => void;
  toggleLoop: () => void;
  toggleEffect: (effect: "reverb" | "echo" | "filter") => void;
  setFilterFreq: (freq: number) => void;
  resetToDefault: () => void;
}

export interface DeckHookResult {
  state: DeckState;
  actions: DeckActions;
  analyserNode: AnalyserNode | null;
}

export interface Track {
  id: string;
  name: string;
  file: File;
  duration: number | null;
  bpm: number | null;
}
