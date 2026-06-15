import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { colors } from '@voice/ui-tokens';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BUILD_01_EXERCISE } from '../constants/exercise';
import { useSessionStore } from '../store/sessionStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExerciseIntro'>;

export default function ExerciseIntroScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { initSessionPlan, dispatch, sessionState } = useSessionStore();

  useEffect(() => {
    if (sessionState === 'IDLE') {
      dispatch({ type: 'LOAD' });
      dispatch({ type: 'LOADED' });
      dispatch({ type: 'START_ATTEMPT' });
      initSessionPlan();
    }
  }, [dispatch, initSessionPlan, sessionState]);

  const onReady = () => {
    dispatch({ type: 'START_ATTEMPT' });
    navigation.navigate('SustainedNote');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{BUILD_01_EXERCISE.title}</Text>
      <Text style={styles.target}>Target: A4 (440 Hz)</Text>
      <Text style={styles.body}>{BUILD_01_EXERCISE.userInstructionText}</Text>

      <View style={styles.buttonContainer}>
        <Button color={colors.accent} title="Ready" onPress={onReady} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  target: {
    color: colors.success,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  body: {
    color: colors.text,
    fontSize: 18,
    marginBottom: 48,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 24,
  },
});
