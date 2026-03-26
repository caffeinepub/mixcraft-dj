import { useCallback, useEffect, useRef, useState } from "react";
import type { DeckActions, DeckHookResult, DeckState } from "../types/audio";
import { getAudioContext, getDeckOutputGain } from "./useAudioEngine";

function createImpulseResponse(ctx: AudioContext): AudioBuffer {
  const duration = 2.5;
  const decay = 3.0;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return buffer;
}

function extractWaveformPeaks(
  buffer: AudioBuffer,
  numPoints: number,
): Float32Array {
  const channelData = buffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / numPoints);
  const peaks = new Float32Array(numPoints);
  for (let i = 0; i < numPoints; i++) {
    let max = 0;
    const start = i * blockSize;
    for (let j = 0; j < blockSize && start + j < channelData.length; j++) {
      const abs = Math.abs(channelData[start + j]);
      if (abs > max) max = abs;
    }
    peaks[i] = max;
  }
  return peaks;
}

function detectBPM(buffer: AudioBuffer): number {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const hopSize = Math.floor(sampleRate * 0.01);
  const numFrames = Math.floor(channelData.length / hopSize);
  const energies: number[] = [];

  for (let i = 0; i < numFrames; i++) {
    let energy = 0;
    const start = i * hopSize;
    for (let j = 0; j < hopSize; j++) {
      energy += (channelData[start + j] || 0) ** 2;
    }
    energies.push(energy / hopSize);
  }

  const avg = energies.reduce((a, b) => a + b, 0) / energies.length;
  const threshold = avg * 1.5;
  const beats: number[] = [];
  let lastBeat = -100;

  for (let i = 1; i < energies.length - 1; i++) {
    if (
      energies[i] > threshold &&
      energies[i] >= energies[i - 1] &&
      i - lastBeat > 30
    ) {
      beats.push((i * hopSize) / sampleRate);
      lastBeat = i;
    }
  }

  if (beats.length < 4) return 120;

  const intervals: number[] = [];
  for (let i = 1; i < Math.min(beats.length, 16); i++) {
    intervals.push(beats[i] - beats[i - 1]);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  let bpm = 60 / avgInterval;
  while (bpm < 70) bpm *= 2;
  while (bpm > 200) bpm /= 2;
  return Math.round(bpm * 10) / 10;
}

const DEFAULT_STATE: DeckState = {
  trackName: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  bpm: null,
  baseBpm: null,
  playbackRate: 1.0,
  gain: 0.8,
  eq: { high: 0, mid: 0, low: 0 },
  loop: { enabled: false, inPoint: 0, outPoint: 0 },
  cuePoints: [null, null, null],
  effects: { reverb: false, echo: false, filter: false },
  filterFreq: 1000,
  waveformData: null,
  vuLevel: 0,
};

export function useDeck(deckId: "A" | "B", storageKey: string): DeckHookResult {
  const [state, setState] = useState<DeckState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          eq: parsed.eq ?? DEFAULT_STATE.eq,
          cuePoints: parsed.cuePoints ?? DEFAULT_STATE.cuePoints,
        };
      }
    } catch {}
    return { ...DEFAULT_STATE };
  });

  const gainNodeRef = useRef<GainNode | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const lowFilterRef = useRef<BiquadFilterNode | null>(null);
  const reverbWetRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const echoWetRef = useRef<GainNode | null>(null);
  const echoDelayRef = useRef<DelayNode | null>(null);
  const echoFeedbackRef = useRef<GainNode | null>(null);
  const filterLPFRef = useRef<BiquadFilterNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);

  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const durationRef = useRef<number>(0);
  const playbackRateRef = useRef<number>(1.0);
  const loopRef = useRef({ enabled: false, inPoint: 0, outPoint: 0 });
  const nodesInitializedRef = useRef<boolean>(false);
  const playFnRef = useRef<() => void>(() => {});

  const initNodes = useCallback(() => {
    if (nodesInitializedRef.current) return;
    nodesInitializedRef.current = true;

    const ctx = getAudioContext();
    const deckOutputGain = getDeckOutputGain(deckId);

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.8;
    gainNodeRef.current = gainNode;

    const highFilter = ctx.createBiquadFilter();
    highFilter.type = "highshelf";
    highFilter.frequency.value = 8000;
    highFilterRef.current = highFilter;

    const midFilter = ctx.createBiquadFilter();
    midFilter.type = "peaking";
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 1.0;
    midFilterRef.current = midFilter;

    const lowFilter = ctx.createBiquadFilter();
    lowFilter.type = "lowshelf";
    lowFilter.frequency.value = 250;
    lowFilterRef.current = lowFilter;

    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0;
    reverbWetRef.current = reverbWet;

    const convolver = ctx.createConvolver();
    convolver.buffer = createImpulseResponse(ctx);
    convolverRef.current = convolver;

    const echoWet = ctx.createGain();
    echoWet.gain.value = 0;
    echoWetRef.current = echoWet;

    const echoDelay = ctx.createDelay(2.0);
    echoDelay.delayTime.value = 0.35;
    echoDelayRef.current = echoDelay;

    const echoFeedback = ctx.createGain();
    echoFeedback.gain.value = 0;
    echoFeedbackRef.current = echoFeedback;

    const filterLPF = ctx.createBiquadFilter();
    filterLPF.type = "lowpass";
    filterLPF.frequency.value = 20000;
    filterLPF.Q.value = 0.7;
    filterLPFRef.current = filterLPF;

    const outputGain = ctx.createGain();
    outputGain.gain.value = 1.0;
    outputGainRef.current = outputGain;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    gainNode.connect(highFilter);
    highFilter.connect(midFilter);
    midFilter.connect(lowFilter);

    lowFilter.connect(filterLPF);
    lowFilter.connect(reverbWet);
    reverbWet.connect(convolver);
    convolver.connect(filterLPF);
    lowFilter.connect(echoWet);
    echoWet.connect(echoDelay);
    echoDelay.connect(echoFeedback);
    echoFeedback.connect(echoDelay);
    echoDelay.connect(filterLPF);

    filterLPF.connect(outputGain);
    outputGain.connect(analyser);
    analyser.connect(deckOutputGain);
  }, [deckId]);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      if (!analyserRef.current) return;

      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteTimeDomainData(data);
      let rms = 0;
      for (let i = 0; i < data.length; i++) {
        const s = (data[i] - 128) / 128;
        rms += s * s;
      }
      const vuLevel = Math.min(Math.sqrt(rms / data.length) * 5, 1);

      if (isPlayingRef.current) {
        const ctx = getAudioContext();
        const elapsed = ctx.currentTime - startedAtRef.current;
        let ct = pausedAtRef.current + elapsed * playbackRateRef.current;

        if (
          loopRef.current.enabled &&
          loopRef.current.outPoint > loopRef.current.inPoint
        ) {
          const loopLen = loopRef.current.outPoint - loopRef.current.inPoint;
          if (ct >= loopRef.current.outPoint) {
            ct =
              loopRef.current.inPoint +
              ((ct - loopRef.current.inPoint) % loopLen);
          }
        } else {
          ct = Math.min(ct, durationRef.current);
        }

        setState((prev) => ({ ...prev, currentTime: ct, vuLevel }));
      } else {
        setState((prev) =>
          prev.vuLevel === vuLevel ? prev : { ...prev, vuLevel },
        );
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ eq: state.eq, cuePoints: state.cuePoints }),
      );
    } catch {}
  }, [state.eq, state.cuePoints, storageKey]);

  const play = useCallback(() => {
    initNodes();
    if (!bufferRef.current) return;

    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().then(() => play());
      return;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
      } catch {}
      sourceNodeRef.current.disconnect();
    }

    const source = ctx.createBufferSource();
    source.buffer = bufferRef.current;
    source.playbackRate.value = playbackRateRef.current;

    if (
      loopRef.current.enabled &&
      loopRef.current.outPoint > loopRef.current.inPoint
    ) {
      source.loop = true;
      source.loopStart = loopRef.current.inPoint;
      source.loopEnd = loopRef.current.outPoint;
    }

    source.connect(gainNodeRef.current!);
    source.start(0, pausedAtRef.current);
    startedAtRef.current = ctx.currentTime;

    source.onended = () => {
      if (sourceNodeRef.current === source) {
        isPlayingRef.current = false;
        pausedAtRef.current = 0;
        setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
      }
    };

    sourceNodeRef.current = source;
    isPlayingRef.current = true;
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, [initNodes]);

  useEffect(() => {
    playFnRef.current = play;
  }, [play]);

  const pause = useCallback(() => {
    if (!isPlayingRef.current || !sourceNodeRef.current) return;
    const ctx = getAudioContext();
    const elapsed = ctx.currentTime - startedAtRef.current;
    pausedAtRef.current =
      pausedAtRef.current + elapsed * playbackRateRef.current;

    try {
      sourceNodeRef.current.onended = null;
      sourceNodeRef.current.stop();
    } catch {}
    sourceNodeRef.current = null;
    isPlayingRef.current = false;
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const seek = useCallback((time: number) => {
    const wasPlaying = isPlayingRef.current;
    if (wasPlaying && sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
      } catch {}
      sourceNodeRef.current = null;
      isPlayingRef.current = false;
    }
    pausedAtRef.current = Math.max(0, Math.min(time, durationRef.current));
    setState((prev) => ({ ...prev, currentTime: pausedAtRef.current }));
    if (wasPlaying) setTimeout(() => playFnRef.current(), 10);
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      initNodes();
      const ctx = getAudioContext();

      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.onended = null;
          sourceNodeRef.current.stop();
        } catch {}
        sourceNodeRef.current = null;
      }
      isPlayingRef.current = false;
      pausedAtRef.current = 0;

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      bufferRef.current = audioBuffer;
      durationRef.current = audioBuffer.duration;

      const waveformData = extractWaveformPeaks(audioBuffer, 600);
      const bpm = detectBPM(audioBuffer);

      setState((prev) => ({
        ...prev,
        trackName: file.name.replace(/\.[^.]+$/, ""),
        duration: audioBuffer.duration,
        currentTime: 0,
        isPlaying: false,
        bpm,
        baseBpm: bpm,
        waveformData,
        loop: { enabled: false, inPoint: 0, outPoint: audioBuffer.duration },
      }));
    },
    [initNodes],
  );

  const setPlaybackRate = useCallback((rate: number) => {
    playbackRateRef.current = rate;
    if (sourceNodeRef.current) sourceNodeRef.current.playbackRate.value = rate;
    setState((prev) => ({
      ...prev,
      playbackRate: rate,
      bpm: prev.baseBpm ? Math.round(prev.baseBpm * rate * 10) / 10 : null,
    }));
  }, []);

  const setGain = useCallback((gain: number) => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = gain;
    setState((prev) => ({ ...prev, gain }));
  }, []);

  const setEQ = useCallback((band: "high" | "mid" | "low", value: number) => {
    if (band === "high" && highFilterRef.current)
      highFilterRef.current.gain.value = value;
    else if (band === "mid" && midFilterRef.current)
      midFilterRef.current.gain.value = value;
    else if (band === "low" && lowFilterRef.current)
      lowFilterRef.current.gain.value = value;
    setState((prev) => ({ ...prev, eq: { ...prev.eq, [band]: value } }));
  }, []);

  const setCuePoint = useCallback((index: 0 | 1 | 2) => {
    let time: number;
    if (isPlayingRef.current) {
      const ctx = getAudioContext();
      time =
        pausedAtRef.current +
        (ctx.currentTime - startedAtRef.current) * playbackRateRef.current;
    } else {
      time = pausedAtRef.current;
    }
    setState((prev) => {
      const newCues: [number | null, number | null, number | null] = [
        ...prev.cuePoints,
      ] as [number | null, number | null, number | null];
      newCues[index] = time;
      return { ...prev, cuePoints: newCues };
    });
  }, []);

  const jumpToCue = useCallback(
    (index: 0 | 1 | 2) => {
      setState((prev) => {
        const cueTime = prev.cuePoints[index];
        if (cueTime !== null) setTimeout(() => seek(cueTime), 0);
        return prev;
      });
    },
    [seek],
  );

  const setLoopIn = useCallback(() => {
    let time: number;
    if (isPlayingRef.current) {
      const ctx = getAudioContext();
      time =
        pausedAtRef.current +
        (ctx.currentTime - startedAtRef.current) * playbackRateRef.current;
    } else {
      time = pausedAtRef.current;
    }
    loopRef.current = { ...loopRef.current, inPoint: time };
    setState((prev) => ({ ...prev, loop: { ...prev.loop, inPoint: time } }));
  }, []);

  const setLoopOut = useCallback(() => {
    let time: number;
    if (isPlayingRef.current) {
      const ctx = getAudioContext();
      time =
        pausedAtRef.current +
        (ctx.currentTime - startedAtRef.current) * playbackRateRef.current;
    } else {
      time = pausedAtRef.current;
    }
    loopRef.current = { ...loopRef.current, outPoint: time };
    setState((prev) => ({ ...prev, loop: { ...prev.loop, outPoint: time } }));
  }, []);

  const toggleLoop = useCallback(() => {
    setState((prev) => {
      const newEnabled = !prev.loop.enabled;
      loopRef.current = { ...loopRef.current, enabled: newEnabled };
      return { ...prev, loop: { ...prev.loop, enabled: newEnabled } };
    });
  }, []);

  const toggleEffect = useCallback((effect: "reverb" | "echo" | "filter") => {
    setState((prev) => {
      const newEnabled = !prev.effects[effect];
      const ctx = getAudioContext();
      const t = ctx.currentTime;
      if (effect === "reverb" && reverbWetRef.current) {
        reverbWetRef.current.gain.setTargetAtTime(
          newEnabled ? 0.4 : 0,
          t,
          0.05,
        );
      } else if (
        effect === "echo" &&
        echoWetRef.current &&
        echoFeedbackRef.current
      ) {
        echoWetRef.current.gain.setTargetAtTime(newEnabled ? 0.4 : 0, t, 0.05);
        echoFeedbackRef.current.gain.setTargetAtTime(
          newEnabled ? 0.4 : 0,
          t,
          0.05,
        );
      } else if (effect === "filter" && filterLPFRef.current) {
        filterLPFRef.current.frequency.setTargetAtTime(
          newEnabled ? prev.filterFreq : 20000,
          t,
          0.05,
        );
      }
      return { ...prev, effects: { ...prev.effects, [effect]: newEnabled } };
    });
  }, []);

  const setFilterFreq = useCallback((freq: number) => {
    setState((prev) => {
      if (filterLPFRef.current && prev.effects.filter) {
        filterLPFRef.current.frequency.setTargetAtTime(
          freq,
          getAudioContext().currentTime,
          0.05,
        );
      }
      return { ...prev, filterFreq: freq };
    });
  }, []);

  const resetToDefault = useCallback(() => {
    // Reset audio nodes
    if (gainNodeRef.current) gainNodeRef.current.gain.value = 0.8;
    if (highFilterRef.current) highFilterRef.current.gain.value = 0;
    if (midFilterRef.current) midFilterRef.current.gain.value = 0;
    if (lowFilterRef.current) lowFilterRef.current.gain.value = 0;
    if (reverbWetRef.current) reverbWetRef.current.gain.value = 0;
    if (echoWetRef.current) echoWetRef.current.gain.value = 0;
    if (echoFeedbackRef.current) echoFeedbackRef.current.gain.value = 0;
    if (filterLPFRef.current) filterLPFRef.current.frequency.value = 20000;
    playbackRateRef.current = 1.0;
    if (sourceNodeRef.current) sourceNodeRef.current.playbackRate.value = 1.0;

    setState((prev) => ({
      ...prev,
      gain: 0.8,
      eq: { high: 0, mid: 0, low: 0 },
      effects: { reverb: false, echo: false, filter: false },
      playbackRate: 1.0,
      bpm: prev.baseBpm,
      filterFreq: 1000,
    }));
  }, []);

  const actions: DeckActions = {
    loadFile,
    play,
    pause,
    seek,
    setPlaybackRate,
    setGain,
    setEQ,
    setCuePoint,
    jumpToCue,
    setLoopIn,
    setLoopOut,
    toggleLoop,
    toggleEffect,
    setFilterFreq,
    resetToDefault,
  };

  return { state, actions, analyserNode: analyserRef.current };
}
