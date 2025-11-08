// lib/ai/choices.ts
// Προσφέρει σταθερά helpers για το AI UI, αλλά “από κάτω” διαβάζει το merged dataset.
import {
  listMergedRegions,
  getMergedChoices,
  getMergedPortByName,
  type MergedPort,
} from "../portsMerged";

export type AIChoice = {
  name: string;
  region?: string;
  hasCoords: boolean;
  source: "canonical" | "facts" | "merged";
};

export function listAIRegions(): string[] {
  return listMergedRegions();
}

export function listAIChoices(region?: string): AIChoice[] {
  return getMergedChoices(region ? { region } : undefined);
}

export function getAIPort(name: string): MergedPort | undefined {
  return getMergedPortByName(name);
}
