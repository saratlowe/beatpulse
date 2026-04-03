import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MiniPulseBars } from '../components/MiniPulseBars';
import { usePulse } from '../context/PulseContext';
import { THEMED_EVENTS } from '../lib/data';
import { crowdMatchScore, rankFakeFriends } from '../lib/crowdMatch';
import { rankThemedEventsForUser } from '../lib/eventRec';
import type { DiscoverStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverMain'>;

export function DiscoverScreen({ navigation }: Props) {
  const { pulseSignature, tasteSummary, loggedEvents } = usePulse();

  const effectivePulse =
    pulseSignature ??
    loggedEvents.find((e) => e.pulseSignature && e.pulseSignature.length)?.pulseSignature ??
    null;

  const effectiveTaste =
    tasteSummary ??
    loggedEvents.find((e) => e.tasteSummary)?.tasteSummary ??
    null;

  const rankedFriends = useMemo(() => rankFakeFriends(effectivePulse), [effectivePulse]);

  const eventsPreview = useMemo(
    () => rankThemedEventsForUser(effectivePulse, effectiveTaste, THEMED_EVENTS).slice(0, 4),
    [effectivePulse, effectiveTaste]
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>Discover</Text>
      <Text style={[styles.sub, font('regular')]}>
        Demo profiles with their own pulse shapes. Match % is how close their energy pattern is to yours — tap
        someone to compare side by side.
      </Text>

      <Text style={[styles.section, font('semibold')]}>Friends</Text>

      {!effectivePulse ? (
        <Text style={[styles.muted, font('regular')]}>
          No pulse in memory — complete a relive flow with taps to see match % (you can still open profiles at
          0%).
        </Text>
      ) : (
        <View style={styles.hero}>
          <Text style={[styles.heroLabel, font('medium')]}>Your pulse</Text>
          <MiniPulseBars vector={effectivePulse} barCount={28} />
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
            <Text style={[styles.match, font('bold')]}>{crowdMatchScore(effectivePulse, u)}% similar energy</Text>
            <Text style={[styles.reason, font('regular')]} numberOfLines={2}>
              {u.tagline}
            </Text>
          </View>
          <Text style={[styles.chev, font('medium')]}>›</Text>
        </Pressable>
      ))}

      <Text style={[styles.section, font('semibold')]}>Events · taste fit</Text>
      <Text style={[styles.hint, font('regular')]}>
        Event scores are 1–10 taste fit — each line explains the vibe in plain language.
      </Text>

      {eventsPreview.map((e) => (
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, marginBottom: 6 },
  sub: { color: colors.muted, fontSize: 14, marginBottom: 18, lineHeight: 20 },
  section: { color: colors.text, fontSize: 17, marginTop: 8, marginBottom: 10 },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  heroLabel: { color: colors.muted, fontSize: 11, marginBottom: 8, textTransform: 'uppercase' },
  muted: { color: colors.muted, fontSize: 14, marginBottom: 12 },
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
