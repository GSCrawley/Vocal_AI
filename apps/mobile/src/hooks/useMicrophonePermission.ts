import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';

export function useMicrophonePermission() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { status } = await Audio.getPermissionsAsync();
        if (isMounted) setHasPermission(status === 'granted');
      } catch {
        if (isMounted) setHasPermission(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const requestPermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      return status === 'granted';
    } catch {
      setHasPermission(false);
      return false;
    }
  };

  return { hasPermission, requestPermission };
}
