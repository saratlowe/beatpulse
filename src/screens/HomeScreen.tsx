import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import {
  type NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MiniPulseBars } from '../components/MiniPulseBars';
import { usePulse } from '../context/PulseContext';
import type { HomeStackParamList, RootTabParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
  BottomTabNavigationProp<RootTabParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { loggedEvents, beginReliveSession } = usePulse();
  const tabNav = navigation as unknown as Nav;

  const goRelive = (eventId: string) => {
    beginReliveSession(eventId);
    tabNav.navigate('LogEvent', { screen: 'TapSession', params: { mode: 'relive' } });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>Your events</Text>
      <Text style={[styles.sub, font('regular')]}>
        Every show you log lives here. Open one to relive the set — same audio search you attached — and run
        through tapping, refine, pulse, matches, and event picks.
      </Text>

      {loggedEvents.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="event-note" size={40} color={colors.muted} />
          <Text style={[styles.emptyText, font('semibold')]}>No events yet</Text>
          <Text style={[styles.emptySub, font('regular')]}>
            Use the Log event tab to add an artist, venue, date, and link the set audio. That starts the flow.
          </Text>
          <Pressable style={styles.secondary} onPress={() => tabNav.navigate('LogEvent')}>
            <Text style={[styles.secondaryText, font('semibold')]}>Go to Log event</Text>
          </Pressable>
        </View>
      ) : (
        loggedEvents.map((ev) => (
          <View key={ev.id} style={styles.card}>
            <Text style={[styles.artist, font('bold')]}>{ev.artist}</Text>
            <Text style={[styles.meta, font('regular')]}>{ev.venue}</Text>
            <Text style={[styles.meta, font('regular')]}>{ev.dateLabel}</Text>
            <Text style={[styles.audio, font('regular')]} numberOfLines={1}>
              {ev.audioTitle}
            </Text>
            {ev.pulseWaveform && ev.pulseWaveform.length > 1 ? (
              <View style={{ marginTop: 12 }}>
                <MiniPulseBars samples={ev.pulseWaveform} barCount={36} />
              </View>
            ) : ev.pulseSignature && ev.pulseSignature.length > 0 ? (
              <View style={{ marginTop: 12 }}>
                <MiniPulseBars vector={ev.pulseSignature} />
              </View>
            ) : (
              <Text style={[styles.noPulse, font('regular')]}>No pulse saved for this night yet</Text>
            )}
            <Pressable style={styles.cardBtn} onPress={() => goRelive(ev.id)}>
              <MaterialIcons name="replay" size={20} color={colors.text} />
              <Text style={[styles.cardBtnText, font('semibold')]}>Relive set</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 28, marginBottom: 6 },
  sub: { color: colors.muted, fontSize: 14, marginBottom: 22, lineHeight: 20 },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
  },
  emptyText: { color: colors.text, fontSize: 17, marginTop: 12 },
  emptySub: { color: colors.muted, fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  secondary: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.cyan,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  secondaryText: { color: colors.cyan, fontSize: 15 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  artist: { color: colors.text, fontSize: 18 },
  meta: { color: colors.muted, fontSize: 14, marginTop: 2 },
  audio: { color: colors.cyan, fontSize: 13, marginTop: 10 },
  noPulse: { color: colors.muted, fontSize: 13, marginTop: 12 },
  cardBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cardBtnText: { color: colors.text, fontSize: 15 },
});
