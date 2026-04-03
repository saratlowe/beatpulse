import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePulse } from '../context/PulseContext';
import { THEMED_EVENTS } from '../lib/data';
import { rankThemedEventsForUser } from '../lib/eventRec';
import type { LogStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<LogStackParamList, 'EventRecommendations'>;

export function EventRecommendationsScreen({ navigation }: Props) {
  const { pulseSignature, tasteSummary, persistActiveEventOutcome } = usePulse();
  const ranked = rankThemedEventsForUser(pulseSignature, tasteSummary, THEMED_EVENTS);

  const finish = () => {
    persistActiveEventOutcome();
    navigation.reset({
      index: 0,
      routes: [{ name: 'LogEventMain' }],
    });
    navigation.getParent()?.navigate('Home');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>Events matched to your taste</Text>
      <Text style={[styles.sub, font('regular')]}>
        Nights we think fit how you listen — each card has a simple 1–10 fit score and a short read on why it
        might feel right (or like a fun stretch).
      </Text>

      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, font('medium')]}>← Back to crowd</Text>
      </Pressable>

      {ranked.map((e) => (
        <View key={e.id} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.artist, font('bold')]}>{e.artist}</Text>
              <Text style={[styles.meta, font('regular')]}>{e.venue}</Text>
              <Text style={[styles.meta, font('regular')]}>{e.dateLabel}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.pct, font('bold')]}>{e.scoreOutOf10.toFixed(1)}</Text>
              <Text style={[styles.meta, font('regular')]}>/ 10</Text>
            </View>
          </View>
          <Text style={[styles.note, font('regular')]}>{e.scoreDescription}</Text>
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

      <Pressable style={styles.primary} onPress={finish}>
        <Text style={[styles.primaryText, font('bold')]}>Done — back to Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 22, marginBottom: 8 },
  sub: { color: colors.muted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
  backRow: { alignSelf: 'flex-start', marginBottom: 14 },
  backText: { color: colors.cyan, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardTop: { flexDirection: 'row', gap: 12 },
  artist: { color: colors.text, fontSize: 18 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  pct: { color: colors.mint, fontSize: 22 },
  note: { color: colors.text, fontSize: 14, marginTop: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,245,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.35)',
  },
  tagVibe: {
    backgroundColor: 'rgba(124,255,178,0.1)',
    borderColor: 'rgba(124,255,178,0.35)',
  },
  tagText: { color: colors.text, fontSize: 12 },
  primary: {
    marginTop: 20,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: { color: colors.text, fontSize: 17 },
});
