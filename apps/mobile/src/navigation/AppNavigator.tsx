import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MicPermissionScreen } from '../screens/MicPermissionScreen';
import { MicCheckScreen } from '../screens/MicCheckScreen';
import { ExerciseIntroScreen } from '../screens/ExerciseIntroScreen';
import { SustainedNoteScreen } from '../screens/SustainedNoteScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { ReflectionScreen } from '../screens/ReflectionScreen';
import { RewardSummaryScreen } from '../screens/RewardSummaryScreen';

export type RootStackParamList = {
  MicPermission: undefined;
  MicCheck: undefined;
  ExerciseIntro: undefined;
  SustainedNote: undefined;
  Result: { score: number };
  Reflection: undefined;
  RewardSummary: { successBand: string; isPersonalBest: boolean };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MicPermission"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="MicPermission" component={MicPermissionScreen} />
      <Stack.Screen name="MicCheck" component={MicCheckScreen} />
      <Stack.Screen name="ExerciseIntro" component={ExerciseIntroScreen} />
      <Stack.Screen name="SustainedNote" component={SustainedNoteScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="Reflection" component={ReflectionScreen} />
      <Stack.Screen name="RewardSummary" component={RewardSummaryScreen} />
    </Stack.Navigator>
  );
}
