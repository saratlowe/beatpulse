export type AudioSet = {
  id: string;
  title: string;
  artist: string;
  uri: string;
  durationSec: number;
};

/** Fallback when loading legacy stored events */
export const FALLBACK_AUDIO: AudioSet = {
  id: 'fallback',
  title: 'Set audio',
  artist: 'Unknown',
  uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  durationSec: 373,
};

/** User-selected file on device / blob URL on web — duration filled in when the track loads */
export function audioFromLocalFile(uri: string, title: string, durationSec = 300): AudioSet {
  const base = title.trim().replace(/\.[^./\\]+$/, '') || 'Imported set';
  return {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: base,
    artist: 'Local file',
    uri,
    durationSec,
  };
}

export function audioFromPastedUrl(uri: string, label?: string): AudioSet | null {
  const u = uri.trim();
  if (!/^https?:\/\//i.test(u)) return null;
  return {
    id: `paste_${Date.now()}`,
    title: label?.trim() || 'Your linked set',
    artist: 'Custom URL',
    uri: u,
    durationSec: 300,
  };
}

/** SoundHelix royalty-free demos — rotated as stand-in audio for MVP (not the original masters). */
const HELIX_URI = (n: number) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${((n - 1) % 12) + 1}.mp3`;
const HELIX_DUR_SEC = [373, 420, 380, 395, 410, 388, 402, 375, 418, 360, 392, 405];

type DemoCatalogRow = AudioSet & { searchBlob: string };

/**
 * Hit EDM titles for search / UX demo. Playback streams are SoundHelix placeholders, not licensed masters.
 */
const EDM_DEMO_CATALOG_INTERNAL: DemoCatalogRow[] = [
  {
    id: 'edm-shm-dywc',
    title: "Don't You Worry Child",
    artist: 'Swedish House Mafia',
    uri: HELIX_URI(1),
    durationSec: HELIX_DUR_SEC[0],
    searchBlob:
      'swedish house mafia shm progressive house don’t you worry child dywc anthem singalong festival',
  },
  {
    id: 'edm-calvin-summer',
    title: 'Summer',
    artist: 'Calvin Harris',
    uri: HELIX_URI(2),
    durationSec: HELIX_DUR_SEC[1],
    searchBlob: 'calvin harris summer big room edm pop dance radio',
  },
  {
    id: 'edm-avicii-levels',
    title: 'Levels',
    artist: 'Avicii',
    uri: HELIX_URI(3),
    durationSec: HELIX_DUR_SEC[2],
    searchBlob: 'avicii levels progressive house melbourne bounce iconic',
  },
  {
    id: 'edm-guetta-titanium',
    title: 'Titanium (feat. Sia)',
    artist: 'David Guetta',
    uri: HELIX_URI(4),
    durationSec: HELIX_DUR_SEC[3],
    searchBlob: 'david guetta sia titanium electro house vocal',
  },
  {
    id: 'edm-zedd-clarity',
    title: 'Clarity',
    artist: 'Zedd',
    uri: HELIX_URI(5),
    durationSec: HELIX_DUR_SEC[4],
    searchBlob: 'zedd clarity progressive house foxes vocal edm',
  },
  {
    id: 'edm-deadmau5-strobe',
    title: 'Strobe',
    artist: 'Deadmau5',
    uri: HELIX_URI(6),
    durationSec: HELIX_DUR_SEC[5],
    searchBlob: 'deadmau5 deadmau5 strobe progressive melodic techno',
  },
  {
    id: 'edm-skrillex-smns',
    title: 'Scary Monsters and Nice Sprites',
    artist: 'Skrillex',
    uri: HELIX_URI(7),
    durationSec: HELIX_DUR_SEC[6],
    searchBlob: 'skrillex dubstep scary monsters brostep drop',
  },
  {
    id: 'edm-garrix-animals',
    title: 'Animals',
    artist: 'Martin Garrix',
    uri: HELIX_URI(8),
    durationSec: HELIX_DUR_SEC[7],
    searchBlob: 'martin garrix animals big room house festival mainstage',
  },
  {
    id: 'edm-chainsmokers-closer',
    title: 'Closer',
    artist: 'The Chainsmokers',
    uri: HELIX_URI(9),
    durationSec: HELIX_DUR_SEC[8],
    searchBlob: 'chainsmokers closer future bass pop edm halsey',
  },
  {
    id: 'edm-major-leanon',
    title: 'Lean On',
    artist: 'Major Lazer & DJ Snake',
    uri: HELIX_URI(10),
    durationSec: HELIX_DUR_SEC[9],
    searchBlob: 'major lazer dj snake lean on mø dancehall edm',
  },
  {
    id: 'edm-disclosure-latch',
    title: 'Latch',
    artist: 'Disclosure',
    uri: HELIX_URI(11),
    durationSec: HELIX_DUR_SEC[10],
    searchBlob: 'disclosure latch uk garage deep house sam smith vocal',
  },
  {
    id: 'edm-daft-onemore',
    title: 'One More Time',
    artist: 'Daft Punk',
    uri: HELIX_URI(12),
    durationSec: HELIX_DUR_SEC[11],
    searchBlob: 'daft punk one more time french house filter disco',
  },
  {
    id: 'edm-prydz-opus',
    title: 'Opus',
    artist: 'Eric Prydz',
    uri: HELIX_URI(1),
    durationSec: HELIX_DUR_SEC[0],
    searchBlob: 'eric prydz opus progressive house epic build',
  },
  {
    id: 'edm-tiesto-adagio',
    title: 'Adagio for Strings',
    artist: 'Tiësto',
    uri: HELIX_URI(2),
    durationSec: HELIX_DUR_SEC[1],
    searchBlob: 'tiesto tiesto adagio trance classical remix festival',
  },
  {
    id: 'edm-benassi-sat',
    title: 'Satisfaction',
    artist: 'Benny Benassi',
    uri: HELIX_URI(3),
    durationSec: HELIX_DUR_SEC[2],
    searchBlob: 'benny benassi satisfaction electro house electroclash',
  },
  {
    id: 'edm-armin-feels',
    title: 'This Is What It Feels Like',
    artist: 'Armin van Buuren',
    uri: HELIX_URI(4),
    durationSec: HELIX_DUR_SEC[3],
    searchBlob: 'armin van buuren trance feels like vocal uplifting',
  },
];

function stripDemoMeta(row: DemoCatalogRow): AudioSet {
  const { searchBlob: _, ...rest } = row;
  return rest;
}

/**
 * MVP demo search over hit EDM metadata. Requires ≥2 characters. Results are not streamed from Spotify etc.
 */
export function searchEdmDemoTracks(query: string): AudioSet[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return EDM_DEMO_CATALOG_INTERNAL.filter((row) => row.searchBlob.includes(q)).map(stripDemoMeta);
}

/** Events for recommendations: vibe / genre only — no pulse vector */
export type ThemedEvent = {
  id: string;
  artist: string;
  venue: string;
  dateLabel: string;
  genres: string[];
  vibes: string[];
};

export const THEMED_EVENTS: ThemedEvent[] = [
  {
    id: 'te1',
    artist: 'Honey Dijon',
    venue: 'Smartbar',
    dateLabel: 'May 3, 2026',
    genres: ['house', 'disco'],
    vibes: ['upbeat', 'soulful', 'singalong-friendly'],
  },
  {
    id: 'te2',
    artist: 'Charlotte de Witte',
    venue: 'Terminal 5',
    dateLabel: 'Jun 14, 2026',
    genres: ['techno'],
    vibes: ['dark', 'driving', 'peak-time'],
  },
  {
    id: 'te3',
    artist: 'Fred again..',
    venue: 'Red Rocks',
    dateLabel: 'Jul 2, 2026',
    genres: ['edm', 'UK garage'],
    vibes: ['emotional', 'upbeat', 'crowd-choir moments'],
  },
  {
    id: 'te4',
    artist: 'Four Tet',
    venue: 'Brooklyn Mirage',
    dateLabel: 'Aug 9, 2026',
    genres: ['electronica', 'house'],
    vibes: ['chill', 'organic', 'live-feel'],
  },
  {
    id: 'te5',
    artist: 'Peggy Gou',
    venue: 'Knockdown Center',
    dateLabel: 'Sep 1, 2026',
    genres: ['house', 'k-house'],
    vibes: ['playful', 'upbeat', 'melodic'],
  },
  {
    id: 'te6',
    artist: 'Bicep',
    venue: 'Printworks',
    dateLabel: 'Oct 18, 2026',
    genres: ['electronica', 'breaks'],
    vibes: ['melancholic', 'cinematic', 'build-heavy'],
  },
];
