import { matchPercent, PULSE_WAVEFORM_BINS } from './pulse';

export type FakeFriend = {
  id: string;
  name: string;
  avatarColor: string;
  /** One-line persona for the MVP roster */
  tagline: string;
  /** 12-D pulse vector (same space as the user’s signature) */
  pulse: number[];
  /** Time-aligned fake engagement curve (length = PULSE_WAVEFORM_BINS) */
  waveform: number[];
};

/** Bump segments [startBin, endBin, peakHeight] — sine envelope inside each */
function nest(...segments: [number, number, number][]): number[] {
  const out = Array.from({ length: PULSE_WAVEFORM_BINS }, () => 0);
  for (const [s, e, h] of segments) {
    for (let i = Math.max(0, s); i <= Math.min(PULSE_WAVEFORM_BINS - 1, e); i++) {
      const u = (i - s) / Math.max(e - s, 1);
      out[i] = Math.max(out[i], h * Math.sin(Math.PI * Math.min(1, Math.max(0, u))));
    }
  }
  return out;
}

/**
 * Static “friends” with handcrafted vectors + waveforms for demo matching.
 */
export const FAKE_FRIENDS: FakeFriend[] = [
  {
    id: 'ff_maya',
    name: 'Maya Chen',
    avatarColor: '#FF2E63',
    tagline: 'Front-loads energy — loves the first hour.',
    pulse: [0.82, 0.35, 0.72, 0.68, 0.78, 0.44, 0.42, 0.38, 0.48, 0.22, 0.35, 0.52],
    waveform: nest([1, 18, 0.95], [19, 28, 0.45], [29, 47, 0]),
  },
  {
    id: 'ff_jordan',
    name: 'Jordan Okonkwo',
    avatarColor: '#00F5FF',
    tagline: 'Mid-set builder — long plateau, few spikes.',
    pulse: [0.55, 0.42, 0.68, 0.35, 0.48, 0.51, 0.5, 0.52, 0.55, 0.18, 0.42, 0.48],
    waveform: nest([8, 32, 0.88], [33, 47, 0.08]),
  },
  {
    id: 'ff_riley',
    name: 'Riley Frost',
    avatarColor: '#7CFFB2',
    tagline: 'Closing specialist — taps explode after the halfway mark.',
    pulse: [0.48, 0.55, 0.58, 0.72, 0.28, 0.62, 0.55, 0.48, 0.42, 0.28, 0.5, 0.55],
    waveform: nest([0, 22, 0.12], [23, 42, 0.92], [43, 47, 0.15]),
  },
  {
    id: 'ff_quinn',
    name: 'Quinn Patel',
    avatarColor: '#FFB347',
    tagline: 'Drop chaser — bursty, irregular intervals.',
    pulse: [0.75, 0.62, 0.45, 0.82, 0.52, 0.58, 0.62, 0.45, 0.38, 0.35, 0.4, 0.62],
    waveform: nest([2, 6, 0.9], [10, 14, 0.85], [18, 22, 0.75], [28, 34, 0.95], [38, 44, 0.7]),
  },
  {
    id: 'ff_sam',
    name: 'Sam Rivera',
    avatarColor: '#B388FF',
    tagline: 'Sparse & selective — low density, high intention.',
    pulse: [0.32, 0.48, 0.78, 0.22, 0.55, 0.66, 0.35, 0.58, 0.62, 0.12, 0.38, 0.35],
    waveform: nest([4, 9, 0.55], [20, 25, 0.62], [35, 40, 0.5]),
  },
  {
    id: 'ff_avery',
    name: 'Avery Kim',
    avatarColor: '#5EEAD4',
    tagline: 'Even spread — taps across the whole recording.',
    pulse: [0.62, 0.38, 0.62, 0.48, 0.5, 0.5, 0.48, 0.5, 0.5, 0.25, 0.45, 0.5],
    waveform: nest([2, 45, 0.72]),
  },
  {
    id: 'ff_noah',
    name: 'Noah Silva',
    avatarColor: '#F472B6',
    tagline: 'Dark-room lean — structured, predictable arcs.',
    pulse: [0.58, 0.28, 0.75, 0.42, 0.6, 0.48, 0.32, 0.72, 0.68, 0.15, 0.48, 0.52],
    waveform: nest([5, 20, 0.65], [21, 38, 0.55], [39, 46, 0.4]),
  },
  {
    id: 'ff_casey',
    name: 'Casey Brooks',
    avatarColor: '#94A3B8',
    tagline: 'Chaos enjoyer — messy, high-variance pattern.',
    pulse: [0.7, 0.68, 0.42, 0.58, 0.45, 0.55, 0.78, 0.42, 0.32, 0.42, 0.36, 0.58],
    waveform: nest([0, 8, 0.5], [6, 14, 0.85], [12, 24, 0.4], [22, 36, 0.9], [30, 47, 0.35]),
  },
];

export type RankedFakeFriend = FakeFriend & { similarityPercent: number };

/** Rank by how close their demo pulse is to yours (0–100). */
export function rankFakeFriends(userPulse: number[] | null): RankedFakeFriend[] {
  return FAKE_FRIENDS.map((f) => ({
    ...f,
    similarityPercent: userPulse?.length ? matchPercent(userPulse, f.pulse) : 0,
  })).sort((a, b) => b.similarityPercent - a.similarityPercent);
}

export function getFakeFriend(id: string): FakeFriend | undefined {
  return FAKE_FRIENDS.find((f) => f.id === id);
}

/** Plain-language match line for the compare screen */
export function explainFriendMatch(userPulse: number[] | null, friend: FakeFriend): string {
  if (!userPulse?.length) {
    return 'Tap through a set first — then we can tell you how your energy lines up with this person.';
  }
  const pct = matchPercent(userPulse, friend.pulse);
  const first = friend.name.split(' ')[0] ?? friend.name;
  if (pct >= 78) {
    return `${pct}% similar energy — you and ${first} are almost shoulder-to-shoulder on the way you ride a set.`;
  }
  if (pct >= 58) {
    return `${pct}% similar energy — lots of overlap; you’d likely enjoy the same peaks and pockets of the night.`;
  }
  if (pct >= 42) {
    return `${pct}% similar energy — same ballpark with a few different habits; useful reference for contrast.`;
  }
  return `${pct}% similar energy — a different shape from yours — handy when you want to see what “opposite” feels like.`;
}
