/**
 * Refine step: tap-to-tag chips (sound, energy, experience) — no tri-state questions.
 */

export type RefineSectionComments = {
  sound: string;
  energy: string;
  experience: string;
};

export const EMPTY_REFINE_SECTION_COMMENTS: RefineSectionComments = {
  sound: '',
  energy: '',
  experience: '',
};

export type RefineChipCategory = {
  id: string;
  title: string;
  /** Display labels (exact strings stored in RefineAnswers.selectedTags) */
  tags: string[];
};

export const REFINE_CHIP_CATEGORIES: RefineChipCategory[] = [
  {
    id: 'sound',
    title: 'Sound / genre',
    tags: [
      'House',
      'Techno',
      'Dubstep',
      'Drum & Bass',
      'Trap',
      'Melodic / Progressive',
      'Experimental',
    ],
  },
  {
    id: 'energy',
    title: 'Energy / feel',
    tags: ['High energy', 'Chill', 'Emotional', 'Dark', 'Euphoric', 'Aggressive'],
  },
  {
    id: 'experience',
    title: 'Experience / context',
    tags: [
      'Crowd was insane',
      'Intimate vibe',
      'Visuals carried',
      'Drop-heavy',
      'Build-up heavy',
      'Unexpected transitions',
    ],
  },
];

export const ALL_REFINE_CHIP_LABELS = REFINE_CHIP_CATEGORIES.flatMap((c) => c.tags);

/** Map chip labels to coarse tags used by event recommendations (lowercase). */
export function chipLabelsToPreferenceHints(labels: string[]): string[] {
  const out = new Set<string>();
  for (const raw of labels) {
    const t = raw.trim();
    if (!t) continue;
    const m = CHIP_TO_PREFS[t];
    if (m) for (const x of m) out.add(x);
  }
  return [...out];
}

const CHIP_TO_PREFS: Record<string, string[]> = {
  House: ['house', 'upbeat'],
  Techno: ['techno', 'driving', 'dark'],
  Dubstep: ['dubstep', 'drops', 'peak-time'],
  'Drum & Bass': ['dnb', 'driving', 'upbeat'],
  Trap: ['trap', 'drops', 'peak-time'],
  'Melodic / Progressive': ['melodic', 'emotional', 'singalong-friendly'],
  Experimental: ['electronica', 'surprising', 'organic'],
  'High energy': ['upbeat', 'peak-time'],
  Chill: ['chill', 'intimate'],
  Emotional: ['emotional', 'melancholic'],
  Dark: ['dark'],
  Euphoric: ['upbeat', 'uplifting'],
  Aggressive: ['driving', 'drops', 'peak-time'],
  'Crowd was insane': ['upbeat', 'peak-time'],
  'Intimate vibe': ['intimate', 'chill'],
  'Visuals carried': ['cinematic', 'live-feel'],
  'Drop-heavy': ['drops', 'peak-time'],
  'Build-up heavy': ['build-heavy', 'singalong-friendly'],
  'Unexpected transitions': ['surprising', 'organic'],
};

/** Smart defaults from artist + title (editable by user on screen). */
export function inferGenreTagsFromArtist(artist: string, title: string): string[] {
  const blob = `${artist} ${title}`.toLowerCase();
  const picked: string[] = [];
  const tryAdd = (label: string) => {
    if (!picked.includes(label)) picked.push(label);
  };
  if (/\b(house|disco|garrix|guetta|calvin|shm|swedish)\b/.test(blob)) tryAdd('House');
  if (/\b(techno|de witte|charlotte|industrial)\b/.test(blob)) tryAdd('Techno');
  if (/\b(dubstep|skrillex|brostep|bass)\b/.test(blob)) tryAdd('Dubstep');
  if (/\b(dnb|drum\s*&?\s*bass|jungle)\b/.test(blob)) tryAdd('Drum & Bass');
  if (/\b(trap|hip\s*hop)\b/.test(blob)) tryAdd('Trap');
  if (/\b(trance|armin|progressive|zedd|melodic|prydz)\b/.test(blob)) tryAdd('Melodic / Progressive');
  if (/\b(experimental|aphex|four tet|idm)\b/.test(blob)) tryAdd('Experimental');
  if (picked.length === 0) tryAdd('House');
  return picked.slice(0, 3);
}

