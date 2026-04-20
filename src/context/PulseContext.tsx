import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AudioSet } from '../lib/data';
import { FALLBACK_AUDIO } from '../lib/data';
import {
  EMPTY_REFINE_SECTION_COMMENTS,
  inferGenreTagsFromArtist,
  migrateRefineAnswers,
} from '../lib/refineChips';
import {
  buildPulseSignature,
  buildPulseWaveform,
  buildTasteSummary,
  mergeTasteWithSectionComments,
  type RefineAnswers,
  type TasteSummary,
} from '../lib/pulse';

const STORAGE_LOGGED = 'beatpulse_logged_events_v2';
const STORAGE_LOGGED_LEGACY = 'beatpulse_logged_events';
const STORAGE_REFINE = 'beatpulse_refine_defaults';

export type LoggedEvent = {
  id: string;
  artist: string;
  venue: string;
  dateLabel: string;
  audioUri: string;
  audioTitle: string;
  /** True for uploaded / imported audio — no shared “crowd” catalog for matching */
  importAudio: boolean;
  createdAt: string;
  /** Filled after completing pulse signature step */
  pulseSignature: number[] | null;
  /** Tap-aligned curve over track length */
  pulseWaveform: number[] | null;
  tasteSummary: TasteSummary | null;
  /** Legacy single refine note (older saves); migrated into section snapshot when missing */
  refineCommentSnapshot: string | null;
  /** Per-tab refine notes when the night was saved */
  refineSectionCommentsSnapshot: {
    sound: string | null;
    energy: string | null;
    experience: string | null;
  } | null;
  /** Vibe chips selected on refine when the night was saved */
  refineTagsSnapshot: string[] | null;
};

type PulseContextValue = {
  selectedAudio: AudioSet | null;
  setSelectedAudio: (a: AudioSet | null) => void;
  tapTimestampsMs: number[];
  sessionStartMs: number | null;
  sessionSeed: string;
  setSessionMeta: (startMs: number | null) => void;
  recordTap: (nowMs: number) => void;
  resetTaps: () => void;
  audioDurationSec: number;
  setAudioDurationSec: (s: number) => void;
  refineAnswers: RefineAnswers;
  setRefineAnswers: (r: RefineAnswers) => void;
  pulseSignature: number[] | null;
  pulseWaveform: number[] | null;
  tasteSummary: TasteSummary | null;
  recomputePulse: () => void;
  commitPulseSignature: (answers: RefineAnswers) => void;
  loggedEvents: LoggedEvent[];
  activeEventId: string | null;
  addLoggedEvent: (e: {
    artist: string;
    venue: string;
    dateLabel: string;
    audio: AudioSet;
  }) => string;
  beginReliveSession: (eventId: string) => void;
  newSessionSeed: () => void;
  persistActiveEventOutcome: () => void;
  clearSession: () => void;
  deleteLoggedEvent: (eventId: string) => void;
};

const defaultRefine: RefineAnswers = {
  selectedTags: [],
  sectionComments: { ...EMPTY_REFINE_SECTION_COMMENTS },
};

const PulseContext = createContext<PulseContextValue | null>(null);

