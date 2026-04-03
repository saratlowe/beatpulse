import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePulse } from '../context/PulseContext';
import type { LogStackParamList } from '../navigation/types';
import { colors, font } from '../theme';

type Props = NativeStackScreenProps<LogStackParamList, 'RefineVibe'>;

function TriState({
  label,
  value,
  onChange,
  left,
  right,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  left: string;
  right: string;
}) {
  return (
    <View style={styles.qBlock}>
      <Text style={[styles.qTitle, font('semibold')]}>{label}</Text>
      <View style={styles.triRow}>
        <Text style={[styles.end, font('regular')]}>{left}</Text>
        <View style={styles.btns}>
          <Pressable
            style={[styles.chip, value === true && styles.chipOn]}
            onPress={() => onChange(true)}
          >
            <Text style={[styles.chipText, font('medium')]}>Yes</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, value === false && styles.chipOn]}
            onPress={() => onChange(false)}
          >
            <Text style={[styles.chipText, font('medium')]}>No</Text>
          </Pressable>
          <Pressable style={styles.chip} onPress={() => onChange(null)}>
            <Text style={[styles.chipText, font('medium')]}>Skip</Text>
          </Pressable>
        </View>
        <Text style={[styles.end, font('regular')]}>{right}</Text>
      </View>
    </View>
  );
}

export function RefineVibeScreen({ navigation }: Props) {
  const { refineAnswers, setRefineAnswers, refineComment, setRefineComment, commitPulseSignature, tapTimestampsMs } =
    usePulse();

  const submit = () => {
    commitPulseSignature(refineAnswers, refineComment);
    navigation.navigate('PulseSignature');
  };

  const skipFlow = () => {
    commitPulseSignature(
      {
        chaosLeansChaos: null,
        darkLeansDark: null,
        predictableLeansPredictable: null,
      },
      ''
    );
    navigation.navigate('PulseSignature');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <Text style={[styles.title, font('bold')]}>Refine the vibe</Text>
      <Text style={[styles.sub, font('regular')]}>
        {tapTimestampsMs.length === 0
          ? 'You skipped tapping — your pulse signature will stay empty until you engage with the set.'
          : 'These answers layer on top of your taps. Skip anything you are unsure about.'}
      </Text>

      <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, font('medium')]}>← Back to tapping</Text>
      </Pressable>

      <TriState
        label="Does this set feel chaotic?"
        left="Chaos"
        right="Structure"
        value={refineAnswers.chaosLeansChaos}
        onChange={(chaosLeansChaos) => setRefineAnswers({ ...refineAnswers, chaosLeansChaos })}
      />
      <TriState
        label="Does it feel dark?"
        left="Dark"
        right="Uplifting"
        value={refineAnswers.darkLeansDark}
        onChange={(darkLeansDark) => setRefineAnswers({ ...refineAnswers, darkLeansDark })}
      />
      <TriState
        label="Does it feel predictable?"
        left="Predictable"
        right="Surprising"
        value={refineAnswers.predictableLeansPredictable}
        onChange={(predictableLeansPredictable) =>
          setRefineAnswers({ ...refineAnswers, predictableLeansPredictable })
        }
      />

      <Text style={[styles.cmtLabel, font('medium')]}>Comment (optional)</Text>
      <TextInput
        value={refineComment}
        onChangeText={setRefineComment}
        placeholder="What stood out?"
        placeholderTextColor={colors.muted}
        multiline
        style={[styles.input, font('regular')]}
      />

      <Pressable style={styles.primary} onPress={submit}>
        <Text style={[styles.primaryText, font('bold')]}>Generate pulse signature</Text>
      </Pressable>

      <Pressable onPress={skipFlow}>
        <Text style={[styles.opt, font('medium')]}>Use defaults &amp; skip comment</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, marginBottom: 8, textAlign: 'center' },
  sub: { color: colors.muted, fontSize: 13, marginBottom: 14, textAlign: 'center', lineHeight: 18 },
  backRow: { alignSelf: 'center', marginBottom: 16 },
  backText: { color: colors.cyan, fontSize: 14 },
  qBlock: { marginBottom: 20 },
  qTitle: { color: colors.text, fontSize: 15, marginBottom: 10, textAlign: 'center' },
  triRow: { alignItems: 'center' },
  end: { color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: 8 },
  btns: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  chipOn: { borderWidth: 1, borderColor: colors.cyan },
  chipText: { color: colors.text, fontSize: 14 },
  cmtLabel: { color: colors.text, marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    minHeight: 88,
    color: colors.text,
    textAlignVertical: 'top',
  },
  primary: {
    marginTop: 22,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  primaryText: { color: colors.text, fontSize: 17 },
  opt: { marginTop: 16, textAlign: 'center', color: colors.muted, fontSize: 13 },
});
