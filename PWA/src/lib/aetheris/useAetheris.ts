import { useSyncExternalStore } from "react";
import { getState, subscribe, type State } from "./store";

const serverSnapshot: State = getState();

export function useAetheris() {
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    getState,
    () => serverSnapshot,
  );
}
