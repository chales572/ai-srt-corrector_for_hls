
import { SubtitleEntry } from '../types';

export const parseSrt = (srtContent: string): SubtitleEntry[] => {
  const entries: SubtitleEntry[] = [];
  const blocks = srtContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      try {
        const id = parseInt(lines[0], 10);
        const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
        if (!timeMatch) continue;
        
        const startTime = timeMatch[1];
        const endTime = timeMatch[2];
        const text = lines.slice(2).join('\n');
        
        if (!isNaN(id) && startTime && endTime && text) {
          entries.push({ id, startTime, endTime, text });
        }
      } catch (error) {
        console.error("Skipping malformed SRT block:", block);
      }
    }
  }
  return entries;
};

export const stringifySrt = (subtitles: SubtitleEntry[]): string => {
  return subtitles
    .map(entry => `${entry.id}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`)
    .join('\n\n');
};
