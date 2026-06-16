import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Button, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSessionStore } from '../store/sessionStore';
import { computeSessionXp } from '@voice/reward-engine';
import { mapSustainedNoteScoreToCoaching } from '@voice/coaching-rules';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Reflection'>;

const PROMPT_1 = 'How did it feel?';
const OPTIONS_1 = ['Easy', 'Challenging', 'Felt Tension'];

const PROMPT_2 = 'What will you focus on next time?';
const OPTIONS_2 = ['Breathing', 'Steady Pitch', 'Relaxation'];

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function ReflectionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { dispatch, setReflectionAnswer, lastScore, bestScore, setXpEarned } = useSessionStore();

  const [ans1, setAns1] = useState<string | null>(null);
  const [ans2, setAns2] = useState<string | null>(null);

  const handleComplete = () => {
    if (ans1) setReflectionAnswer(PROMPT_1, ans1);
    if (ans2) setReflectionAnswer(PROMPT_2, ans2);

    const band = mapSustainedNoteScoreToCoaching(lastScore).successBand;
    const isPersonalBest = lastScore >= bestScore && lastScore > 0;

    const xpResult = computeSessionXp(band, isPersonalBest, true, true);
    setXpEarned(xpResult.total);

    dispatch({ type: 'REFLECTION_DONE' });
    navigation.replace('RewardSummary');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Quick Reflection</Text>

      <View style={styles.section}>
        <Text style={styles.prompt}>{PROMPT_1}</Text>
        {OPTIONS_1.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.optionBtn,
              ans1 === opt && {
                borderColor: colors.accent,
                backgroundColor: hexToRgba(colors.accent, 0.1),
              },
            ]}
            onPress={() => setAns1(opt)}
          >
            <Text style={[styles.optionText, ans1 === opt && styles.optionTextSelected]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.prompt}>{PROMPT_2}</Text>
        {OPTIONS_2.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.optionBtn,
              ans2 === opt && {
                borderColor: colors.accent,
                backgroundColor: hexToRgba(colors.accent, 0.1),
              },
            ]}
            onPress={() => setAns2(opt)}
          >
            <Text style={[styles.optionText, ans2 === opt && styles.optionTextSelected]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.btnContainer}>
        <Button
          color={colors.accent}
          title="Complete Session"
          onPress={handleComplete}
          disabled={!ans1 || !ans2}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  prompt: {
    color: colors.text,
    fontSize: 18,
    marginBottom: 16,
    fontWeight: '600',
  },
  optionBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  btnContainer: {
    marginTop: 16,
  },
});