function migrateLegacyEvent(raw: unknown): LoggedEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.artist !== 'string') return null;
  const audioUri =
    typeof o.audioUri === 'string' ? o.audioUri : FALLBACK_AUDIO.uri;
  const audioTitle =
    typeof o.audioTitle === 'string' ? o.audioTitle : FALLBACK_AUDIO.title;
  let pulseSignature: number[] | null = null;
  if (Array.isArray(o.pulseSignature) && o.pulseSignature.every((x) => typeof x === 'number')) {
    pulseSignature = o.pulseSignature as number[];
  }
  let pulseWaveform: number[] | null = null;
  if (Array.isArray(o.pulseWaveform) && o.pulseWaveform.every((x) => typeof x === 'number')) {
    pulseWaveform = o.pulseWaveform as number[];
  }
  let tasteSummary: TasteSummary | null = null;
  if (o.tasteSummary && typeof o.tasteSummary === 'object') {
    const ts = o.tasteSummary as { lines?: unknown; tags?: unknown };
    if (Array.isArray(ts.lines) && ts.lines.every((x) => typeof x === 'string')) {
      tasteSummary = {
        lines: ts.lines as string[],
        tags: Array.isArray(ts.tags) && ts.tags.every((x) => typeof x === 'string')
          ? (ts.tags as string[])
          : [],
      };
    }
  }
  const importAudio =
    typeof o.importAudio === 'boolean'
      ? o.importAudio
      : !(typeof audioUri === 'string' && audioUri.includes('soundhelix.com'));
  const refineCommentSnapshot =
    typeof o.refineCommentSnapshot === 'string' ? o.refineCommentSnapshot : null;

  let refineSectionCommentsSnapshot: LoggedEvent['refineSectionCommentsSnapshot'] = null;
  const scRaw = o.refineSectionCommentsSnapshot;
  if (scRaw && typeof scRaw === 'object') {
    const r = scRaw as Record<string, unknown>;
    const sound = typeof r.sound === 'string' ? r.sound : null;
    const energy = typeof r.energy === 'string' ? r.energy : null;
    const experience = typeof r.experience === 'string' ? r.experience : null;
    if (sound?.trim() || energy?.trim() || experience?.trim()) {
      refineSectionCommentsSnapshot = { sound, energy, experience };
    }
  } else if (refineCommentSnapshot?.trim()) {
    refineSectionCommentsSnapshot = {
      sound: refineCommentSnapshot,
      energy: null,
      experience: null,
    };
  }

  let refineTagsSnapshot: string[] | null = null;
  if (Array.isArray(o.refineTagsSnapshot) && o.refineTagsSnapshot.every((x) => typeof x === 'string')) {
    refineTagsSnapshot = o.refineTagsSnapshot as string[];
  }
  return {
    id: o.id,
    artist: o.artist,
    venue: typeof o.venue === 'string' ? o.venue : '',
    dateLabel: typeof o.dateLabel === 'string' ? o.dateLabel : '',
    audioUri,
    audioTitle,
    importAudio,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
    pulseSignature,
    pulseWaveform,
    tasteSummary,
    refineCommentSnapshot,
    refineSectionCommentsSnapshot,
    refineTagsSnapshot,
  };
}

