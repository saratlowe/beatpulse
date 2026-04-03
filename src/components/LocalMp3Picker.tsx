import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { audioFromLocalFile, type AudioSet } from '../lib/data';
import { colors, font } from '../theme';

type Props = {
  onPick: (audio: AudioSet) => void;
};

export function LocalMp3Picker({ onPick }: Props) {
  const browse = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['audio/*', 'audio/mpeg', 'audio/mp3', 'public.audio', 'public.mp3'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.length) return;
    const file = res.assets[0];
    if (!file?.uri) return;
    const title = file.name?.replace(/\.[^.]+$/, '') || 'Imported set';
    onPick(audioFromLocalFile(file.uri, title));
  };

  return (
    <Pressable style={({ pressed }) => [styles.browse, pressed && { opacity: 0.92 }]} onPress={browse}>
      <MaterialIcons name="folder-open" size={22} color={colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.browseTitle, font('semibold')]}>Choose audio file</Text>
        <Text style={[styles.browseSub, font('regular')]}>MP3, M4A, WAV, and other audio from your device</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  browse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a3148',
  },
  browseTitle: { color: colors.text, fontSize: 16 },
  browseSub: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 16 },
});
