import { EMPTY_REFINE_SECTION_COMMENTS } from './refineChips';
import { PULSE_WAVEFORM_BINS, buildPulseSignature, buildPulseWaveform } from './pulse';
import type { RefineAnswers } from './pulse';

export type FakeFriend = {
  id: string;
  name: string;
  avatarColor: string;
  tagline: string;
  /** 12-D pulse — same pipeline as real taps + chip bias */
  pulse: number[];
  /** Tap-aligned bins — from synthetic taps, same as user waveforms */
  waveform: number[];
  /**
   * Demo-only: fixed % shown in crowd match. Waveform / bar blend toward the viewer uses this
   * so a “91%” row looks like your set and a “11%” row stays visually distinct — not a live metric.
   */
  demoPulseMatchPercent: number;
};

/** Stable PRNG for reproducible demo taps */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DEMO_SESSION_START_MS = 8_000_000_000_000;
const DEMO_DURATION_SEC = 360;

function rf(tags: string[]): RefineAnswers {
  return { selectedTags: tags, sectionComments: { ...EMPTY_REFINE_SECTION_COMMENTS } };
}

function buildFromSyntheticTaps(
  id: string,
  name: string,
  avatarColor: string,
  tagline: string,
  tapOffsetsSec: number[],
  refine: RefineAnswers,
  demoPulseMatchPercent: number
): FakeFriend {
  const start = DEMO_SESSION_START_MS;
  const D = DEMO_DURATION_SEC;
  const tapMs = tapOffsetsSec
    .map((s) => start + Math.round(Math.max(0, Math.min(D, s)) * 1000))
    .sort((a, b) => a - b);
  const sig = buildPulseSignature(tapMs, start, D, refine);
  const wf = buildPulseWaveform(tapMs, start, D);
  if (!sig || !wf) {
    const fallback = Array.from({ length: PULSE_WAVEFORM_BINS }, (_, i) =>
      Math.max(0, 0.15 + 0.05 * Math.sin((i / 47) * Math.PI))
    );
    return {
      id,
      name,
      avatarColor,
      tagline,
      pulse: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.2, 0.45, 0.48],
      waveform: fallback,
      demoPulseMatchPercent,
    };
  }
  return { id, name, avatarColor, tagline, pulse: sig, waveform: wf, demoPulseMatchPercent };
}

function mayaTaps(rng: () => number): number[] {
  const o: number[] = [];
  let t = 6;
  while (t < 76) {
    o.push(t);
    t += 0.52 + rng() * 0.5;
  }
  for (let i = 0; i < 10; i++) o.push(92 + i * 2.4 + rng() * 0.6);
  return o;
}

function jordanTaps(rng: () => number): number[] {
  const o: number[] = [];
  let t = 88;
  while (t < 292) {
    o.push(t);
    t += 1.05 + rng() * 0.35;
  }
  return o;
}

function rileyTaps(rng: () => number): number[] {
  const o: number[] = [];
  for (let t = 12; t < 55; t += 4 + rng() * 2) o.push(t);
  let u = 228;
  while (u < 348) {
    o.push(u);
    u += 0.38 + rng() * 0.22;
  }
  return o;
}

function quinnTaps(rng: () => number): number[] {
  const windows = [
    [4, 9],
    [18, 24],
    [38, 46],
    [118, 126],
    [198, 208],
    [268, 278],
  ] as const;
  const o: number[] = [];
  for (const [a, b] of windows) {
    let t = a;
    while (t < b) {
      o.push(t);
      t += 0.35 + rng() * 0.25;
    }
  }
  return o;
}

function samTaps(rng: () => number): number[] {
  return [44, 118, 176, 241, 308].map((x) => x + (rng() - 0.5) * 1.2);
}

function averyTaps(rng: () => number): number[] {
  const o: number[] = [];
  let t = 14;
  while (t < 340) {
    o.push(t);
    t += 6.5 + rng() * 4;
  }
  return o;
}

function noahTaps(rng: () => number): number[] {
  const o: number[] = [];
  let t = 22;
  while (t < 108) {
    o.push(t);
    t += 0.95 + rng() * 0.45;
  }
  t = 198;
  while (t < 292) {
    o.push(t);
    t += 1.05 + rng() * 0.4;
  }
  return o;
}

function caseyTaps(rng: () => number): number[] {
  const o: number[] = [];
  for (let k = 0; k < 14; k++) {
    const a = rng() * 320;
    const span = 4 + rng() * 10;
    let t = a;
    while (t < a + span) {
      o.push(t);
      t += 0.4 + rng() * 0.35;
    }
  }
  return [...new Set(o)].sort((x, y) => x - y).filter((x) => x >= 0 && x <= DEMO_DURATION_SEC);
}