/** Same shape as {@link import('./pulse').RefineAnswers} — kept here to avoid circular imports. */
export type MigratedRefinePayload = {
  selectedTags: string[];
  sectionComments: RefineSectionComments;
};

/** Legacy AsyncStorage / JSON tri-state → chip model (+ optional section notes). */
export function migrateRefineAnswers(parsed: unknown): MigratedRefinePayload {
  const base: MigratedRefinePayload = {
    selectedTags: [],
    sectionComments: { ...EMPTY_REFINE_SECTION_COMMENTS },
  };
  if (!parsed || typeof parsed !== 'object') return base;
  const o = parsed as Record<string, unknown>;

  const parseSectionComments = (): RefineSectionComments => {
    const sc = { ...EMPTY_REFINE_SECTION_COMMENTS };
    if (o.sectionComments && typeof o.sectionComments === 'object') {
      const r = o.sectionComments as Record<string, unknown>;
      if (typeof r.sound === 'string') sc.sound = r.sound;
      if (typeof r.energy === 'string') sc.energy = r.energy;
      if (typeof r.experience === 'string') sc.experience = r.experience;
    }
    return sc;
  };

  if (Array.isArray(o.selectedTags) && o.selectedTags.every((x) => typeof x === 'string')) {
    return {
      selectedTags: o.selectedTags as string[],
      sectionComments: parseSectionComments(),
    };
  }
  const tags: string[] = [];
  const chaos = o.chaosLeansChaos;
  const dark = o.darkLeansDark;
  const pred = o.predictableLeansPredictable;
  if (chaos === true) tags.push('Unexpected transitions', 'Aggressive');
  if (chaos === false) tags.push('Build-up heavy');
  if (dark === true) tags.push('Dark');
  if (dark === false) tags.push('Euphoric');
  if (pred === true) tags.push('Build-up heavy');
  if (pred === false) tags.push('Unexpected transitions');
  const uniq = [...new Set(tags)];
  return { selectedTags: uniq, sectionComments: parseSectionComments() };
}

/** Derive signature dimensions 6–8 (chaos / dark / predictable lean) from chips, 0–1 */
export function refineChipsToSignatureBias(selectedTags: string[]): [number, number, number] {
  const s = new Set(selectedTags);
  let chaos = 0;
  let dark = 0;
  let pred = 0;
  let n = 0;
  const add = (c: number, d: number, p: number) => {
    chaos += c;
    dark += d;
    pred += p;
    n++;
  };

  for (const tag of s) {
    switch (tag) {
      case 'Experimental':
        add(0.85, 0.5, 0.22);
        break;
      case 'Unexpected transitions':
        add(0.82, 0.48, 0.28);
        break;
      case 'Aggressive':
        add(0.75, 0.62, 0.42);
        break;
      case 'Drop-heavy':
        add(0.65, 0.48, 0.45);
        break;
      case 'Crowd was insane':
        add(0.62, 0.42, 0.48);
        break;
      case 'Visuals carried':
        add(0.45, 0.4, 0.52);
        break;
      case 'Build-up heavy':
        add(0.35, 0.45, 0.82);
        break;
      case 'Intimate vibe':
        add(0.38, 0.48, 0.6);
        break;
      case 'Chill':
        add(0.32, 0.42, 0.55);
        break;
      case 'Melodic / Progressive':
        add(0.42, 0.45, 0.58);
        break;
      case 'Dark':
        add(0.48, 0.88, 0.5);
        break;
      case 'Euphoric':
        add(0.42, 0.28, 0.52);
        break;
      case 'Emotional':
        add(0.45, 0.52, 0.5);
        break;
      case 'High energy':
        add(0.58, 0.4, 0.48);
        break;
      case 'House':
      case 'Techno':
      case 'Dubstep':
      case 'Drum & Bass':
      case 'Trap':
        add(0.48, 0.48, 0.55);
        break;
      default:
        break;
    }
  }

  const clamp = (x: number) => Math.max(0.08, Math.min(0.92, x));
  if (n === 0) return [0.5, 0.5, 0.5];
  return [clamp(chaos / n), clamp(dark / n), clamp(pred / n)];
}
