import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MiniPulseBars } from '../components/MiniPulseBars';
import { usePulse } from '../context/PulseContext';
import { buildAggregateProfilePulse, buildAggregateTasteSummary, buildTasteSummary } from '../lib/pulse';
import type { ProfileStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

export function ProfileScreen({}: Props) {
  const { pulseSignature, tasteSummary, loggedEvents, clearSession, deleteLoggedEvent, refineAnswers } =
    usePulse();

  const completed = loggedEvents.filter((e) => e.pulseSignature && e.pulseSignature.length > 0);
  const aggregatePulse = buildAggregateProfilePulse(completed.map((e) => e.pulseSignature));
  const aggregateTaste = buildAggregateTasteSummary(completed);
  const sortedEvents = useMemo(
    () => [...loggedEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [loggedEvents]
  );

  const topTags =
    aggregateTaste.tags.length > 0
      ? aggregateTaste.tags.slice(0, 10)
      : (() => {
          const aggregateTags = new Map<string, number>();
          for (const e of completed) {
            const tags =
              e.tasteSummary?.tags ??
              buildTasteSummary(e.pulseSignature, e.refineTagsSnapshot ?? undefined).tags;
            for (const t of tags) {
              aggregateTags.set(t, (aggregateTags.get(t) ?? 0) + 1);
            }
          }
          return Array.from(aggregateTags.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([t]) => t);
        })();

  const liveSummary = tasteSummary ?? buildTasteSummary(pulseSignature, refineAnswers.selectedTags);

  const confirmDelete = (eventId: string, artist: string) => {
    const run = () => deleteLoggedEvent(eventId);
    if (Platform.OS === 'web') {
      const c = (globalThis as { confirm?: (m: string) => boolean }).confirm;
      if (c?.(`Delete "${artist}" from your history?`)) run();
      return;
    }
    Alert.alert('Delete this night?', `Remove "${artist}" from saved events?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>Profile</Text>
      <Text style={[styles.sub, font('regular')]}>
        Overall pattern across saved nights, plus every event you have logged — newest first.
      </Text>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, font('semibold')]}>Overall pattern summary</Text>
        {aggregateTaste.lines.map((line, i) => (
          <Text key={`agg-${i}`} style={[styles.line, font('regular')]}>
            · {line}
          </Text>
        ))}
      </View>

      {aggregatePulse && aggregatePulse.length > 0 ? (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, font('semibold')]}>Typical pulse (median across nights)</Text>
          <View style={styles.chartClip}>
            <MiniPulseBars vector={aggregatePulse} barCount={32} />
          </View>
          <Text style={[styles.mono, font('regular')]}>
            {aggregatePulse.map((n) => n.toFixed(2)).join(' · ')}
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, font('semibold')]}>Typical pulse (median across nights)</Text>
          <Text style={[styles.muted, font('regular')]}>Complete at least one saved set with taps to see this.</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={[styles.cardTitle, font('semibold')]}>Current log session (in memory)</Text>
        {liveSummary.lines.slice(0, 5).map((line, i) => (
          <Text key={`live-${i}`} style={[styles.line, font('regular')]}>
            · {line}
          </Text>
        ))}
      </View>

      {pulseSignature && pulseSignature.length > 0 ? (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, font('semibold')]}>Live pulse snapshot</Text>
          <View style={styles.chartClip}>
            <MiniPulseBars vector={pulseSignature} barCount={32} />
          </View>
          <Text style={[styles.mono, font('regular')]}>
            {pulseSignature.map((n) => n.toFixed(2)).join(' · ')}
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={[styles.cardTitle, font('semibold')]}>Recurring taste themes</Text>
        {topTags.length === 0 ? (
          <Text style={[styles.muted, font('regular')]}>
            Complete a relive flow with taps to populate tags.
          </Text>
        ) : (
          <View style={styles.tagRow}>
            {topTags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={[styles.tagText, font('medium')]}>{t}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={[styles.small, font('regular')]}>{completed.length} nights with saved pulse</Text>
      </View>

      <Text style={[styles.sectionHeading, font('bold')]}>Your nights</Text>
      <Text style={[styles.sectionSub, font('regular')]}>
        Past events stay here until you delete them. Open Home to relive a set again.
      </Text>

      {sortedEvents.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialIcons name="event-note" size={36} color={colors.muted} />
          <Text style={[styles.muted, font('regular'), { marginTop: 12, textAlign: 'center' }]}>
            No logged events yet. Use the Log event tab to add one.
          </Text>
        </View>
      ) : (
        sortedEvents.map((ev) => {
          const taste = ev.tasteSummary ?? buildTasteSummary(ev.pulseSignature, ev.refineTagsSnapshot ?? undefined);
          const preview = taste.lines[0] ?? 'No summary yet.';
          return (
            <View key={ev.id} style={styles.eventCard}>
              <View style={styles.eventTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.evArtist, font('bold')]}>{ev.artist}</Text>
                  <Text style={[styles.evMeta, font('regular')]}>{ev.venue}</Text>
                  <Text style={[styles.evMeta, font('regular')]}>{ev.dateLabel}</Text>
                </View>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => confirmDelete(ev.id, ev.artist)}
                  accessibilityLabel="Delete event"
                >
                  <MaterialIcons name="delete-outline" size={22} color={colors.accent} />
                </Pressable>
              </View>
              <Text style={[styles.evPreview, font('regular')]} numberOfLines={2}>
                {preview}
              </Text>
              {ev.refineTagsSnapshot && ev.refineTagsSnapshot.length > 0 ? (
                <View style={styles.tagRow}>
                  {ev.refineTagsSnapshot.slice(0, 8).map((t) => (
                    <View key={t} style={styles.smallChip}>
                      <Text style={[styles.smallChipText, font('medium')]}>{t}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {ev.pulseWaveform && ev.pulseWaveform.length > 1 ? (
                <View style={[styles.chartClip, { marginTop: 12 }]}>
                  <MiniPulseBars samples={ev.pulseWaveform} barCount={28} />
                </View>
              ) : ev.pulseSignature && ev.pulseSignature.length > 0 ? (
                <View style={[styles.chartClip, { marginTop: 12 }]}>
                  <MiniPulseBars vector={ev.pulseSignature} barCount={24} />
                </View>
              ) : (
                <Text style={[styles.evMuted, font('regular')]}>No pulse saved for this night.</Text>
              )}
            </View>
          );
        })
      )}

      <Pressable style={styles.danger} onPress={clearSession}>
        <Text style={[styles.dangerText, font('medium')]}>Clear in-memory session</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 26, marginBottom: 8 },
  sub: { color: colors.muted, fontSize: 14, marginBottom: 22, lineHeight: 21 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#232a3d',
    overflow: 'hidden',
  },
  cardTitle: { color: colors.text, fontSize: 16, marginBottom: 10 },
  line: { color: colors.text, fontSize: 14, marginTop: 6, lineHeight: 20 },
  mono: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 12 },
  muted: { color: colors.muted, fontSize: 14 },
  chartClip: { overflow: 'hidden', borderRadius: 12, width: '100%' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,46,99,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,46,99,0.4)',
  },
  tagText: { color: colors.text, fontSize: 12 },
  small: { color: colors.muted, fontSize: 12, marginTop: 12 },
  sectionHeading: { color: colors.text, fontSize: 20, marginTop: 8, marginBottom: 6 },
  sectionSub: { color: colors.muted, fontSize: 13, marginBottom: 14, lineHeight: 19 },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#232a3d',
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#232a3d',
    overflow: 'hidden',
  },
  eventTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  evArtist: { color: colors.text, fontSize: 17 },
  evMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  evPreview: { color: colors.text, fontSize: 14, marginTop: 10, lineHeight: 20 },
  evMuted: { color: colors.muted, fontSize: 13, marginTop: 10 },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,46,99,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,46,99,0.25)',
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(0,245,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.28)',
  },
  smallChipText: { color: colors.text, fontSize: 11 },
  danger: { alignSelf: 'flex-start', marginTop: 8 },
  dangerText: { color: colors.accent, fontSize: 14 },
});
