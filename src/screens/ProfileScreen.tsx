import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MiniPulseBars } from '../components/MiniPulseBars';
import { usePulse } from '../context/PulseContext';
import { buildTasteSummary } from '../lib/pulse';
import type { ProfileStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

export function ProfileScreen({}: Props) {
  const { pulseSignature, tasteSummary, loggedEvents, clearSession } = usePulse();

  const completed = loggedEvents.filter((e) => e.pulseSignature && e.pulseSignature.length > 0);
  const aggregateTags = new Map<string, number>();
  for (const e of completed) {
    const tags = e.tasteSummary?.tags ?? buildTasteSummary(e.pulseSignature).tags;
    for (const t of tags) {
      aggregateTags.set(t, (aggregateTags.get(t) ?? 0) + 1);
    }
  }
  const topTags = Array.from(aggregateTags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t);

  const liveSummary = tasteSummary ?? buildTasteSummary(pulseSignature);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>Profile</Text>
      <Text style={[styles.sub, font('regular')]}>
        A rolling read on how you listen, pulled from nights you have finished with a pulse.
      </Text>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, font('semibold')]}>Latest session summary</Text>
        {liveSummary.lines.map((line, i) => (
          <Text key={`l-${i}`} style={[styles.line, font('regular')]}>
            · {line}
          </Text>
        ))}
      </View>

      {pulseSignature && pulseSignature.length > 0 ? (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, font('semibold')]}>Live pulse snapshot</Text>
          <MiniPulseBars vector={pulseSignature} barCount={36} />
          <Text style={[styles.mono, font('regular')]}>
            {pulseSignature.map((n) => n.toFixed(2)).join(' · ')}
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, font('semibold')]}>Live pulse snapshot</Text>
          <Text style={[styles.muted, font('regular')]}>No active pulse in memory.</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={[styles.cardTitle, font('semibold')]}>Taste tags across logged nights</Text>
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

      <Pressable style={styles.danger} onPress={clearSession}>
        <Text style={[styles.dangerText, font('medium')]}>Clear in-memory session</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 26, marginBottom: 6 },
  sub: { color: colors.muted, fontSize: 14, marginBottom: 18, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { color: colors.text, fontSize: 16, marginBottom: 10 },
  line: { color: colors.text, fontSize: 14, marginTop: 6, lineHeight: 20 },
  mono: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 12 },
  muted: { color: colors.muted, fontSize: 14 },
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
  danger: { alignSelf: 'flex-start' },
  dangerText: { color: colors.accent, fontSize: 14 },
});
