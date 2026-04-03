import type { ThemedEvent } from './data';
import { pulseToPreferenceTags, type TasteSummary } from './pulse';

export type ScoredThemedEvent = ThemedEvent & {
  /** 1.0–10.0, one decimal */
  scoreOutOf10: number;
  /** Short, user-facing line — no math jargon */
  scoreDescription: string;
};

function tagOverlapSet(userTags: Set<string>, eventTags: string[]): number {
  let n = 0;
  for (const t of eventTags) {
    if (userTags.has(t.toLowerCase())) n++;
  }
  return n;
}

/** Stable “scene fit” per event so the list isn’t flat when tag overlap is zero */
function eventSceneCurve(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0) % 10000;
  return 3.4 + (u / 10000) * 5.2;
}

function friendlyEventLine(
  score: number,
  gHit: number,
  vHit: number,
  hasTaste: boolean
): string {
  const hits = gHit + vHit;
  if (!hasTaste) {
    return 'A curated night out — finish a few more pulses and we can line this up tighter with your taste.';
  }
  if (hits >= 4) {
    return 'Feels very close to how you’ve been moving — similar energy and mood to your recent sets.';
  }
  if (hits >= 2) {
    return 'Solid overlap with your vibe — enough in common that it should feel familiar on the floor.';
  }
  if (hits >= 1) {
    return 'Touches part of your taste — a nice middle ground between comfort and something fresh.';
  }
  if (score >= 6.5) {
    return 'Different keywords on the flyer, but the overall feel still sits near your range — good stretch pick.';
  }
  if (score >= 4.5) {
    return 'A bit further from your usual lane — worth it if you want contrast without going totally cold.';
  }
  return 'Wild card compared with your last pulses — try it when you want a sharp change of scene.';
}

/**
 * Score blends (a) a per-event scene curve for demo variety and (b) tag overlap with your pulse/summary.
 * So events don’t all read 1.0/10 when overlap is sparse.
 */
export function rankThemedEventsForUser(
  pulse: number[] | null,
  tasteSummary: TasteSummary | null,
  events: ThemedEvent[]
): ScoredThemedEvent[] {
  const fromPulse = pulse ? pulseToPreferenceTags(pulse) : [];
  const fromTaste = tasteSummary?.tags ?? [];
  const userTags = new Set(
    [...fromPulse, ...fromTaste].map((t) => t.toLowerCase())
  );
  const hasTaste = userTags.size > 0;

  return events
    .map((e) => {
      const gTot = Math.max(e.genres.length, 1);
      const vTot = Math.max(e.vibes.length, 1);
      const gHit = tagOverlapSet(userTags, e.genres);
      const vHit = tagOverlapSet(userTags, e.vibes);
      const G = gHit / gTot;
      const V = vHit / vTot;
      const blend = 0.38 * G + 0.62 * V;
      const overlapLift = 1 + blend * 9;

      const curve = eventSceneCurve(e.id);
      const mixed = hasTaste ? 0.62 * curve + 0.38 * overlapLift : 0.55 * curve + 0.45 * (3.2 + blend * 4);

      const scoreOutOf10 =
        Math.round(Math.max(1, Math.min(10, mixed)) * 10) / 10;

      return {
        ...e,
        scoreOutOf10,
        scoreDescription: friendlyEventLine(scoreOutOf10, gHit, vHit, hasTaste),
      };
    })
    .sort((a, b) => b.scoreOutOf10 - a.scoreOutOf10);
}
