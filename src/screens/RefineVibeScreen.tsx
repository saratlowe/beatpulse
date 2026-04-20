import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePulse } from '../context/PulseContext';
import {
  EMPTY_REFINE_SECTION_COMMENTS,
  REFINE_CHIP_CATEGORIES,
  type RefineChipCategory,
} from '../lib/refineChips';
import type { LogStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<LogStackParamList, 'RefineVibe'>;

type TabId = 'sound' | 'energy' | 'experience';

const TAB_ORDER: { id: TabId; label: string; categoryId: string }[] = [
  { id: 'sound', label: 'Sound', categoryId: 'sound' },
  { id: 'energy', label: 'Energy', categoryId: 'energy' },
  { id: 'experience', label: 'Vibe', categoryId: 'experience' },
];

function TagChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipOn,
        pressed && { opacity: 0.88 },
      ]}
    >
      <Text style={[styles.chipText, font('medium')]}>{label}</Text>
    </Pressable>
  );
}

export function RefineVibeScreen({ navigation }: Props) {
  const { refineAnswers, setRefineAnswers, commitPulseSignature, tapTimestampsMs } = usePulse();

  const [tab, setTab] = useState<TabId>('sound');

  const toggleTag = useCallback(
    (label: string) => {
      const set = new Set(refineAnswers.selectedTags);
      if (set.has(label)) set.delete(label);
      else set.add(label);
      setRefineAnswers({ ...refineAnswers, selectedTags: [...set] });
    },
    [refineAnswers, setRefineAnswers]
  );

  const activeCategory: RefineChipCategory | undefined = REFINE_CHIP_CATEGORIES.find(
    (c) => c.id === TAB_ORDER.find((t) => t.id === tab)?.categoryId
  );

  const submit = () => {
    commitPulseSignature(refineAnswers);
    navigation.navigate('PulseSignature');
  };

  const skipFlow = () => {
    commitPulseSignature({
      selectedTags: [],
      sectionComments: { ...EMPTY_REFINE_SECTION_COMMENTS },
    });
    navigation.navigate('PulseSignature');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>What was this set like?</Text>
      <Text style={[styles.sub, font('regular')]}>
        {tapTimestampsMs.length === 0
          ? 'You skipped tapping — your pulse curve stays empty. Tags still help tune taste for events.'
          : 'Tap chips that fit — no wrong answers. Switch tabs to see more options.'}
      </Text>

      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, font('medium')]}>← Back to tapping</Text>
      </Pressable>

      <View style={styles.tabRow}>
        {TAB_ORDER.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabOn]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, font('semibold'), tab === t.id && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {activeCategory ? (
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, font('semibold')]}>{activeCategory.title}</Text>
          <Text style={[styles.sectionHint, font('regular')]}>Multi-select · {activeCategory.tags.length} options</Text>
          <View style={styles.chipWrap}>
            {activeCategory.tags.map((tag) => (
              <TagChip
                key={tag}
                label={tag}
                selected={refineAnswers.selectedTags.includes(tag)}
                onPress={() => toggleTag(tag)}
              />
            ))}
          </View>
          <Text style={[styles.noteLabel, font('medium')]}>Notes for this section (optional)</Text>
          <Text style={[styles.noteHint, font('regular')]}>
            Saved per tab — all sections you write in show on your pulse summary after refine.
          </Text>
          <TextInput
            value={refineAnswers.sectionComments[tab]}
            onChangeText={(t) =>
              setRefineAnswers({
                ...refineAnswers,
                sectionComments: { ...refineAnswers.sectionComments, [tab]: t },
              })
            }
            placeholder={`Anything about ${activeCategory.title.toLowerCase()}…`}
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, font('regular')]}
          />
        </View>
      ) : null}

      <View style={styles.summaryCard}>
        <Text style={[styles.summaryLabel, font('medium')]}>Selected ({refineAnswers.selectedTags.length})</Text>
        <Text style={[styles.summaryText, font('regular')]} numberOfLines={3}>
          {refineAnswers.selectedTags.length
            ? refineAnswers.selectedTags.join(' · ')
            : 'None yet — pick a few chips above.'}
        </Text>
      </View>

      <Pressable style={styles.primary} onPress={submit}>
        <Text style={[styles.primaryText, font('bold')]}>Generate pulse signature</Text>
      </Pressable>

      <Pressable onPress={skipFlow}>
        <Text style={[styles.opt, font('medium')]}>Skip tags &amp; notes</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 24, marginBottom: 10, textAlign: 'center', lineHeight: 30 },
  sub: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  backRow: { alignSelf: 'center', marginBottom: 20 },
  backText: { color: colors.cyan, fontSize: 15 },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 18,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#2a3148',
  },
  tabOn: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255,46,99,0.12)',
  },
  tabText: { color: colors.muted, fontSize: 14 },
  tabTextOn: { color: colors.text },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#232a3d',
  },
  sectionTitle: { color: colors.text, fontSize: 17, marginBottom: 6 },
  sectionHint: { color: colors.muted, fontSize: 12, marginBottom: 14 },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: '#2a3148',
  },
  chipOn: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(0,245,255,0.1)',
  },
  chipText: { color: colors.text, fontSize: 14 },
  summaryCard: {
    backgroundColor: 'rgba(0,245,255,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.2)',
  },
  summaryLabel: { color: colors.muted, fontSize: 12, marginBottom: 6, textTransform: 'uppercase' },
  summaryText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  noteLabel: { color: colors.text, marginTop: 18, marginBottom: 6, fontSize: 14 },
  noteHint: { color: colors.muted, fontSize: 12, marginBottom: 10, lineHeight: 17 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 16,
    minHeight: 96,
    color: colors.text,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#2a3148',
  },
  primary: {
    marginTop: 24,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: { color: colors.text, fontSize: 17 },
  opt: { marginTop: 18, textAlign: 'center', color: colors.muted, fontSize: 14 },
});
