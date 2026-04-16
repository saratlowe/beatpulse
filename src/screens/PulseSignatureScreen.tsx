import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { PulseChart } from '../components/PulseChart';
import { usePulse } from '../context/PulseContext';
import { recapInsightLines, recapTasteLines } from '../lib/pulse';
import type { LogStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<LogStackParamList, 'PulseSignature'>;

function waveformHasEngagement(w: number[] | null | undefined, threshold = 0.02): boolean {
  if (!w || w.length < 2) return false;
  return w.some((v) => v > threshold);
}

export function PulseSignatureScreen({ navigation }: Props) {
  const { pulseSignature, pulseWaveform, audioDurationSec, persistActiveEventOutcome, tasteSummary } = usePulse();
  const { width } = useWindowDimensions();
  const sig = pulseSignature;

  const [recapSeed, setRecapSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff));

  useFocusEffect(
    useCallback(() => {
      setRecapSeed((prev) => (prev + Math.floor(Math.random() * 0xfffffff) + 1) >>> 0);
    }, [])
  );

  const hasWaveform = waveformHasEngagement(pulseWaveform);
  const tasteLines =
    tasteSummary && tasteSummary.lines.length > 0
      ? tasteSummary.lines
      : recapTasteLines(sig, recapSeed);
  const insights = recapInsightLines(sig, recapSeed);
  const total = audioDurationSec;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const totalLabel = `${m}:${s.toString().padStart(2, '0')}`;
  const half = total / 2;

  const goCrowd = () => {
    persistActiveEventOutcome();
    navigation.navigate('FriendMatch');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>Your pulse signature</Text>

      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, font('medium')]}>← Back to refine</Text>
      </Pressable>

      {hasWaveform ? (
        <View style={styles.card}>
          <Text style={[styles.chartCaption, font('regular')]}>
            Your taps over the length of the set — quiet stretches mean you weren’t tapping there yet, or you’d
            already stopped.
          </Text>
          <PulseChart
            waveform={pulseWaveform ?? undefined}
            width={Math.min(width - 56, 360)}
            height={140}
            horizontalInset={16}
            timeLabels={[
              '0:00',
              `${Math.floor(half / 60)}:${Math.floor(half % 60).toString().padStart(2, '0')}`,
              totalLabel,
            ]}
          />
        </View>
      ) : sig && sig.length > 0 ? (
        <View style={styles.emptyCard}>
          <Text style={[styles.emptyTitle, font('semibold')]}>No tap curve for this session</Text>
          <Text style={[styles.emptySub, font('regular')]}>
            We only draw the time graph when there are taps along the track. Your summary below still reflects
            refine answers where we could infer a pulse.
          </Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={[styles.emptyTitle, font('semibold')]}>No pulse waveform</Text>
          <Text style={[styles.emptySub, font('regular')]}>
            You opted out before tapping or never pressed play. We will not invent a graph — continue to see how
            matches and events adapt without a tap fingerprint.
          </Text>
        </View>
      )}

      <Text style={[styles.insHead, font('semibold')]}>How you listen</Text>
      {tasteLines.map((line, i) => (
        <View key={`${recapSeed}-${i}-${line.slice(0, 16)}`} style={styles.pill}>
          <View style={styles.dot} />
          <Text style={[styles.pillText, font('regular')]}>{line}</Text>
        </View>
      ))}

      {sig ? (
        <>
          <Text style={[styles.insHead, font('semibold')]}>Tap pattern notes</Text>
          {insights.map((line) => (
            <View key={line} style={styles.pill}>
              <View style={[styles.dot, { backgroundColor: colors.cyan }]} />
              <Text style={[styles.pillText, font('regular')]}>{line}</Text>
            </View>
          ))}
        </>
      ) : null}

      <Pressable style={styles.primary} onPress={goCrowd}>
        <Text style={[styles.primaryText, font('bold')]}>Find crowd matches</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, marginBottom: 8, textAlign: 'center' },
  backRow: { alignSelf: 'center', marginBottom: 14 },
  backText: { color: colors.cyan, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a3148',
  },
  emptyTitle: { color: colors.text, fontSize: 16, marginBottom: 8 },
  emptySub: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  chartCaption: { color: colors.muted, fontSize: 12, marginBottom: 12, lineHeight: 17 },
  insHead: { color: colors.text, fontSize: 17, marginBottom: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a3148',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.mint,
    shadowColor: colors.mint,
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  pillText: { color: colors.text, fontSize: 14, flex: 1 },
  primary: {
    marginTop: 20,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: { color: colors.text, fontSize: 17 },
});
