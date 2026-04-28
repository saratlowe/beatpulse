import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Audio, AVPlaybackStatusSuccess } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePulse } from '../context/PulseContext';
import { resolveBundledDemoPlaybackSource } from '../lib/bundledDemoAudio';
import { computeLiveMetersFromTaps, decayTowardBaseline, DECAY_MS } from '../lib/tapLive';

/** Meters decay here toward 0 when idle; tap mapping in tapLive.ts still uses its internal floor for peaks. */
const IDLE_METER_TARGET = 0;
import type { LogStackParamList, RootTabParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<LogStackParamList, 'TapSession'>;
type Nav = CompositeNavigationProp<
  Props['navigation'],
  BottomTabNavigationProp<RootTabParamList>
>;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPARK_MAX = 18;
const SEEK_SEC = 10;

export function TapSessionScreen({ navigation }: Props) {
  const route = useRoute<Props['route']>();
  const mode = route.params?.mode;
  const {
    selectedAudio,
    recordTap,
    resetTaps,
    setSessionMeta,
    tapTimestampsMs,
    setAudioDurationSec,
    sessionStartMs,
  } = usePulse();

  const soundRef = useRef<Audio.Sound | null>(null);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(selectedAudio?.durationSec ?? 300);
  const [playing, setPlaying] = useState(false);
  /** True when the track has finished or is sitting at the end — center control shows Replay instead of Play */
  const [playbackEnded, setPlaybackEnded] = useState(false);
  const [energy, setEnergy] = useState(IDLE_METER_TARGET);
  const [intensity, setIntensity] = useState(IDLE_METER_TARGET);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastTapAtRef = useRef(0);
  const [sparkTrail, setSparkTrail] = useState<number[]>([]);
  const scale = useRef(new Animated.Value(1)).current;
  const tabNav = navigation as unknown as Nav;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => {
            if (mode === 'relive') {
              navigation.popToTop();
              tabNav.navigate('Home');
            } else {
              navigation.navigate('LogEventMain');
            }
          }}
          style={styles.headerBtn}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, mode, tabNav]);

  const unload = useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (s) await s.unloadAsync();
  }, []);

  useEffect(() => {
    if (!selectedAudio) return;
    let cancelled = false;
    setLoadError(null);
    setPlaybackEnded(false);
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        await unload();
        const source = resolveBundledDemoPlaybackSource(selectedAudio.uri);
        const { sound } = await Audio.Sound.createAsync(
          source,
          { shouldPlay: false, progressUpdateIntervalMillis: 250 },
          (status) => {
            if (!status.isLoaded) return;
            const st = status as AVPlaybackStatusSuccess;
            setPositionSec(st.positionMillis / 1000);
            if (st.durationMillis) {
              const d = st.durationMillis / 1000;
              setDurationSec(d);
              setAudioDurationSec(d);
            }
            setPlaying(st.isPlaying);

            const dur = st.durationMillis ?? 0;
            const pos = st.positionMillis;
            if (st.isPlaying) {
              setPlaybackEnded(false);
            } else if (st.didJustFinish) {
              setPlaybackEnded(true);
            } else if (dur > 0) {
              if (pos >= dur - 220) setPlaybackEnded(true);
              else if (pos < dur - 1500) setPlaybackEnded(false);
            }
          }
        );
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        const st = await sound.getStatusAsync();
        if (st.isLoaded && st.durationMillis) {
          const d = st.durationMillis / 1000;
          setDurationSec(d);
          setAudioDurationSec(d);
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Could not load audio');
      }
    })();
    return () => {
      cancelled = true;
      unload();
    };
  }, [selectedAudio?.uri, setAudioDurationSec, unload, selectedAudio]);

  useEffect(() => {
    if (tapTimestampsMs.length === 0) {
      setEnergy(IDLE_METER_TARGET);
      setIntensity(IDLE_METER_TARGET);
      setSparkTrail([]);
      return;
    }
    const now = Date.now();
    const m = computeLiveMetersFromTaps(tapTimestampsMs, now);
    setEnergy(m.energy);
    setIntensity(m.intensity);
    lastTapAtRef.current = now;
    setSparkTrail((prev) => [...prev, m.intensity].slice(-SPARK_MAX));
  }, [tapTimestampsMs]);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      if (now - lastTapAtRef.current < 85) return;
      const factor = 0.91;
      setEnergy((e) => Math.round(decayTowardBaseline(e, IDLE_METER_TARGET, factor)));
      setIntensity((i) => Math.round(decayTowardBaseline(i, IDLE_METER_TARGET, factor)));
    }, DECAY_MS);
    return () => clearInterval(id);
  }, []);

  const pulseHaptics = () => {
    if (Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* optional */
    }
  };

  const animateTap = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.92,
        friction: 4,
        tension: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const togglePlay = async () => {
    const s = soundRef.current;
    if (!s) return;
    const st = await s.getStatusAsync();
    if (!st.isLoaded) return;
    const dur = st.durationMillis ?? 0;
    const pos = st.positionMillis;
    const atEnd =
      st.didJustFinish || (dur > 0 && !st.isPlaying && (playbackEnded || pos >= dur - 280));

    if (atEnd) {
      await s.setPositionAsync(0);
      setPlaybackEnded(false);
      if (sessionStartMs === null) setSessionMeta(Date.now());
      await s.playAsync();
      return;
    }
    if (sessionStartMs === null) setSessionMeta(Date.now());
    if (st.isPlaying) await s.pauseAsync();
    else await s.playAsync();
  };

  const seekBy = async (deltaSec: number) => {
    const s = soundRef.current;
    if (!s) return;
    const st = await s.getStatusAsync();
    if (!st.isLoaded || !st.durationMillis) return;
    const nextMs = Math.max(
      0,
      Math.min(st.durationMillis, st.positionMillis + deltaSec * 1000)
    );
    await s.setPositionAsync(nextMs);
    if (nextMs < st.durationMillis - 500) setPlaybackEnded(false);
  };

  const endExperience = async () => {
    await unload();
    setPlaying(false);
    setPlaybackEnded(false);
    navigation.navigate('RefineVibe');
  };

  const canTap = playing;
  const showReplayControl =
    !playing &&
    (playbackEnded || (durationSec > 0 && positionSec >= durationSec - 0.35));

  const onTap = () => {
    if (!playing) return;
    if (sessionStartMs === null) setSessionMeta(Date.now());
    recordTap(Date.now());
    pulseHaptics();
    animateTap();
  };

  const skipAll = async () => {
    await unload();
    resetTaps();
    navigation.navigate('RefineVibe');
  };

  const finish = async () => {
    const s = soundRef.current;
    if (s) {
      const st = await s.getStatusAsync();
      if (st.isLoaded && st.isPlaying) await s.pauseAsync();
    }
    navigation.navigate('RefineVibe');
  };

  if (!selectedAudio) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <Text style={[styles.warnTitle, font('bold')]}>No audio selected</Text>
        <Text style={[styles.warnSub, font('regular')]}>
          Go back to Log event and attach demo audio or a file before reliving.
        </Text>
        <Pressable style={styles.playBtn} onPress={() => navigation.navigate('LogEventMain')}>
          <Text style={[styles.playText, font('semibold')]}>Back to log</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Text style={[styles.setLabel, font('medium')]} numberOfLines={2}>
        {selectedAudio.title}
      </Text>
      <Text style={[styles.timer, font('medium')]}>
        {formatTime(positionSec)} / {formatTime(durationSec)}
      </Text>

      {loadError ? (
        <Text style={[styles.err, font('regular')]}>{loadError}</Text>
      ) : null}

      <View style={styles.mainRow}>
        <View style={styles.sideCol}>
          <Text style={[styles.sideLabel, font('regular')]}>Energy</Text>
          <Text style={[styles.hintLab, font('regular')]}>sustained</Text>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { height: `${energy}%`, backgroundColor: colors.accent }]}
            />
          </View>
          <Text style={[styles.sideVal, { color: colors.accent }, font('semibold')]}>{energy}</Text>
        </View>

        <View style={styles.tapWrap}>
          <Animated.View
            style={[
              styles.tapOuter,
              { transform: [{ scale }], opacity: canTap ? 1 : 0.42 },
            ]}
          >
            <Pressable style={styles.tapPress} onPress={onTap} disabled={!canTap}>
              <View style={styles.tapInner}>
                <Text style={[styles.tapText, font('semibold')]}>Tap how it feels</Text>
                <Text style={[styles.tapSub, font('regular')]}>
                  {canTap
                    ? 'fast = intensity · steady = energy'
                    : 'Press Play — tapping unlocks while the set plays'}
                </Text>
              </View>
            </Pressable>
          </Animated.View>

          <View style={styles.sparkRow}>
            {sparkTrail.length === 0
              ? null
              : sparkTrail.map((v, i) => (
                  <View
                    key={`s-${i}`}
                    style={[
                      styles.spark,
                      {
                        height: 4 + (v / 100) * 22,
                        opacity: 0.35 + (i / Math.max(sparkTrail.length, 1)) * 0.5,
                      },
                    ]}
                  />
                ))}
          </View>
        </View>

        <View style={styles.sideCol}>
          <Text style={[styles.sideLabel, font('regular')]}>Intensity</Text>
          <Text style={[styles.hintLab, font('regular')]}>instant</Text>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { height: `${intensity}%`, backgroundColor: colors.cyan }]}
            />
          </View>
          <Text style={[styles.sideVal, { color: colors.cyan }, font('semibold')]}>{intensity}</Text>
        </View>
      </View>

      <Text style={[styles.hint, font('regular')]}>
        {playing ? 'Playing' : showReplayControl ? 'Set ended' : 'Paused'} · taps: {tapTimestampsMs.length}
      </Text>

      <View style={styles.transportRow}>
        <Pressable
          style={[styles.transportBtn, loadError && styles.transportDisabled]}
          onPress={() => seekBy(-SEEK_SEC)}
          disabled={!!loadError}
        >
          <MaterialIcons name="replay-10" size={28} color={colors.text} />
        </Pressable>
        <Pressable style={styles.playBtnCenter} onPress={togglePlay} disabled={!!loadError}>
          <MaterialIcons
            name={playing ? 'pause' : showReplayControl ? 'replay' : 'play-arrow'}
            size={playing ? 36 : 34}
            color={colors.text}
          />
        </Pressable>
        <Pressable
          style={[styles.transportBtn, loadError && styles.transportDisabled]}
          onPress={() => seekBy(SEEK_SEC)}
          disabled={!!loadError}
        >
          <MaterialIcons name="forward-10" size={28} color={colors.text} />
        </Pressable>
      </View>
      <Text style={[styles.transportHint, font('regular')]}>
        {showReplayControl
          ? 'Tap center to replay from the start'
          : 'Rewind / forward 10s'}
      </Text>

      <Pressable style={styles.finish} onPress={finish} disabled={!!loadError}>
        <Text style={[styles.finishText, font('bold')]}>Continue to refine</Text>
      </Pressable>

      <Pressable style={styles.endBtn} onPress={endExperience} disabled={!!loadError}>
        <Text style={[styles.endBtnText, font('semibold')]}>End set &amp; go to refine</Text>
      </Pressable>

      <Pressable onPress={skipAll}>
        <Text style={[styles.skip, font('medium')]}>Opt out: skip taps, go to refine</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  setLabel: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  timer: {
    alignSelf: 'center',
    color: colors.text,
    fontSize: 14,
    marginBottom: 12,
  },
  err: { color: colors.accent, textAlign: 'center', marginBottom: 8 },
  warnTitle: { color: colors.text, fontSize: 20, textAlign: 'center', marginTop: 40 },
  warnSub: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 12, paddingHorizontal: 12 },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  sideCol: { width: 58, alignItems: 'center' },
  hintLab: { color: colors.muted, fontSize: 9, marginBottom: 4, textTransform: 'uppercase' },
  tapWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 240 },
  sideLabel: { color: colors.muted, fontSize: 12, marginBottom: 2 },
  barTrack: {
    width: 16,
    height: 160,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 8 },
  sideVal: { marginTop: 8, fontSize: 16 },
  tapOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.accent,
    backgroundColor: 'rgba(255,46,99,0.12)',
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 12,
  },
  tapPress: { flex: 1, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  tapInner: { padding: 16, alignItems: 'center' },
  tapText: { color: colors.text, fontSize: 17, textAlign: 'center' },
  tapSub: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 15 },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 30,
    marginTop: 12,
    gap: 3,
  },
  spark: {
    width: 5,
    borderRadius: 2,
    backgroundColor: colors.cyan,
  },
  hint: { textAlign: 'center', color: colors.muted, marginTop: 16, fontSize: 13 },
  transportRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  transportBtn: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  transportDisabled: { opacity: 0.35 },
  playBtn: {
    marginTop: 20,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  playText: { color: colors.text, fontSize: 15 },
  playBtnCenter: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: colors.accent,
  },
  transportHint: { textAlign: 'center', color: colors.muted, fontSize: 11, marginTop: 6 },
  endBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,46,99,0.45)',
    alignItems: 'center',
  },
  endBtnText: { color: colors.accent, fontSize: 14 },
  finish: {
    marginTop: 18,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  finishText: { color: colors.text, fontSize: 17 },
  skip: {
    marginTop: 16,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
  },
});
