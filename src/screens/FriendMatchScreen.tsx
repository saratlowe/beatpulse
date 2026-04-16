import { MaterialIcons } from '@expo/vector-icons';
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
  const { pulseSignature, activeEventId, loggedEvents } = usePulse();
  const activeEvent = activeEventId ? loggedEvents.find((e) => e.id === activeEventId) : null;
  const noSharedCrowd = activeEvent?.importAudio === true;
  const crowd = noSharedCrowd ? [] : rankFakeFriends(pulseSignature);

  const openFriendDetail = (friendId: string) => {
    navigation.navigate('FriendPulseDetail', { friendId, flow: 'log' });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>Crowd resonance</Text>
      <Text style={[styles.sub, font('regular')]}>
        {noSharedCrowd
          ? 'Crowd match uses a demo catalog tied to well-known tracks. Imported MP3s and personal files are not in that shared pool.'
          : 'Demo crowd with their own pulse shapes. Match % is how similar their energy is to yours — tap someone for a side-by-side compare, then use back to return here and continue to event recommendations.'}
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
          <Text style={[styles.heroLabel, font('medium')]}>Your pulse (this set)</Text>
          <MiniPulseBars vector={pulseSignature} barCount={32} />
        </View>
      )}

      {noSharedCrowd ? (
        <View style={styles.noCrowd}>
          <MaterialIcons name="people-outline" size={40} color={colors.muted} />
          <Text style={[styles.noCrowdTitle, font('semibold')]}>No friend match for this set</Text>
          <Text style={[styles.noCrowdBody, font('regular')]}>
            No one else has listened to this exact imported track in our demo network — there is no crowd curve to
            compare. Try an EDM demo pick from Log event if you want sample crowd matches.
          </Text>
        </View>
      ) : (
        crowd.map((u) => {
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
        })
      )}

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
  noCrowd: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3148',
  },
  noCrowdTitle: { color: colors.text, fontSize: 17, marginTop: 12, textAlign: 'center' },
  noCrowdBody: { color: colors.muted, fontSize: 14, marginTop: 10, textAlign: 'center', lineHeight: 21 },
});
