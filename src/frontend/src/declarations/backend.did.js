/* eslint-disable */
// @ts-nocheck
import { IDL } from '@icp-sdk/core/candid';

export const DeckState = IDL.Record({
  'tracks' : IDL.Vec(IDL.Text),
  'cuePoints' : IDL.Vec(IDL.Nat),
  'loopPoints' : IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Nat)),
});

export const idlService = IDL.Service({
  'getSession' : IDL.Func([], [DeckState], ['query']),
  'removeSession' : IDL.Func([], [], []),
  'saveSession' : IDL.Func([DeckState], [], []),
  'saveApiKey' : IDL.Func([IDL.Text], [], []),
  'getApiKey' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
  'removeApiKey' : IDL.Func([], [], []),
});

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const DeckState = IDL.Record({
    'tracks' : IDL.Vec(IDL.Text),
    'cuePoints' : IDL.Vec(IDL.Nat),
    'loopPoints' : IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Nat)),
  });
  return IDL.Service({
    'getSession' : IDL.Func([], [DeckState], ['query']),
    'removeSession' : IDL.Func([], [], []),
    'saveSession' : IDL.Func([DeckState], [], []),
    'saveApiKey' : IDL.Func([IDL.Text], [], []),
    'getApiKey' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'removeApiKey' : IDL.Func([], [], []),
  });
};

export const init = ({ IDL }) => { return []; };
