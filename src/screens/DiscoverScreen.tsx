import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MiniPulseBars } from '../components/MiniPulseBars';
import { usePulse, type LoggedEvent } from '../context/PulseContext';
import { THEMED_EVENTS } from '../lib/data';
import { buildDiscoverJitterKey } from '../lib/fakeFriends';
import { crowdMatchScore, rankFakeFriends } from '../lib/crowdMatch';
import { rankThemedEventsForUser } from '../lib/eventRec';
import { buildAggregateProfilePulse, buildAggregateTasteSummary } from '../lib/pulse';
import type { DiscoverStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverMain'>;

type DiscoverSegment = 'friends' | 'events';

/** Cross-night median pulse + aggregate taste — same basis as Profile (not one mashed waveform). */
function useAggregateProfileFromLogs(loggedEvents: LoggedEvent[]) {
  return useMemo(() => {
    const completed = loggedEvents.filter((e) => e.pulseSignature && e.pulseSignature.length > 0);
    if (completed.length === 0) {
      return {
        pulse: null as number[] | null,
        taste: buildAggregateTasteSummary([]),
        hasSavedShows: false,
      };
    }
    const pulse = buildAggregateProfilePulse(completed.map((e) => e.pulseSignature));
    const taste = buildAggregateTasteSummary(completed);
    return { pulse, taste, hasSavedShows: true };
  }, [loggedEvents]);
}

export function DiscoverScreen({ navigation }: Props) {
  const { loggedEvents } = usePulse();
  const [segment, setSegment] = useState<DiscoverSegment>('friends');

  const { pulse: profilePulse, taste: profileTaste, hasSavedShows } = useAggregateProfileFromLogs(loggedEvents);

  const discoverJitterKey = useMemo(
    () => buildDiscoverJitterKey(loggedEvents, profilePulse),
    [loggedEvents, profilePulse]
  );

  const rankedFriends = useMemo(
    () => rankFakeFriends(profilePulse, discoverJitterKey),
    [profilePulse, discoverJitterKey]
  );

  const rankedEvents = useMemo(
    () => rankThemedEventsForUser(profilePulse, profileTaste, THEMED_EVENTS),
    [profilePulse, profileTaste]
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>Discover</Text>
      <Text style={[styles.sub, font('regular')]}>
        Friend and event picks use your overall pattern across saved nights on Home (median pulse per dimension —
        not one blended curve). The Log tab flow still has its own per-set crowd step at the end.
      </Text>

      <View style={styles.segmentRow}>
        <Pressable
          style={[styles.segmentBtn, segment === 'friends' && styles.segmentBtnActive]}
          onPress={() => setSegment('friends')}
        >
          <Text style={[styles.segmentText, font('semibold'), segment === 'friends' && styles.segmentTextActive]}>
            Friend recommendations
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, segment === 'events' && styles.segmentBtnActive]}
          onPress={() => setSegment('events')}
        >
          <Text style={[styles.segmentText, font('semibold'), segment === 'events' && styles.segmentTextActive]}>
            Events
          </Text>
        </Pressable>
      </View>

      {segment === 'friends' ? (
        <>
          <Text style={[styles.section, font('semibold')]}>Crowd you might vibe with</Text>
          {!hasSavedShows ? (
            <Text style={[styles.muted, font('regular')]}>
              Finish logging a show on the Log tab and save a pulse to Home — then we rank demo friends against
              your typical pattern across all saved nights.
            </Text>
          ) : (
            <View style={styles.hero}>
              <Text style={[styles.heroLabel, font('medium')]}>Your typical pulse (all saved sets)</Text>
              {profilePulse && profilePulse.length > 0 ? (
                <MiniPulseBars vector={profilePulse} barCount={28} />
              ) : (
                <Text style={[styles.muted, font('regular')]}>No signature on file.</Text>
              )}
            </View>
          )}

          {rankedFriends.map((u) => (
            <Pressable
              key={u.id}
              style={({ pressed }) => [styles.friendCard, pressed && { opacity: 0.9 }]}
              onPress={() => navigation.navigate('FriendPulseDetail', { friendId: u.id })}
            >
              <View style={[styles.avatar, { backgroundColor: u.avatarColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, font('semibold')]}>{u.name}</Text>
                <Text style={[styles.match, font('bold')]}>
                  {crowdMatchScore(profilePulse, u, discoverJitterKey)}% pulse match
                </Text>
                <Text style={[styles.reason, font('regular')]} numberOfLines={2}>
                  {u.tagline}
                </Text>
              </View>
              <Text style={[styles.chev, font('medium')]}>›</Text>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Text style={[styles.section, font('semibold')]}>Events · taste fit</Text>
          <Text style={[styles.hint, font('regular')]}>
            Scores reflect your aggregate taste across saved nights on Home, not tonight&apos;s draft log session.
          </Text>
          {!hasSavedShows ? (
            <Text style={[styles.muted, font('regular')]}>
              Save a completed log to Home first — then we can suggest themed nights that fit your stored taste.
            </Text>
          ) : null}
          {rankedEvents.map((e) => (
            <View key={e.id} style={styles.eventCard}>
              <View style={styles.eventTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.artist, font('bold')]}>{e.artist}</Text>
                  <Text style={[styles.meta, font('regular')]}>{e.venue}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.score, font('bold')]}>{e.scoreOutOf10.toFixed(1)}</Text>
                  <Text style={[styles.meta, font('regular')]}>/ 10</Text>
                </View>
              </View>
              <Text style={[styles.eventBlurb, font('regular')]}>{e.scoreDescription}</Text>
              <View style={styles.tagRow}>
                {e.genres.map((g) => (
                  <View key={g} style={styles.tag}>
                    <Text style={[styles.tagText, font('medium')]}>{g}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.tagRow}>
                {e.vibes.map((v) => (
                  <View key={v} style={[styles.tag, styles.tagVibe]}>
                    <Text style={[styles.tagText, font('medium')]}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, marginBottom: 6 },
  sub: { color: colors.muted, fontSize: 13, marginBottom: 16, lineHeight: 19 },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#2a3148',
    alignItems: 'center',
  },
  segmentBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255,46,99,0.12)',
  },
  segmentText: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  segmentTextActive: { color: colors.text },
  section: { color: colors.text, fontSize: 17, marginTop: 4, marginBottom: 10 },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  heroLabel: { color: colors.muted, fontSize: 11, marginBottom: 8, textTransform: 'uppercase' },
  muted: { color: colors.muted, fontSize: 14, marginBottom: 12, lineHeight: 20 },
  friendCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  name: { color: colors.text, fontSize: 16 },
  match: { color: colors.mint, fontSize: 16, marginTop: 4 },
  reason: { color: colors.muted, fontSize: 12, marginTop: 4 },
  chev: { color: colors.muted, fontSize: 22, paddingLeft: 4 },
  hint: { color: colors.muted, fontSize: 13, marginBottom: 12 },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  artist: { color: colors.text, fontSize: 17 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  score: { color: colors.mint, fontSize: 22 },
  eventBlurb: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(0,245,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.35)',
  },
  tagVibe: {
    backgroundColor: 'rgba(124,255,178,0.1)',
    borderColor: 'rgba(124,255,178,0.35)',
  },
  tagText: { color: colors.text, fontSize: 11 },
});
