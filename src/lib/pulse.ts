/**
 * Pulse signature: 12-dimensional vector — tap-heavy fingerprint + refine + meta.
 * Tap dimensions are nonlinear mixes so different tap patterns produce visibly different profiles.
 * Returns null when there were no taps (opt-out / skip before engaging).
 */

export type RefineAnswers = {
  chaosLeansChaos: boolean | null;
  darkLeansDark: boolean | null;
  predictableLeansPredictable: boolean | null;
};

export type TasteSummary = {
  /** Short lines for UI */
  lines: string[];
  /** Normalized tags for event matching */
  tags: string[];
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/** Bins for tap-aligned waveform (same length as fake-friend demo curves). */
export const PULSE_WAVEFORM_BINS = 48;

/**
 * Tap-aligned engagement curve over the full track length.
 * Bins before the first tap and after the last tap stay at 0 — no synthetic motion where you didn’t tap.
 * Bins between first/last tap reflect tap density + small burst bonus only (no decorative sine waves).
 */
export function buildPulseWaveform(
  tapMs: number[],
  sessionStartMs: number,
  audioDurationSec: number,
  numBins = PULSE_WAVEFORM_BINS
): number[] | null {
  if (tapMs.length === 0 || audioDurationSec <= 0) return null;
  const D = Math.max(audioDurationSec, 0.001);
  const secs = tapMs
    .map((t) => (t - sessionStartMs) / 1000)
    .filter((s) => s >= 0 && s <= D)
    .sort((a, b) => a - b);
  if (secs.length === 0) return null;

  const firstT = secs[0];
  const lastT = secs[secs.length - 1];
  const firstBin = Math.min(numBins - 1, Math.floor((firstT / D) * numBins));
  const lastBin = Math.min(numBins - 1, Math.floor((lastT / D) * numBins));

  const counts = new Array(numBins).fill(0);
  const burst = new Array(numBins).fill(0);

  for (let k = 0; k < secs.length; k++) {
    const s = secs[k];
    const b = Math.min(numBins - 1, Math.floor((s / D) * numBins));
    counts[b]++;
    if (k > 0) {
      const dt = s - secs[k - 1];
      if (dt > 0 && dt < 0.45) {
        burst[b] += Math.min(3, 0.08 / dt);
      }
    }
  }

  const raw = counts.map((c, i) => {
    if (i < firstBin || i > lastBin) return 0;
    return c * 0.42 + Math.min(burst[i], 1);
  });
  const mx = Math.max(...raw, 1e-9);
  return raw.map((v) => clamp01(v / mx));
}

function intervalFingerprint(intervals: number[]): number {
  if (intervals.length === 0) return 0.37;
  let h = 2166136261;
  for (let i = 0; i < intervals.length; i++) {
    const v = Math.round(intervals[i] * 10);
    h ^= v;
    h = Math.imul(h, 16777619);
  }
  h ^= intervals.length * 1315423911;
  return ((h >>> 0) % 10007) / 10007;
}

export function tapTimestampsToFeatures(
  tapMs: number[],
  sessionStartMs: number,
  audioDurationSec: number,
  useFullTrackForBalance = false
): number[] {
  if (tapMs.length === 0) {
    return [0.12, 0.12, 0.15, 0.12, 0.12, 0.15];
  }

  const rel = tapMs.map((t) => Math.max(0, (t - sessionStartMs) / 1000));
  const span = Math.max(rel[rel.length - 1], 0.35);
  const tps = tapMs.length / span;

  const intervals: number[] = [];
  for (let i = 1; i < rel.length; i++) intervals.push(rel[i] - rel[i - 1]);
  const mean = intervals.length
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length
    : 0.5;
  const variance =
    intervals.length > 0
      ? intervals.reduce((s, x) => s + (x - mean) ** 2, 0) / intervals.length
      : 0;
  const std = Math.sqrt(variance);

  const energy = clamp01(1 - Math.exp(-tps / 3.8));
  const irregularity = clamp01(Math.sqrt(std) / 1.15);
  const rhythmStability = clamp01(1 - irregularity * 0.95);
  const fast = intervals.filter((x) => x < 0.22).length;
  const burstiness = intervals.length ? clamp01(fast / intervals.length) : 0;
  const D = Math.max(audioDurationSec, span, 0.001);
  const mid = useFullTrackForBalance ? D / 2 : span / 2;
  let early = 0;
  let late = 0;
  for (const t of rel) {
    if (t <= mid) early++;
    else late++;
  }
  const balance = clamp01(early / Math.max(early + late, 1));
  const fingerprint = intervalFingerprint(intervals);

  return [energy, irregularity, rhythmStability, burstiness, balance, fingerprint];
}

function boolToDim(v: boolean | null, ifTrue: number, ifFalse: number): number {
  if (v === null) return 0.5;
  return v ? ifTrue : ifFalse;
}

export function buildPulseSignature(
  tapMs: number[],
  sessionStartMs: number,
  audioDurationSec: number,
  answers: RefineAnswers,
  comment: string
): number[] | null {
  if (tapMs.length === 0) return null;

  const t = tapTimestampsToFeatures(tapMs, sessionStartMs, audioDurationSec, true);
  const chaos = boolToDim(answers.chaosLeansChaos, 1, 0);
  const dark = boolToDim(answers.darkLeansDark, 1, 0);
  const pred = boolToDim(answers.predictableLeansPredictable, 1, 0);
  const commentSignal = clamp01(comment.trim().length / 280);
  const durationNorm = clamp01(audioDurationSec / 720);
  const tapCountNorm = clamp01(tapMs.length / 120);

  return [...t, chaos, dark, pred, commentSignal, durationNorm, tapCountNorm];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) + 1e-9;
  return dot / denom;
}

