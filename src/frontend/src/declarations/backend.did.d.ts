/* eslint-disable */
// @ts-nocheck
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export interface DeckState {
  'tracks' : Array<string>,
  'cuePoints' : Array<bigint>,
  'loopPoints' : Array<[bigint, bigint]>,
}
export interface _SERVICE {
  'getSession' : ActorMethod<[], DeckState>,
  'removeSession' : ActorMethod<[], undefined>,
  'saveSession' : ActorMethod<[DeckState], undefined>,
  'saveApiKey' : ActorMethod<[string], undefined>,
  'getApiKey' : ActorMethod<[], [string] | []>,
  'removeApiKey' : ActorMethod<[], undefined>,
}
export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
