import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { supabase, supabaseConfigError } from './utils/supabase';

type Todo = {
  id: number | string;
  name: string;
};

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: false,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(!supabaseConfigError);
  const [errorMessage, setErrorMessage] = useState<string | null>(supabaseConfigError);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let isMounted = true;

    const getTodos = async () => {
      try {
        const { data, error } = await client.from('todos').select('id, name').order('id');

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(`Error fetching todos: ${error.message}`);
          Sentry.captureException(error);
          return;
        }

        setTodos(data ?? []);
        setErrorMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unknown error fetching todos.';
        setErrorMessage(`Error fetching todos: ${message}`);
        Sentry.captureException(error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void getTodos();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Todo List</Text>
      {isLoading ? <ActivityIndicator size="large" /> : null}
      {!isLoading && errorMessage ? <Text style={styles.message}>{errorMessage}</Text> : null}
      {!isLoading && !errorMessage && todos.length === 0 ? (
        <Text style={styles.message}>No todos found.</Text>
      ) : null}
      {!isLoading && !errorMessage && todos.length > 0 ? (
        <FlatList
          data={todos}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <Text style={styles.todoItem}>{item.name}</Text>}
          contentContainerStyle={styles.todoList}
        />
      ) : null}
      <Button title="Try!" onPress={() => { Sentry.captureException(new Error('First error')); }} />
      <StatusBar style="auto" />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  todoList: {
    gap: 12,
    paddingVertical: 16,
  },
  todoItem: {
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
});
