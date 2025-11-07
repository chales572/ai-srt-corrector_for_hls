
export interface SubtitleEntry {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

export interface PotentialError {
  id: string; // Unique ID for React key
  subtitleId: number;
  originalWord: string;
  context: string;
  reason: string;
  suggestions: string[];
}
