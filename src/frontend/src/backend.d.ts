import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface DeckState {
    tracks: Array<string>;
    cuePoints: Array<bigint>;
    loopPoints: Array<[bigint, bigint]>;
}
export interface backendInterface {
    getSession(): Promise<DeckState>;
    removeSession(): Promise<void>;
    saveSession(deckState: DeckState): Promise<void>;
    saveApiKey(key: string): Promise<void>;
    getApiKey(): Promise<string | null>;
    removeApiKey(): Promise<void>;
}
