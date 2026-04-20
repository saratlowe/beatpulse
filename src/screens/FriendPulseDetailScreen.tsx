import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MiniPulseBars } from '../components/MiniPulseBars';
import { PulseChart } from '../components/PulseChart';
import { usePulse } from '../context/PulseContext';
import { explainFriendMatch, getFakeFriend } from '../lib/fakeFriends';
import {
  blendPulseVectors,
  blendWaveforms,
  buildAggregateProfilePulse,
  crowdDisplayBlendFromMatchPct,
} from '../lib/pulse';
import type { DiscoverStackParamList, LogStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props =
  | NativeStackScreenProps<LogStackParamList, 'FriendPulseDetail'>
  | NativeStackScreenProps<DiscoverStackParamList, 'FriendPulseDetail'>;

export function FriendPulseDetailScreen({ route, navigation }: Props) {
  const { friendId, flow } = route.params;
  const fromLogFlow = flow === 'log';

  const goBack = useCallback(() => {
    if (fromLogFlow) {
      navigation.goBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    (navigation as NativeStackNavigationProp<DiscoverStackParamList>).navigate('DiscoverMain');
  }, [fromLogFlow, navigation]);

  const backLabel = fromLogFlow ? '← Back to crowd match' : '← Back to Discover';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={fromLogFlow ? 'Back to crowd match' : 'Back to Discover'}
          hitSlop={12}
          style={{ marginLeft: 4, padding: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, goBack, fromLogFlow]);

  const friend = getFakeFriend(friendId);
  const { pulseSignature, pulseWaveform, loggedEvents } = usePulse();

  const completedSaved = useMemo(
    () => loggedEvents.filter((e) => e.pulseSignature && e.pulseSignature.length > 0),
    [loggedEvents]
  );

  const latestSaved = useMemo(() => {
    if (!completedSaved.length) return null;
    return [...completedSaved].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }, [completedSaved]);

  const aggregateSig = useMemo(
    () => buildAggregateProfilePulse(completedSaved.map((e) => e.pulseSignature)),
    [completedSaved]
  );

  /** Discover: typical pulse across all saved nights. Log flow: this session only. */
  const viewerSig = fromLogFlow ? pulseSignature : aggregateSig ?? latestSaved?.pulseSignature ?? pulseSignature;
  const viewerWave = fromLogFlow ? pulseWaveform : latestSaved?.pulseWaveform ?? pulseWaveform;

  const { width } = useWindowDimensions();
  const chartW = Math.min(width - 40, 360);

  if (!friend) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <Pressable style={styles.backRow} onPress={goBack}>
          <Text style={[styles.backText, font('medium')]}>← Back</Text>
        </Pressable>
        <Text style={[styles.err, font('regular')]}>Friend not found.</Text>
      </View>
    );
  }

  const explain = explainFriendMatch(viewerSig, friend);
  const matchPct = friend.demoPulseMatchPercent;
  const blend = crowdDisplayBlendFromMatchPct(viewerSig?.length ? matchPct : 0);
  const friendWaveDisplay =
    viewerWave && viewerWave.length > 1
      ? blendWaveforms(viewerWave, friend.waveform, blend)
      : friend.waveform;
  const friendPulseDisplay = blendPulseVectors(viewerSig, friend.pulse, blend * 0.94);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Pressable style={styles.backRow} onPress={goBack}>
        <Text style={[styles.backText, font('medium')]}>{backLabel}</Text>
      </Pressable>

      <Text style={[styles.title, font('bold')]}>{friend.name}</Text>
      <Text style={[styles.tag, font('regular')]}>{friend.tagline}</Text>

      <Text style={[styles.section, font('semibold')]}>Your tap waveform</Text>
      <Text style={[styles.caption, font('regular')]}>
        {fromLogFlow
          ? 'Where you tapped along the track — flat stretches mean no taps there.'
          : 'Waveform from your most recent saved show; energy bars use your typical pulse across all saved nights.'}
      </Text>
      <View style={styles.card}>
        {viewerWave && viewerWave.length > 1 ? (
          <PulseChart waveform={viewerWave} width={chartW} height={120} horizontalInset={14} />
        ) : (
          <Text style={[styles.muted, font('regular')]}>
            {fromLogFlow
              ? 'No waveform in memory — finish a tap session first.'
              : 'No saved waveform yet — finish a log flow and save to Home.'}
          </Text>
        )}
      </View>

      <Text style={[styles.section, font('semibold')]}>{friend.name.split(' ')[0]}&apos;s waveform</Text>
      <Text style={[styles.caption, font('regular')]}>
        Demo profile — the match % on the crowd list is fixed per person for this build; this curve blends toward yours
        when that % is high so the side-by-side reads clearly, and stays distinct when it&apos;s low.
      </Text>
      <View style={styles.card}>
        <PulseChart waveform={friendWaveDisplay} width={chartW} height={120} horizontalInset={14} />
      </View>

      <Text style={[styles.section, font('semibold')]}>Side-by-side energy bars</Text>
      <View style={styles.rowCompare}>
        <View style={styles.half}>
          <Text style={[styles.miniLab, font('medium')]}>You</Text>
          {viewerSig?.length ? (
            <MiniPulseBars vector={viewerSig} barCount={28} />
          ) : (
            <Text style={[styles.muted, font('regular')]}>—</Text>
          )}
        </View>
        <View style={styles.half}>
          <Text style={[styles.miniLab, font('medium')]}>Them</Text>
          <MiniPulseBars vector={friendPulseDisplay} barCount={28} />
        </View>
      </View>

      <View style={styles.insight}>
        <Text style={[styles.insightText, font('regular')]}>{explain}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  backRow: { alignSelf: 'flex-start', marginBottom: 12 },
  backText: { color: colors.cyan, fontSize: 15 },
  title: { color: colors.text, fontSize: 24, marginBottom: 6 },
  tag: { color: colors.muted, fontSize: 14, marginBottom: 18, lineHeight: 20 },
  section: { color: colors.text, fontSize: 16, marginTop: 12, marginBottom: 6 },
  caption: { color: colors.muted, fontSize: 12, marginBottom: 10, lineHeight: 17 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  rowCompare: { flexDirection: 'row', gap: 12, marginTop: 4 },
  half: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 12 },
  miniLab: { color: colors.muted, fontSize: 11, marginBottom: 8, textTransform: 'uppercase' },
  insight: {
    marginTop: 20,
    padding: 14,
    backgroundColor: 'rgba(0,245,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.25)',
  },
  insightText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  muted: { color: colors.muted, fontSize: 13 },
  err: { color: colors.accent, padding: 24 },
});
