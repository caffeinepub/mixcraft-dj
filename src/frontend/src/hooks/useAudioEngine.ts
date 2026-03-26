import { useCallback, useRef, useState } from "react";

// Module-level singletons — safe across React Strict Mode double-invocations
let _audioCtx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _deckAOutputGain: GainNode | null = null;
let _deckBOutputGain: GainNode | null = null;
let _streamDest: MediaStreamAudioDestinationNode | null = null;
let _deckAStreamDest: MediaStreamAudioDestinationNode | null = null;
let _deckBStreamDest: MediaStreamAudioDestinationNode | null = null;

function initAudioContext(): void {
  if (_audioCtx) return;
  const ctx = new AudioContext();
  _audioCtx = ctx;

  const master = ctx.createGain();
  master.gain.value = 1.0;
  master.connect(ctx.destination);
  _masterGain = master;

  // Equal power crossfade center position: cos(π/4) = 1/√2
  const deckA = ctx.createGain();
  deckA.gain.value = Math.SQRT1_2;
  deckA.connect(master);
  _deckAOutputGain = deckA;

  const deckB = ctx.createGain();
  deckB.gain.value = Math.SQRT1_2;
  deckB.connect(master);
  _deckBOutputGain = deckB;

  const streamDest = ctx.createMediaStreamDestination();
  master.connect(streamDest);
  _streamDest = streamDest;

  // Per-deck stream destinations for multi-output routing
  const deckAStream = ctx.createMediaStreamDestination();
  deckA.connect(deckAStream);
  _deckAStreamDest = deckAStream;

  const deckBStream = ctx.createMediaStreamDestination();
  deckB.connect(deckBStream);
  _deckBStreamDest = deckBStream;
}

export function getAudioContext(): AudioContext {
  initAudioContext();
  return _audioCtx!;
}

export function getDeckOutputGain(deckId: "A" | "B"): GainNode {
  initAudioContext();
  return deckId === "A" ? _deckAOutputGain! : _deckBOutputGain!;
}

export function getMasterGain(): GainNode {
  initAudioContext();
  return _masterGain!;
}

export function getDeckStream(deckId: "A" | "B"): MediaStream {
  initAudioContext();
  return deckId === "A" ? _deckAStreamDest!.stream : _deckBStreamDest!.stream;
}

export function muteMasterOutput(muted: boolean): void {
  initAudioContext();
  if (_masterGain) _masterGain.gain.value = muted ? 0 : 1.0;
}

export interface AudioEngineHook {
  crossfaderPos: number;
  setCrossfader: (pos: number) => void;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  resumeContext: () => Promise<void>;
}

export function useAudioEngine(): AudioEngineHook {
  const [crossfaderPos, setCrossfaderPosState] = useState(0.5);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const setCrossfader = useCallback((pos: number) => {
    setCrossfaderPosState(pos);
    initAudioContext();
    const ctx = _audioCtx!;
    const t = ctx.currentTime;
    if (_deckAOutputGain && _deckBOutputGain) {
      _deckAOutputGain.gain.setTargetAtTime(
        Math.cos((pos * Math.PI) / 2),
        t,
        0.01,
      );
      _deckBOutputGain.gain.setTargetAtTime(
        Math.cos(((1 - pos) * Math.PI) / 2),
        t,
        0.01,
      );
    }
  }, []);

  const resumeContext = useCallback(async () => {
    initAudioContext();
    if (_audioCtx && _audioCtx.state === "suspended") {
      await _audioCtx.resume();
    }
  }, []);

  const startRecording = useCallback(() => {
    initAudioContext();
    if (!_streamDest || isRecording) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(_streamDest.stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: "audio/ogg; codecs=opus",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mixcraft-mix-${Date.now()}.ogg`;
      a.click();
      URL.revokeObjectURL(url);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  return {
    crossfaderPos,
    setCrossfader,
    isRecording,
    startRecording,
    stopRecording,
    resumeContext,
  };
}