export function PulseProvider({ children }: { children: React.ReactNode }) {
  const [selectedAudio, setSelectedAudio] = useState<AudioSet | null>(null);
  const [tapTimestampsMs, setTapTimestamps] = useState<number[]>([]);
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);
  const [sessionSeed, setSessionSeed] = useState(() => `s_${Date.now()}`);
  const [audioDurationSec, setAudioDurationSec] = useState(FALLBACK_AUDIO.durationSec);
  const [refineAnswers, setRefineAnswers] = useState<RefineAnswers>(defaultRefine);
  const [pulseSignature, setPulseSignature] = useState<number[] | null>(null);
  const [pulseWaveform, setPulseWaveform] = useState<number[] | null>(null);
  const [tasteSummary, setTasteSummary] = useState<TasteSummary | null>(null);
  const [loggedEvents, setLoggedEvents] = useState<LoggedEvent[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(STORAGE_LOGGED);
        if (!raw) raw = await AsyncStorage.getItem(STORAGE_LOGGED_LEGACY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown[];
          const rows = parsed
            .map((x) => migrateLegacyEvent(x))
            .filter((x): x is LoggedEvent => x !== null);
          setLoggedEvents(rows);
          if (rows.length) {
            AsyncStorage.setItem(STORAGE_LOGGED, JSON.stringify(rows)).catch(() => {});
          }
        }
        const r = await AsyncStorage.getItem(STORAGE_REFINE);
        if (r) {
          try {
            setRefineAnswers(migrateRefineAnswers(JSON.parse(r)));
          } catch {
            setRefineAnswers(defaultRefine);
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_REFINE, JSON.stringify(refineAnswers)).catch(() => {});
  }, [refineAnswers]);

  const setSessionMeta = useCallback((startMs: number | null) => {
    setSessionStartMs(startMs);
  }, []);

  const recordTap = useCallback((nowMs: number) => {
    setTapTimestamps((prev) => [...prev, nowMs]);
  }, []);

  const resetTaps = useCallback(() => {
    setTapTimestamps([]);
    setSessionStartMs(null);
    setPulseSignature(null);
    setPulseWaveform(null);
    setTasteSummary(null);
  }, []);

  const recomputePulse = useCallback(() => {
    const start = sessionStartMs ?? Date.now();
    const sig = buildPulseSignature(tapTimestampsMs, start, audioDurationSec, refineAnswers);
    const wf = buildPulseWaveform(tapTimestampsMs, start, audioDurationSec);
    setPulseSignature(sig);
    setPulseWaveform(wf);
    setTasteSummary(
      mergeTasteWithSectionComments(
        buildTasteSummary(sig, refineAnswers.selectedTags),
        refineAnswers.sectionComments
      )
    );
  }, [tapTimestampsMs, sessionStartMs, audioDurationSec, refineAnswers]);

  const commitPulseSignature = useCallback(
    (answers: RefineAnswers) => {
      setRefineAnswers(answers);
      const start = sessionStartMs ?? Date.now();
      const sig = buildPulseSignature(tapTimestampsMs, start, audioDurationSec, answers);
      const wf = buildPulseWaveform(tapTimestampsMs, start, audioDurationSec);
      setPulseSignature(sig);
      setPulseWaveform(wf);
      setTasteSummary(
        mergeTasteWithSectionComments(
          buildTasteSummary(sig, answers.selectedTags),
          answers.sectionComments
        )
      );
    },
    [tapTimestampsMs, sessionStartMs, audioDurationSec]
  );

  const persistLogged = useCallback((next: LoggedEvent[]) => {
    AsyncStorage.setItem(STORAGE_LOGGED, JSON.stringify(next)).catch(() => {});
  }, []);

  const addLoggedEvent = useCallback(
    (e: { artist: string; venue: string; dateLabel: string; audio: AudioSet }) => {
      const id = `le_${Date.now()}`;
      const importAudio = !e.audio.id.startsWith('edm-');
      const row: LoggedEvent = {
        id,
        artist: e.artist.trim(),
        venue: e.venue.trim(),
        dateLabel: e.dateLabel.trim(),
        audioUri: e.audio.uri,
        audioTitle: e.audio.title,
        importAudio,
        createdAt: new Date().toISOString(),
        pulseSignature: null,
        pulseWaveform: null,
        tasteSummary: null,
        refineCommentSnapshot: null,
        refineSectionCommentsSnapshot: null,
        refineTagsSnapshot: null,
      };
      setLoggedEvents((prev) => {
        const next = [row, ...prev];
        persistLogged(next);
        return next;
      });
      setSelectedAudio(e.audio);
      setActiveEventId(id);
      setSessionSeed(`s_${Date.now()}_${id}`);
      setAudioDurationSec(e.audio.durationSec);
      resetTaps();
      setRefineAnswers({
        selectedTags: inferGenreTagsFromArtist(e.artist.trim(), e.audio.title),
        sectionComments: { ...EMPTY_REFINE_SECTION_COMMENTS },
      });
      return id;
    },
    [persistLogged, resetTaps]
  );

  const beginReliveSession = useCallback(
    (eventId: string) => {
      const ev = loggedEvents.find((x) => x.id === eventId);
      if (!ev) return;
      setActiveEventId(eventId);
      setSelectedAudio({
        id: `relive_${eventId}`,
        title: ev.audioTitle,
        artist: ev.artist,
        uri: ev.audioUri,
        durationSec: FALLBACK_AUDIO.durationSec,
      });
      setSessionSeed(`s_${Date.now()}_${eventId}`);
      resetTaps();
      setRefineAnswers({
        selectedTags: inferGenreTagsFromArtist(ev.artist, ev.audioTitle),
        sectionComments: { ...EMPTY_REFINE_SECTION_COMMENTS },
      });
    },
    [loggedEvents, resetTaps]
  );

  const newSessionSeed = useCallback(() => {
    setSessionSeed(`s_${Date.now()}`);
  }, []);

  const persistActiveEventOutcome = useCallback(() => {
    if (!activeEventId) return;
    const sc = refineAnswers.sectionComments;
    const refineSectionCommentsSnapshot =
      sc.sound.trim() || sc.energy.trim() || sc.experience.trim()
        ? {
            sound: sc.sound.trim() || null,
            energy: sc.energy.trim() || null,
            experience: sc.experience.trim() || null,
          }
        : null;
    const tagSnap = refineAnswers.selectedTags.length ? [...refineAnswers.selectedTags] : null;
    setLoggedEvents((prev) => {
      const next = prev.map((row) =>
        row.id === activeEventId
          ? {
              ...row,
              pulseSignature,
              pulseWaveform,
              tasteSummary,
              refineCommentSnapshot: null,
              refineSectionCommentsSnapshot,
              refineTagsSnapshot: tagSnap,
            }
          : row
      );
      persistLogged(next);
      return next;
    });
  }, [
    activeEventId,
    pulseSignature,
    pulseWaveform,
    tasteSummary,
    refineAnswers.sectionComments,
    refineAnswers.selectedTags,
    persistLogged,
  ]);

  const deleteLoggedEvent = useCallback(
    (eventId: string) => {
      setLoggedEvents((prev) => {
        const next = prev.filter((row) => row.id !== eventId);
        persistLogged(next);
        return next;
      });
      setActiveEventId((cur) => (cur === eventId ? null : cur));
    },
    [persistLogged]
  );

  const clearSession = useCallback(() => {
    setTapTimestamps([]);
    setSessionStartMs(null);
    setRefineAnswers(defaultRefine);
    setPulseSignature(null);
    setPulseWaveform(null);
    setTasteSummary(null);
    setSelectedAudio(null);
    setActiveEventId(null);
  }, []);

  const value = useMemo(
    () => ({
      selectedAudio,
      setSelectedAudio,
      tapTimestampsMs,
      sessionStartMs,
      sessionSeed,
      setSessionMeta,
      recordTap,
      resetTaps,
      audioDurationSec,
      setAudioDurationSec,
      refineAnswers,
      setRefineAnswers,
      pulseSignature,
      pulseWaveform,
      tasteSummary,
      recomputePulse,
      commitPulseSignature,
      loggedEvents,
      activeEventId,
      addLoggedEvent,
      beginReliveSession,
      newSessionSeed,
      persistActiveEventOutcome,
      clearSession,
      deleteLoggedEvent,
    }),
    [
      selectedAudio,
      tapTimestampsMs,
      sessionStartMs,
      sessionSeed,
      setSessionMeta,
      recordTap,
      resetTaps,
      audioDurationSec,
      refineAnswers,
      pulseSignature,
      pulseWaveform,
      tasteSummary,
      recomputePulse,
      commitPulseSignature,
      loggedEvents,
      activeEventId,
      addLoggedEvent,
      beginReliveSession,
      newSessionSeed,
      persistActiveEventOutcome,
      clearSession,
      deleteLoggedEvent,
    ]
  );

  return <PulseContext.Provider value={value}>{children}</PulseContext.Provider>;
}

export function usePulse() {
  const ctx = useContext(PulseContext);
  if (!ctx) throw new Error('usePulse inside PulseProvider');
  return ctx;
}
