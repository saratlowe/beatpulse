import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { audioFromLocalFile, type AudioSet } from '../lib/data';
import { colors, font } from '../theme';

type Props = {
  onPick: (audio: AudioSet) => void;
};

function isAudioFile(file: File) {
  if (file.type.startsWith('audio/')) return true;
  return /\.(mp3|m4a|wav|aac|flac|ogg|opus|webm)$/i.test(file.name);
}

/** RN Web forwards these DOM handlers on View; types omit them */
const DropView = View as React.ComponentType<
  React.ComponentProps<typeof View> & {
    onDragOver?: (e: DragEvent) => void;
    onDrop?: (e: DragEvent) => void;
  }
>;

/**
 * Web: drag-and-drop + hidden file input. Uses blob: URLs (valid until tab close or revoke).
 */
export function LocalMp3Picker({ onPick }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file || !isAudioFile(file)) return;
      const uri = URL.createObjectURL(file);
      const title = file.name.replace(/\.[^.]+$/, '') || 'Imported set';
      onPick(audioFromLocalFile(uri, title));
    },
    [onPick]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    handleFile(f ?? null);
    e.target.value = '';
  };

  return (
    <View style={styles.wrap}>
      <DropView
        style={styles.drop}
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
        }}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          const f = e.dataTransfer?.files?.[0];
          handleFile(f ?? undefined);
        }}
      >
        <MaterialIcons name="cloud-upload" size={32} color={colors.cyan} />
        <Text style={[styles.dropTitle, font('semibold')]}>Drop an MP3 or audio file</Text>
        <Text style={[styles.dropSub, font('regular')]}>Or tap below to browse</Text>
        <Pressable style={styles.browseBtn} onPress={() => inputRef.current?.click()}>
          <Text style={[styles.browseBtnText, font('semibold')]}>Choose file</Text>
        </Pressable>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.aac,.flac,.ogg,.opus,.webm"
          style={{ display: 'none' }}
          onChange={onInputChange}
        />
      </DropView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  drop: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#2a3148',
  },
  dropTitle: { color: colors.text, fontSize: 16, marginTop: 12, textAlign: 'center' },
  dropSub: { color: colors.muted, fontSize: 13, marginTop: 6, textAlign: 'center' },
  browseBtn: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  browseBtnText: { color: colors.text, fontSize: 15 },
});
