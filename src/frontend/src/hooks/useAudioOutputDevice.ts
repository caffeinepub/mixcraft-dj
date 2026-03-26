import { useCallback, useEffect, useState } from "react";
import { getAudioContext } from "./useAudioEngine";

export type PermissionState = "idle" | "requesting" | "granted" | "denied";

export interface AudioOutputDeviceHook {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  selectDevice: (id: string) => void;
  permissionState: PermissionState;
  requestPermission: () => void;
  isSupported: boolean;
}

// Check if setSinkId is supported (Chrome 110+)
const IS_SUPPORTED =
  typeof AudioContext !== "undefined" && "setSinkId" in AudioContext.prototype;

export function useAudioOutputDevice(): AudioOutputDeviceHook {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [permissionState, setPermissionState] =
    useState<PermissionState>("idle");

  // Enumerate output devices (labels may be empty without permission)
  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const outputs = all.filter((d) => d.kind === "audiooutput");
      setDevices(outputs);
    } catch (err) {
      console.warn("[AudioOutputDevice] enumerateDevices error:", err);
    }
  }, []);

  // Request mic permission briefly to unlock device labels, then stop the stream
  const requestPermission = useCallback(async () => {
    if (!IS_SUPPORTED) return;
    setPermissionState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks immediately — we only needed permission for labels
      for (const track of stream.getTracks()) {
        track.stop();
      }
      await enumerateDevices();
      setPermissionState("granted");
    } catch (err) {
      console.warn("[AudioOutputDevice] Permission denied:", err);
      setPermissionState("denied");
    }
  }, [enumerateDevices]);

  // Apply selected device to the shared AudioContext
  const selectDevice = useCallback(async (id: string) => {
    setSelectedDeviceId(id);
    try {
      const ctx = getAudioContext();
      await (ctx as any).setSinkId(id);
    } catch (err) {
      console.warn(
        "[AudioOutputDevice] setSinkId failed, keeping previous device:",
        err,
      );
    }
  }, []);

  // Listen for device changes (plugging/unplugging)
  useEffect(() => {
    if (!IS_SUPPORTED) return;
    const handler = () => {
      if (permissionState === "granted") enumerateDevices();
    };
    navigator.mediaDevices?.addEventListener("devicechange", handler);
    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", handler);
    };
  }, [permissionState, enumerateDevices]);

  return {
    devices,
    selectedDeviceId,
    selectDevice,
    permissionState,
    requestPermission,
    isSupported: IS_SUPPORTED,
  };
}
