import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

actor {
  type DeckState = {
    tracks : [Text];
    cuePoints : [Nat];
    loopPoints : [(Nat, Nat)];
  };

  let sessions = Map.empty<Principal, DeckState>();
  let apiKeys = Map.empty<Principal, Text>();

  // ── Session storage ───────────────────────────────────────────────────────

  public shared ({ caller }) func saveSession(deckState : DeckState) : async () {
    sessions.add(caller, deckState);
  };

  public query ({ caller }) func getSession() : async DeckState {
    switch (sessions.get(caller)) {
      case (null) { Runtime.trap("No session found for user.") };
      case (?deckState) { deckState };
    };
  };

  public shared ({ caller }) func removeSession() : async () {
    if (not sessions.containsKey(caller)) {
      Runtime.trap("No session to remove.");
    };
    sessions.remove(caller);
  };

  // ── API key storage (per-user, private) ───────────────────────────────────

  /// Store the caller's YouTube API key in the canister.
  public shared ({ caller }) func saveApiKey(key : Text) : async () {
    apiKeys.add(caller, key);
  };

  /// Retrieve the caller's YouTube API key. Returns null if not set.
  public query ({ caller }) func getApiKey() : async ?Text {
    apiKeys.get(caller);
  };

  /// Remove the caller's stored API key.
  public shared ({ caller }) func removeApiKey() : async () {
    apiKeys.remove(caller);
  };
};