function buildRoster(): FakeFriend[] {
  const specs: Array<{
    id: string;
    name: string;
    avatarColor: string;
    tagline: string;
    taps: (rng: () => number) => number[];
    refine: RefineAnswers;
    /** Fixed demo % — list order follows this (high → low) */
    demoPulseMatchPercent: number;
  }> = [
    {
      id: 'ff_avery',
      name: 'Avery Kim',
      avatarColor: '#5EEAD4',
      tagline: 'Even spread — reactions across the whole set.',
      taps: averyTaps,
      refine: rf(['House', 'High energy', 'Visuals carried']),
      demoPulseMatchPercent: 91,
    },
    {
      id: 'ff_maya',
      name: 'Maya Chen',
      avatarColor: '#FF2E63',
      tagline: 'Front-loads energy — loves the first hour.',
      taps: mayaTaps,
      refine: rf(['House', 'High energy', 'Crowd was insane']),
      demoPulseMatchPercent: 76,
    },
    {
      id: 'ff_jordan',
      name: 'Jordan Okonkwo',
      avatarColor: '#00F5FF',
      tagline: 'Mid-set builder — long plateau, steady hands.',
      taps: jordanTaps,
      refine: rf(['Techno', 'Chill', 'Build-up heavy']),
      demoPulseMatchPercent: 58,
    },
    {
      id: 'ff_riley',
      name: 'Riley Frost',
      avatarColor: '#7CFFB2',
      tagline: 'Closing specialist — taps cluster after the turn.',
      taps: rileyTaps,
      refine: rf(['Melodic / Progressive', 'Euphoric', 'Drop-heavy']),
      demoPulseMatchPercent: 44,
    },
    {
      id: 'ff_quinn',
      name: 'Quinn Patel',
      avatarColor: '#FFB347',
      tagline: 'Drop chaser — short bursts when the low end hits.',
      taps: quinnTaps,
      refine: rf(['Dubstep', 'Aggressive', 'Drop-heavy']),
      demoPulseMatchPercent: 33,
    },
    {
      id: 'ff_noah',
      name: 'Noah Silva',
      avatarColor: '#F472B6',
      tagline: 'Two long chapters — room to breathe, then commit.',
      taps: noahTaps,
      refine: rf(['Techno', 'Dark', 'Build-up heavy']),
      demoPulseMatchPercent: 26,
    },
    {
      id: 'ff_sam',
      name: 'Sam Rivera',
      avatarColor: '#B388FF',
      tagline: 'Sparse & selective — a few intentional peaks.',
      taps: samTaps,
      refine: rf(['Experimental', 'Emotional', 'Intimate vibe']),
      demoPulseMatchPercent: 17,
    },
    {
      id: 'ff_casey',
      name: 'Casey Brooks',
      avatarColor: '#94A3B8',
      tagline: 'Chaos enjoyer — taps land in unpredictable pockets.',
      taps: caseyTaps,
      refine: rf(['Drum & Bass', 'Unexpected transitions', 'Crowd was insane']),
      demoPulseMatchPercent: 11,
    },
  ];

  return specs.map((s) => {
    const rng = mulberry32(hashId(s.id) ^ 0x9e3779b9);
    const offsets = s.taps(rng);
    return buildFromSyntheticTaps(
      s.id,
      s.name,
      s.avatarColor,
      s.tagline,
      offsets,
      s.refine,
      s.demoPulseMatchPercent
    );
  });
}

export const FAKE_FRIENDS: FakeFriend[] = buildRoster();

export type RankedFakeFriend = FakeFriend & { similarityPercent: number };

export function rankFakeFriends(userPulse: number[] | null): RankedFakeFriend[] {
  const hasUser = !!userPulse?.length;
  return FAKE_FRIENDS.map((f) => ({
    ...f,
    similarityPercent: hasUser ? f.demoPulseMatchPercent : 0,
  })).sort((a, b) => b.similarityPercent - a.similarityPercent);
}

export function getFakeFriend(id: string): FakeFriend | undefined {
  return FAKE_FRIENDS.find((f) => f.id === id);
}

export function explainFriendMatch(userPulse: number[] | null, friend: FakeFriend): string {
  if (!userPulse?.length) {
    return 'Tap through a set first — then we can tell you how your energy lines up with this person.';
  }
  const pct = friend.demoPulseMatchPercent;
  const first = friend.name.split(' ')[0] ?? friend.name;
  if (pct >= 70) {
    return `${pct}% pulse match — you and ${first} read as a strong fit in this lineup; the compare view leans their curve toward yours so it reads clearly.`;
  }
  if (pct >= 40) {
    return `${pct}% pulse match — middle of the catalog; same ballpark energy with visible differences.`;
  }
  if (pct >= 20) {
    return `${pct}% pulse match — a looser fit here; their shape stays more its own in the compare view.`;
  }
  return `${pct}% pulse match — low overlap in this curated lineup — useful when you want contrast, not a twin.`;
}
