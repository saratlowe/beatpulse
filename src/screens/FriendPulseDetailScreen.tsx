import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MiniPulseBars } from '../components/MiniPulseBars';
import { PulseChart } from '../components/PulseChart';
import { usePulse } from '../context/PulseContext';
import { explainFriendMatch, getFakeFriend } from '../lib/fakeFriends';
import type { DiscoverStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'FriendPulseDetail'>;

export function FriendPulseDetailScreen({ route, navigation }: Props) {
  const { friendId } = route.params;
  const friend = getFakeFriend(friendId);
  const { pulseSignature, pulseWaveform } = usePulse();
  const { width } = useWindowDimensions();
  const chartW = Math.min(width - 40, 360);

  if (!friend) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, font('medium')]}>← Back</Text>
        </Pressable>
        <Text style={[styles.err, font('regular')]}>Friend not found.</Text>
      </View>
    );
  }

  const explain = explainFriendMatch(pulseSignature, friend);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, font('medium')]}>← Back to Discover</Text>
      </Pressable>

      <Text style={[styles.title, font('bold')]}>{friend.name}</Text>
      <Text style={[styles.tag, font('regular')]}>{friend.tagline}</Text>

      <Text style={[styles.section, font('semibold')]}>Your tap waveform</Text>
      <Text style={[styles.caption, font('regular')]}>
        Where you tapped along the track — flat stretches mean no taps there.
      </Text>
      <View style={styles.card}>
        {pulseWaveform && pulseWaveform.length > 1 ? (
          <PulseChart waveform={pulseWaveform} width={chartW} height={120} />
        ) : (
          <Text style={[styles.muted, font('regular')]}>No waveform in memory — finish a tap session first.</Text>
        )}
      </View>

      <Text style={[styles.section, font('semibold')]}>{friend.name.split(' ')[0]}&apos;s waveform</Text>
      <Text style={[styles.caption, font('regular')]}>Demo shape for this profile.</Text>
      <View style={styles.card}>
        <PulseChart waveform={friend.waveform} width={chartW} height={120} />
      </View>

      <Text style={[styles.section, font('semibold')]}>Side-by-side energy bars</Text>
      <View style={styles.rowCompare}>
        <View style={styles.half}>
          <Text style={[styles.miniLab, font('medium')]}>You</Text>
          {pulseSignature?.length ? (
            <MiniPulseBars vector={pulseSignature} barCount={28} />
          ) : (
            <Text style={[styles.muted, font('regular')]}>—</Text>
          )}
        </View>
        <View style={styles.half}>
          <Text style={[styles.miniLab, font('medium')]}>Them</Text>
          <MiniPulseBars vector={friend.pulse} barCount={28} />
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
