import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';

export function useMicrophonePermission() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Audio.getPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const requestPermission = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  };

  return { hasPermission, requestPermission };
}
