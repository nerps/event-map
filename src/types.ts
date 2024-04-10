export type NapoleonicWarsJSON = {
  "Battle,C,254": string;
  "Longitude,N,24,15": number;
  "Latitude,N,24,15": number;
  "Dead_or_Wo,C,254": string;
  "Date1,C,254": string;
  "Date2,C,254": string | null;
  "Date2_1,C,254": string; // this is Date2; if Date2 is null, it is Date1
  "Day1,N,10,0": number;
  "Month1,N,10,0": number;
  "Year1,N,10,0": number;
  "Day2,N,10,0": number;
  "Month2,N,10,0": number;
  "Year2,N,10,0": number;
  "French Com,C,254": string;
  "Allied Com,C,254": string;
}[];
export type Btl = {
  battle: string;
  position: [number, number];
  radius: number;
  color: [number, number, number, number];
  date1: Date;
  date2: Date;
  duration: number; // duration in days
  artifacts: string; // comma separated list of trackable artifacts (here it's people)
};