export function matchPercent(a: number[], b: number[]): number {
  const c = cosineSimilarity(a, b);
  return Math.round(Math.max(0, Math.min(100, ((c + 1) / 2) * 100)));
}

/** Map pulse dimensions to coarse tags for themed-event matching */
export function pulseToPreferenceTags(sig: number[]): string[] {
  const energy = sig[0] ?? 0;
  const irregularity = sig[1] ?? 0;
  const rhythm = sig[2] ?? 0;
  const burstiness = sig[3] ?? 0;
  const earlyLean = sig[4] ?? 0.5;
  const chaos = sig[6] ?? 0.5;
  const dark = sig[7] ?? 0.5;
  const tags = new Set<string>();

  if (energy > 0.62) {
    tags.add('upbeat');
    tags.add('peak-time');
  } else if (energy < 0.3) {
    tags.add('chill');
    tags.add('intimate');
  }

  if (burstiness > 0.52) tags.add('drops');
  if (rhythm > 0.58) tags.add('singalong-friendly');
  if (irregularity > 0.52) tags.add('surprising');
  if (chaos > 0.58) tags.add('warehouse');
  if (dark > 0.55) tags.add('dark');
  if (dark < 0.42) tags.add('uplifting');
  if (earlyLean > 0.58) tags.add('opening-energy');
  if (earlyLean < 0.42) tags.add('closing-magic');

  return Array.from(tags);
}

export function buildTasteSummary(sig: number[] | null): TasteSummary {
  if (!sig) {
    return {
      lines: ['No pulse captured — you skipped tapping or left before engaging.'],
      tags: [],
    };
  }

  const energy = sig[0] ?? 0;
  const irregularity = sig[1] ?? 0;
  const rhythm = sig[2] ?? 0;
  const burstiness = sig[3] ?? 0;
  const chaos = sig[6] ?? 0.5;
  const dark = sig[7] ?? 0.5;
  const pred = sig[8] ?? 0.5;

  const lines: string[] = [];

  if (burstiness > 0.55 && energy > 0.5) {
    lines.push('You chase drops — quick hits when the tension releases.');
  } else if (energy > 0.65) {
    lines.push('High engagement — you ride the loud moments hard.');
  } else if (energy < 0.3) {
    lines.push('Sparse taps — you absorb more than you punch.');
  } else {
    lines.push('Balanced pacing — you react throughout the set, not just peaks.');
  }

  if (rhythm > 0.58) {
    lines.push('Singalong-friendly moments pull you in — melody and chants matter.');
  } else if (irregularity > 0.55) {
    lines.push('You respond to surprises — less predictable sections hook you.');
  } else {
    lines.push('Steady rhythm — you lock into a groove once it lands.');
  }

  if (chaos > 0.58) {
    lines.push('Chaos leans exciting — messy transitions feel alive to you.');
  } else if (chaos < 0.42) {
    lines.push('Structure matters — clean builds and releases are your comfort zone.');
  }

  if (dark > 0.55) {
    lines.push('Darker timbres resonate — you like weight and tension in the low end.');
  } else if (dark < 0.42) {
    lines.push('Bright & uplifting textures fit your pulse — euphoria over dread.');
  }

  if (pred > 0.58) {
    lines.push('Predictable arcs feel safe — you enjoy knowing where the lift lands.');
  } else if (pred < 0.42) {
    lines.push('You reward unpredictability — left turns keep you tapping.');
  }

  const tags = pulseToPreferenceTags(sig);
  return { lines: lines.slice(0, 5), tags };
}

export function insightLines(sig: number[] | null): string[] {
  if (!sig) return [];
  const energy = sig[0] ?? 0;
  const irregularity = sig[1] ?? 0;
  const burstiness = sig[3] ?? 0;
  const chaos = sig[6] ?? 0.5;
  const lines: string[] = [];

  if (energy > 0.65) lines.push('Strong spikes during high-energy moments');
  else if (energy < 0.28) lines.push('Calm, sparse tap pattern — reflective listening');
  else lines.push('Balanced energy across the session');

  if (burstiness > 0.55) lines.push('Burst-heavy tapping — quick hits clustered together');
  else if (irregularity > 0.55) lines.push('High variability in mid-range transitions');
  else lines.push('Steady rhythmic engagement');

  lines.push(`${Math.round(chaos * 100)}% weight toward chaotic vs structured vibe`);
  return lines.slice(0, 3);
}
