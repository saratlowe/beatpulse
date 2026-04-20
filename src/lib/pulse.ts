import {
  chipLabelsToPreferenceHints,
  refineChipsToSignatureBias,
  type RefineSectionComments,
} from './refineChips';

/**
 * Pulse signature: 12-dimensional vector — tap-heavy fingerprint + refine + meta.
 * Tap dimensions are nonlinear mixes so different tap patterns produce visibly different profiles.
 * Returns null when there were no taps (opt-out / skip before engaging).
 */

/** Multi-select vibe chips + per-tab notes from the refine step (see refineChips.ts). */
export type RefineAnswers = {
  selectedTags: string[];
  sectionComments: RefineSectionComments;
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

export function buildPulseSignature(
  tapMs: number[],
  sessionStartMs: number,
  audioDurationSec: number,
  answers: RefineAnswers
): number[] | null {
  if (tapMs.length === 0) return null;

  const t = tapTimestampsToFeatures(tapMs, sessionStartMs, audioDurationSec, true);
  const tags = answers.selectedTags ?? [];
  const [chaos, dark, pred] = refineChipsToSignatureBias(tags);
  const sc = answers.sectionComments;
  const noteLen =
    sc.sound.trim().length + sc.energy.trim().length + sc.experience.trim().length;
  const commentSignal = clamp01(noteLen / 400);
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

/**
 * Crowd / friend match: 0–100 from RMSE across the pulse vector (tighter spread than cosine on 0–1 features).
 */
export function signatureMatchPercent(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!a?.length || !b?.length) return 0;
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i]! - b[i]!) ** 2;
  const rmse = Math.sqrt(s / n);
  const sim = Math.exp(-rmse * 9);
  return Math.round(100 * clamp01(sim));
}

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Display-only: high match % → blend friend visuals toward the user so curves look alike. */
export function crowdDisplayBlendFromMatchPct(matchPct: number): number {
  return smoothstep01(14, 76, matchPct);
}

export function blendPulseVectors(
  user: number[] | null | undefined,
  friend: number[],
  blend01: number
): number[] {
  const tt = clamp01(blend01);
  const n = friend.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const f = friend[i] ?? 0;
    const u = user && i < user.length ? user[i]! : f;
    out.push(clamp01(f * (1 - tt) + u * tt));
  }
  return out;
}

