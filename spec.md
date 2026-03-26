# MixCraft DJ

## Current State
A single `useAudioOutputDevice` hook applies `AudioContext.setSinkId()` to the shared AudioContext, routing the entire mix to one device. The Mixer panel shows one global "REQUEST AUDIO DEVICES" button and one output device selector.

## Requested Changes (Diff)

### Add
- Per-deck `MediaStreamAudioDestinationNode`s in `useAudioEngine.ts` to capture each deck's audio stream independently
- `getDeckStream(deckId)` export from `useAudioEngine.ts`
- `muteMasterOutput(muted)` export to silence `ctx.destination` when per-deck routing is active (prevents double playback)
- New `usePerDeckOutputRouting.ts` hook: manages two hidden `<audio>` elements (one per deck), device permission, device enumeration, and `setSinkId` per element
- Per-deck output device selectors in `Mixer.tsx` (Deck A row, Deck B row)
- Graceful fallback UI when `setSinkId` is not supported

### Modify
- `useAudioEngine.ts`: wire each `deckOutputGain` to both master chain AND a per-deck `MediaStreamAudioDestinationNode`
- `Mixer.tsx`: replace single `AudioDeviceSelector` with per-deck `PerDeckAudioRouting` component using the new hook
- Remove/deprecate the old `useAudioOutputDevice.ts` (replaced by the new hook)

### Remove
- Old `AudioDeviceSelector` component inside `Mixer.tsx` that used the global `useAudioOutputDevice` hook

## Implementation Plan
1. Update `useAudioEngine.ts` — add per-deck stream dest nodes, export `getDeckStream`, export `muteMasterOutput`
2. Create `usePerDeckOutputRouting.ts` — permission flow, device enumeration, two audio elements, per-deck `setSinkId`
3. Update `Mixer.tsx` — replace old selector with new per-deck UI component
