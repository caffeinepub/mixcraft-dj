import { useCallback, useEffect, useRef, useState } from "react";
import { getDeckStream, muteMasterOutput } from "./useAudioEngine";

const IS_SUPPORTED =
  typeof HTMLAudioElement !== "undefined" &&
  "setSinkId" in HTMLAudioElement.prototype;

export interface PerDeckOutputRouting {
  devices: MediaDeviceInfo[];
  selectedDeviceA: string;
  selectedDeviceB: string;
  selectDeviceA: (id: string) => void;
  selectDeviceB: (id: string) => void;
  permissionState: "idle" | "requesting" | "granted" | "denied";
  requestPermission: () => void;
  isSupported: boolean;
}

export function usePerDeckOutputRouting(): PerDeckOutputRouting {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceA, setSelectedDeviceA] = useState("");
  const [selectedDeviceB, setSelectedDeviceB] = useState("");
  const [permissionState, setPermissionState] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");

  const audioElARef = useRef<HTMLAudioElement | null>(null);
  const audioElBRef = useRef<HTMLAudioElement | null>(null);
  const initializedRef = useRef(false);

  const enumerateDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all);
    } catch (err) {
      console.warn("[PerDeckRouting] enumerateDevices failed", err);
    }
  }, []);

  const initAudioElements = useCallback(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Deck A hidden audio element
    const elA = new Audio();
    elA.srcObject = getDeckStream("A");
    elA.volume = 1;
    elA.play().catch(() => {});
    audioElARef.current = elA;

    // Deck B hidden audio element
    const elB = new Audio();
    elB.srcObject = getDeckStream("B");
    elB.volume = 1;
    elB.play().catch(() => {});
    audioElBRef.current = elB;
  }, []);

  const requestPermission = useCallback(async () => {
    if (!IS_SUPPORTED) return;
    setPermissionState("requesting");
    try {
      // Trigger permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const t of stream.getTracks()) t.stop();

      await enumerateDevices();
      initAudioElements();
      // Mute the AudioContext master output to avoid double-playback
      muteMasterOutput(true);
      setPermissionState("granted");
    } catch (err) {
      console.warn("[PerDeckRouting] permission denied", err);
      setPermissionState("denied");
    }
  }, [enumerateDevices, initAudioElements]);

  const selectDeviceA = useCallback((id: string) => {
    setSelectedDeviceA(id);
    if (audioElARef.current) {
      (audioElARef.current as any).setSinkId(id).catch((err: unknown) => {
        console.warn("[PerDeckRouting] setSinkId A failed", err);
      });
    }
  }, []);

  const selectDeviceB = useCallback((id: string) => {
    setSelectedDeviceB(id);
    if (audioElBRef.current) {
      (audioElBRef.current as any).setSinkId(id).catch((err: unknown) => {
        console.warn("[PerDeckRouting] setSinkId B failed", err);
      });
    }
  }, []);

  // Re-enumerate on device change (only when granted)
  useEffect(() => {
    if (permissionState !== "granted") return;
    const handler = () => enumerateDevices();
    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handler);
    };
  }, [permissionState, enumerateDevices]);

  // Restore master output on unmount
  useEffect(() => {
    return () => {
      muteMasterOutput(false);
    };
  }, []);

  return {
    devices,
    selectedDeviceA,
    selectedDeviceB,
    selectDeviceA,
    selectDeviceB,
    permissionState,
    requestPermission,
    isSupported: IS_SUPPORTED,
  };
}
