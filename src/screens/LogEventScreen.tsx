import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LocalMp3Picker } from '../components/LocalMp3Picker';
import { usePulse } from '../context/PulseContext';
import { searchEdmDemoTracks, type AudioSet } from '../lib/data';
import type { LogStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<LogStackParamList, 'LogEventMain'>;

export function LogEventScreen({ navigation }: Props) {
  const { addLoggedEvent, setSelectedAudio } = usePulse();
  const [artist, setArtist] = useState('');
  const [venue, setVenue] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [demoQuery, setDemoQuery] = useState('');
  const [picked, setPicked] = useState<AudioSet | null>(null);
  const blobRef = useRef<string | null>(null);

  const demoHits = useMemo(() => searchEdmDemoTracks(demoQuery), [demoQuery]);

  useEffect(() => {
    return () => {
      if (blobRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(blobRef.current);
      }
    };
  }, []);

  const pickAudio = (a: AudioSet) => {
    if (blobRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(blobRef.current);
    }
    if (a.uri.startsWith('blob:')) {
      blobRef.current = a.uri;
    } else {
      blobRef.current = null;
    }
    setPicked(a);
    setSelectedAudio(a);
  };

  const canSubmit =
    artist.trim().length > 0 &&
    venue.trim().length > 0 &&
    dateLabel.trim().length > 0 &&
    picked !== null;

  const onSaveAndRelive = () => {
    if (!picked) return;
    addLoggedEvent({
      artist: artist.trim(),
      venue: venue.trim(),
      dateLabel: dateLabel.trim(),
      audio: picked,
    });
    navigation.navigate('TapSession', { mode: undefined });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>Log your night</Text>
      <Text style={[styles.sub, font('regular')]}>
        Add the artist, where you were, and when. Pick audio from the EDM demo search or your own MP3 / audio
        file.
      </Text>

      <Text style={[styles.label, font('semibold')]}>Artist</Text>
      <TextInput
        value={artist}
        onChangeText={setArtist}
        placeholder="Who played?"
        placeholderTextColor={colors.muted}
        style={[styles.input, font('regular')]}
      />

      <Text style={[styles.label, font('semibold')]}>Location</Text>
      <TextInput
        value={venue}
        onChangeText={setVenue}
        placeholder="Venue, city, festival stage…"
        placeholderTextColor={colors.muted}
        style={[styles.input, font('regular')]}
      />

      <Text style={[styles.label, font('semibold')]}>Date</Text>
      <TextInput
        value={dateLabel}
        onChangeText={setDateLabel}
        placeholder="e.g. Apr 2, 2026"
        placeholderTextColor={colors.muted}
        style={[styles.input, font('regular')]}
      />

      <Text style={[styles.section, font('semibold')]}>Set audio</Text>
      <Text style={[styles.hint, font('regular')]}>
        Demo search includes bundled tracks (real MP3s in the app) and other rows that stream royalty-free
        SoundHelix stand-ins for classic hit names. Your own uploads play as-is. On web, blob URLs reset after refresh.
      </Text>

      <Text style={[styles.subSection, font('semibold')]}>Search EDM demos</Text>
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={22} color={colors.muted} />
        <TextInput
          value={demoQuery}
          onChangeText={setDemoQuery}
          placeholder="Try calvin, skrillex, trance, festival…"
          placeholderTextColor={colors.muted}
          style={[styles.inputInline, font('regular')]}
        />
      </View>
      {demoQuery.trim().length >= 2 && demoHits.length === 0 ? (
        <Text style={[styles.muted, font('regular')]}>No demo matches — try another keyword or use a file below.</Text>
      ) : null}
      {demoHits.map((a) => (
        <Pressable
          key={a.id}
          style={({ pressed }) => [
            styles.row,
            picked?.id === a.id && styles.rowOn,
            pressed && { opacity: 0.88 },
          ]}
          onPress={() => pickAudio(a)}
        >
          <MaterialIcons name="library-music" size={22} color={colors.cyan} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, font('semibold')]}>{a.title}</Text>
            <Text style={[styles.rowSub, font('regular')]}>{a.artist}</Text>
          </View>
          {picked?.id === a.id ? (
            <MaterialIcons name="check-circle" size={22} color={colors.mint} />
          ) : (
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          )}
        </Pressable>
      ))}

      <Text style={[styles.subSection, font('semibold')]}>Your MP3 / audio file</Text>
      <LocalMp3Picker onPick={pickAudio} />

      {picked ? (
        <View style={styles.picked}>
          <MaterialIcons name="graphic-eq" size={20} color={colors.mint} />
          <Text style={[styles.pickedText, font('medium')]} numberOfLines={2}>
            Selected: {picked.title}
          </Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.primary, !canSubmit && styles.primaryDisabled]}
        disabled={!canSubmit}
        onPress={onSaveAndRelive}
      >
        <Text style={[styles.primaryText, font('bold')]}>Save &amp; relive set</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 26, marginBottom: 8 },
  sub: { color: colors.muted, fontSize: 14, marginBottom: 18, lineHeight: 20 },
  label: { color: colors.text, fontSize: 14, marginBottom: 8, marginTop: 12 },
  section: { color: colors.text, fontSize: 17, marginTop: 22, marginBottom: 8 },
  hint: { color: colors.muted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
  subSection: { color: colors.text, fontSize: 15, marginTop: 18, marginBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  inputInline: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowOn: { borderColor: colors.mint },
  rowTitle: { color: colors.text, fontSize: 15 },
  rowSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  muted: { color: colors.muted, fontSize: 13, marginBottom: 10 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  picked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    padding: 14,
    backgroundColor: 'rgba(124,255,178,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,255,178,0.35)',
  },
  pickedText: { color: colors.text, flex: 1, fontSize: 14 },
  primary: {
    marginTop: 24,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: colors.text, fontSize: 17 },
});
