import { atom } from "jotai";

export const unixDateAtom = atom(1); // global date
export const prevDateAtom = atom(1); // global previous date, updated only after a slider interaction has completed