export function blendWaveforms(
  user: number[] | null | undefined,
  friend: number[],
  blend01: number
): number[] {
  const tt = clamp01(blend01);
  if (!user?.length) return [...friend];
  const nu = user.length;
  const nf = friend.length;
  const out: number[] = [];
  for (let i = 0; i < nf; i++) {
    const f = friend[i] ?? 0;
    const t = nf <= 1 ? 0 : i / (nf - 1);
    const ui = Math.min(nu - 1, Math.max(0, Math.round(t * (nu - 1))));
    const u = user[ui] ?? f;
    out.push(clamp01(f * (1 - tt) + u * tt));
  }
  return out;
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

function rngFromSeed(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickVariant<T>(rand: () => number, options: T[]): T {
  const i = Math.floor(rand() * options.length) % options.length;
  return options[i]!;
}

/**
 * Display-only recap lines for Pulse signature UI — varies with `seed` (e.g. each time the screen is opened).
 * Stored `tasteSummary` / tags stay deterministic via {@link buildTasteSummary}.
 */
export function recapTasteLines(sig: number[] | null, seed: number): string[] {
  const rng = rngFromSeed(seed);
  if (!sig) {
    return [
      pickVariant(rng, [
        'No pulse captured — you skipped tapping or left before engaging.',
        'No taps on record this time — we keep the recap honest instead of guessing.',
        'You stepped back before tapping — come back when you want a fingerprint.',
      ]),
    ];
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
    lines.push(
      pickVariant(rng, [
        'You chase drops — quick hits when the tension releases.',
        'Build-and-release hooks you — you spike when the tension finally snaps.',
        'You lean into impact moments — the payoff hits harder than the climb for you.',
        'When the bottom drops, you answer — peak energy is where you show up.',
      ])
    );
  } else if (energy > 0.65) {
    lines.push(
      pickVariant(rng, [
        'High engagement — you ride the loud moments hard.',
        'You live in the peaks — volume and motion pull the most taps.',
        'Louder and busier stretches get the lion’s share of your attention.',
        'The big moments own your hands — you commit when the room goes wide open.',
      ])
    );
  } else if (energy < 0.3) {
    lines.push(
      pickVariant(rng, [
        'Sparse taps — you absorb more than you punch.',
        'You listen in patches — reactions show up like punctuation, not a wall.',
        'Quiet stretches dominate — you tap like highlights, not a constant thread.',
        'Selective energy — you touch the set when something really lands.',
      ])
    );
  } else {
    lines.push(
      pickVariant(rng, [
        'Balanced pacing — you react throughout the set, not just peaks.',
        'You spread attention across the arc — not only drops, not only downtime.',
        'Mid-range engagement — you’re present in more than one chapter of the night.',
        'Your taps trace the whole ride — peaks and pockets both get love.',
      ])
    );
  }

  if (rhythm > 0.58) {
    lines.push(
      pickVariant(rng, [
        'Singalong-friendly moments pull you in — melody and chants matter.',
        'Hooks and vocals snag you — when the crowd can shout it, you feel it.',
        'Earworm sections win — catchy phrases line up with your taps.',
        'Melodic lifts register — you lean in when the topline takes the wheel.',
      ])
    );
  } else if (irregularity > 0.55) {
    lines.push(
      pickVariant(rng, [
        'You respond to surprises — less predictable sections hook you.',
        'Left turns keep you curious — weird transitions earn your taps.',
        'When the arrangement zigzags, you notice — novelty beats autopilot.',
        'Unscripted moments spark you — the set that wanders keeps you awake.',
      ])
    );
  } else {
    lines.push(
      pickVariant(rng, [
        'Steady rhythm — you lock into a groove once it lands.',
        'You find a pocket and stay — consistency beats whiplash for you.',
        'Once the groove sets, you ride it — repetition feels grounding.',
        'Stable sections feel like home — you commit when the loop feels honest.',
      ])
    );
  }

  if (chaos > 0.58) {
    lines.push(
      pickVariant(rng, [
        'Chaos leans exciting — messy transitions feel alive to you.',
        'Rough edges feel honest — a little disorder reads as energy.',
        'You like when the mix gets unruly — polish isn’t the only thrill.',
        'Controlled mayhem speaks to you — the room wobbling is part of the fun.',
      ])
    );
  } else if (chaos < 0.42) {
    lines.push(
      pickVariant(rng, [
        'Structure matters — clean builds and releases are your comfort zone.',
        'You prefer arcs you can read — clear sections beat murky drift.',
        'Tidy arrangements land — when the DJ spells it out, you lean in.',
        'Defined phrases help you settle — you like knowing what chapter you’re in.',
      ])
    );
  }

  if (dark > 0.55) {
    lines.push(
      pickVariant(rng, [
        'Darker timbres resonate — you like weight and tension in the low end.',
        'Heavy sonics pull you — grit and rumble feel expensive.',
        'Shadowy textures fit — you’re drawn to moody, cavernous moments.',
        'The moody side of the spectrum sticks — bleak can still feel huge.',
      ])
    );
  } else if (dark < 0.42) {
    lines.push(
      pickVariant(rng, [
        'Bright & uplifting textures fit your pulse — euphoria over dread.',
        'Air and light in the mix win — you tilt toward the hopeful side.',
        'Lift and shine register — major-key energy matches your pattern.',
        'You lean sunny — when the track opens up, your taps say yes.',
      ])
    );
  }

  if (pred > 0.58) {
    lines.push(
      pickVariant(rng, [
        'Predictable arcs feel safe — you enjoy knowing where the lift lands.',
        'Familiar song shapes comfort you — the payoff lands where you expect.',
        'You like when the narrative is clear — setup and payoff in plain sight.',
        'Classic tension–release still hits — tradition isn’t boring to you.',
      ])
    );
  } else if (pred < 0.42) {
    lines.push(
      pickVariant(rng, [
        'You reward unpredictability — left turns keep you tapping.',
        'Subverted expectations earn you — the twist is part of the rush.',
        'When the DJ swerves, you answer — surprise is a feature, not a bug.',
        'You enjoy not knowing the map — the detours are where you show up.',
      ])
    );
  }

  return lines.slice(0, 5);
}

/** Display-only tap-pattern bullets; varies with `seed`. */
export function recapInsightLines(sig: number[] | null, seed: number): string[] {
  if (!sig) return [];
  const rng = rngFromSeed(seed ^ 0x9e3779b9);
  const energy = sig[0] ?? 0;
  const irregularity = sig[1] ?? 0;
  const burstiness = sig[3] ?? 0;
  const chaos = sig[6] ?? 0.5;
  const lines: string[] = [];
  const pct = Math.round(chaos * 100);

  if (energy > 0.65) {
    lines.push(
      pickVariant(rng, [
        'Strong spikes during high-energy moments',
        'Big reactions when the track swells or slams',
        'Your densest clusters line up with the loudest sections',
      ])
    );
  } else if (energy < 0.28) {
    lines.push(
      pickVariant(rng, [
        'Calm, sparse tap pattern — reflective listening',
        'Light touch on the pad — you sample the set more than you hammer it',
        'Plenty of breathing room between reactions',
      ])
    );
  } else {
    lines.push(
      pickVariant(rng, [
        'Balanced energy across the session',
        'Taps spread across the timeline — not all front-loaded or back-loaded',
        'Mid-level activity most of the way through',
      ])
    );
  }

  if (burstiness > 0.55) {
    lines.push(
      pickVariant(rng, [
        'Burst-heavy tapping — quick hits clustered together',
        'Rapid-fire clusters — you punch in short flurries',
        'Micro-bursts show up — quick hands in tight windows',
      ])
    );
  } else if (irregularity > 0.55) {
    lines.push(
      pickVariant(rng, [
        'High variability in mid-range transitions',
        'Spacing between taps shifts a lot — less metronome, more conversation',
        'Uneven gaps — your rhythm follows the story, not a grid',
      ])
    );
  } else {
    lines.push(
      pickVariant(rng, [
        'Steady rhythmic engagement',
        'Even, repeatable spacing between taps',
        'Your tap cadence stays fairly even once you lock in',
      ])
    );
  }

  lines.push(
    pickVariant(rng, [
      `${pct}% weight toward chaotic vs structured vibe`,
      `About ${pct}% tilt toward wild, messy energy over tight structure`,
      `Chaos–structure blend skews ~${pct}% toward the untamed side`,
      `Your pattern reads ~${pct}% “let it rip” versus “keep it locked”`,
    ])
  );

  return lines.slice(0, 3);
}

const SECTION_NOTE_LABELS: Record<keyof RefineSectionComments, string> = {
  sound: 'Sound / genre',
  energy: 'Energy / feel',
  experience: 'Experience / context',
};

/** Append non-empty per-section refine notes to the deterministic taste recap. */
export function mergeTasteWithSectionComments(
  taste: TasteSummary,
  sectionComments: RefineSectionComments
): TasteSummary {
  const keys: (keyof RefineSectionComments)[] = ['sound', 'energy', 'experience'];
  const extras: string[] = [];
  for (const key of keys) {
    const c = sectionComments[key].trim();
    if (!c) continue;
    const snippet = c.length > 160 ? `${c.slice(0, 157)}…` : c;
    extras.push(`Notes (${SECTION_NOTE_LABELS[key]}): ${snippet}`);
  }
  if (!extras.length) return taste;
  return { lines: [...taste.lines, ...extras], tags: taste.tags };
}

/** Pulse signature vector length from {@link buildPulseSignature} */
export const PULSE_SIGNATURE_LENGTH = 12;

export function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/**
 * Overall listening pattern across nights: per-dimension median of saved signatures.
 * Avoids time-warping different sets into one curve; captures "typical" energy/chaos/etc.
 */
export function buildAggregateProfilePulse(
  signatures: (number[] | null | undefined)[]
): number[] | null {
  const rows = signatures.filter(
    (s): s is number[] => !!s && s.length >= PULSE_SIGNATURE_LENGTH
  );
  if (rows.length === 0) return null;
  const out: number[] = [];
  for (let i = 0; i < PULSE_SIGNATURE_LENGTH; i++) {
    out.push(medianOf(rows.map((r) => r[i]!)));
  }
  return out;
}

export type EventPulseSnapshot = {
  pulseSignature: number[] | null;
  tasteSummary: TasteSummary | null;
  refineTagsSnapshot?: string[] | null;
};

/** Taste lines + tags from aggregate pulse; tags favor themes recurring across multiple nights */
export function buildAggregateTasteSummary(events: EventPulseSnapshot[]): TasteSummary {
  const completed = events.filter((e) => e.pulseSignature && e.pulseSignature.length >= PULSE_SIGNATURE_LENGTH);
  const agg = buildAggregateProfilePulse(completed.map((e) => e.pulseSignature));
  if (!agg) {
    return {
      lines: ['Log and complete at least one set with taps to build a cross-night taste read.'],
      tags: [],
    };
  }
  const base = buildTasteSummary(agg);
  const n = completed.length;
  const tagWeights = new Map<string, number>();
  for (const e of completed) {
    const fromPulse = pulseToPreferenceTags(e.pulseSignature!);
    const fromStored = e.tasteSummary?.tags ?? [];
    const fromChips = chipLabelsToPreferenceHints(e.refineTagsSnapshot ?? []);
    const merged = [...fromPulse, ...fromStored, ...fromChips];
    const seen = new Set<string>();
    for (const t of merged) {
      if (seen.has(t)) continue;
      seen.add(t);
      tagWeights.set(t, (tagWeights.get(t) ?? 0) + 1);
    }
  }
  const sortedTags = [...tagWeights.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([t]) => t);
  const head =
    n === 1
      ? 'Pattern from your saved set.'
      : `Typical pulse across ${n} saved sets (median per dimension — not one blended waveform).`;
  return {
    lines: [head, ...base.lines.slice(0, 4)],
    tags: sortedTags.length ? sortedTags : base.tags,
  };
}

export function buildTasteSummary(sig: number[] | null, refineChipLabels?: string[]): TasteSummary {
  if (!sig) {
    const chipTags = chipLabelsToPreferenceHints(refineChipLabels ?? []);
    if (chipTags.length) {
      return {
        lines: [
          'No tap fingerprint this time — your vibe chips still tune recommendations and the written recap where we can.',
        ],
        tags: chipTags,
      };
    }
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

  const tags = new Set(pulseToPreferenceTags(sig));
  for (const t of chipLabelsToPreferenceHints(refineChipLabels ?? [])) tags.add(t);
  return { lines: lines.slice(0, 5), tags: Array.from(tags) };
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
