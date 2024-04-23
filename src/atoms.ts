import { atom } from "jotai";

export const unixDateAtom = atom(1); // global date
// export const updateTicksAtom = atom(1); // increment to let Timerails know they are allowed to recompute ticks for children from global date
export const prevDateAtom = atom(1); // global previous date
