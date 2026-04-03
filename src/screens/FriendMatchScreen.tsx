import { CommonActions, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MiniPulseBars } from '../components/MiniPulseBars';
import { usePulse } from '../context/PulseContext';
import { crowdMatchScore, rankFakeFriends } from '../lib/crowdMatch';
import type { LogStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<LogStackParamList, 'FriendMatch'>;

export function FriendMatchScreen({ navigation }: Props) {
  const { pulseSignature } = usePulse();
  const rootNav = useNavigation();
  const crowd = rankFakeFriends(pulseSignature);

  const openFriendDetail = (friendId: string) => {
    rootNav.dispatch(
      CommonActions.navigate({
        name: 'Discover',
        params: {
          screen: 'FriendPulseDetail',
          params: { friendId },
        },
      })
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>Crowd resonance</Text>
      <Text style={[styles.sub, font('regular')]}>
        Demo crowd with their own pulse shapes. Match % is how similar their energy is to yours — open Discover
        anytime to compare waveforms in detail.
      </Text>

      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, font('medium')]}>← Back to pulse</Text>
      </Pressable>

      {!pulseSignature ? (
        <View style={styles.warn}>
          <Text style={[styles.warnText, font('regular')]}>
            No pulse yet — complete a session with at least one tap to unlock non-zero match scores.
          </Text>
        </View>
      ) : (
        <View style={styles.hero}>
          <Text style={[styles.heroLabel, font('medium')]}>Your pulse</Text>
          <MiniPulseBars vector={pulseSignature} barCount={32} />
        </View>
      )}

      {crowd.map((u) => {
        const pct = crowdMatchScore(pulseSignature, u);
        return (
          <Pressable
            key={u.id}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
            onPress={() => openFriendDetail(u.id)}
          >
            <View style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: u.avatarColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, font('semibold')]}>{u.name}</Text>
                <Text style={[styles.pct, font('bold')]}>{pct}% similar energy</Text>
                <Text style={[styles.reason, font('regular')]}>{u.tagline}</Text>
              </View>
              <Text style={[styles.chev, font('medium')]}>›</Text>
            </View>
            <View style={{ marginTop: 12 }}>
              <MiniPulseBars samples={u.waveform} barCount={28} />
            </View>
          </Pressable>
        );
      })}

      <Pressable style={styles.primary} onPress={() => navigation.navigate('EventRecommendations')}>
        <Text style={[styles.primaryText, font('bold')]}>Next: event recommendations</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, marginBottom: 8 },
  sub: { color: colors.muted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
  backRow: { alignSelf: 'flex-start', marginBottom: 10 },
  backText: { color: colors.cyan, fontSize: 14 },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  heroLabel: { color: colors.muted, fontSize: 12, marginBottom: 8, textTransform: 'uppercase' },
  warn: {
    backgroundColor: 'rgba(255,46,99,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,46,99,0.35)',
  },
  warnText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  name: { color: colors.text, fontSize: 17 },
  pct: { color: colors.mint, fontSize: 18, marginTop: 4 },
  reason: { color: colors.muted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  chev: { color: colors.muted, fontSize: 22 },
  primary: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: { color: colors.text, fontSize: 17 },
});
